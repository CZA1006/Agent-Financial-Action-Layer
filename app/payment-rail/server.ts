import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import type { AuthorizationDecision, PaymentIntent, SettlementRecord } from "../../sdk/types";
import { createSeededPaymentRailAdapter } from "../../backend/afal/settlement";
import {
  JsonRpcWalletPaymentVerifier,
  decimalToUnits,
  type WalletPaymentVerification,
  type WalletPaymentVerifier,
} from "./onchain-verifier";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3412;

export const PAYMENT_RAIL_SERVICE_ROUTES = {
  health: "/health",
  executePayment: "/payments/execute",
  confirmWalletPayment: "/wallet-payments/confirm",
  getWalletPaymentConfirmation: "/wallet-payments/confirmations",
  walletDemo: "/wallet-demo",
  walletDemoScript: "/wallet-demo.js",
} as const;

interface PaymentRailRequestBody {
  requestRef: string;
  input: {
    intent: PaymentIntent;
    decision: AuthorizationDecision;
  };
}

type PaymentRailResponseBody =
  | {
      ok: true;
      requestRef: string;
      data:
        | SettlementRecord
        | { status: "ok"; service: "payment-rail-stub" }
        | (WalletPaymentConfirmation & { status: "ok" });
    }
  | {
      ok: false;
      requestRef: string;
      statusCode: number;
      error: {
        code: string;
        message: string;
      };
    };

export interface PaymentRailServiceState {
  executePaymentAttempts: number;
  executePaymentFailuresRemaining: number;
  requireWalletConfirmation: boolean;
  walletConfirmations: Map<string, WalletPaymentConfirmation>;
  walletTxHashes: Map<string, string>;
  walletConfirmationsPath?: string;
  walletVerifier?: WalletPaymentVerifier;
  agentWalletExecutor?: AgentWalletPaymentExecutor;
}

export interface PaymentRailFailurePlan {
  executePaymentFailuresBeforeSuccess?: number;
  requireWalletConfirmation?: boolean;
  walletConfirmationsPath?: string;
  walletVerifier?: WalletPaymentVerifier;
  agentWalletExecutor?: AgentWalletPaymentExecutor;
}

export interface PaymentRailServiceAuth {
  token: string;
  headerName?: string;
  serviceIdHeaderName?: string;
  requestTimestampHeaderName?: string;
  signatureHeaderName?: string;
  signingKey: string;
}

export interface WalletPaymentConfirmation {
  actionRef: string;
  txHash: string;
  from: string;
  to: string;
  tokenAddress: string;
  amount: string;
  asset: string;
  chain: string;
  chainId: number;
  confirmedAt: string;
  verification?: WalletPaymentVerification;
}

export interface AgentWalletPaymentExecutionInput {
  intent: PaymentIntent;
  decision: AuthorizationDecision;
}

export interface AgentWalletPaymentExecutor {
  execute(input: AgentWalletPaymentExecutionInput): Promise<
    Omit<WalletPaymentConfirmation, "confirmedAt"> & { confirmedAt?: string }
  >;
}

export class CommandAgentWalletPaymentExecutor implements AgentWalletPaymentExecutor {
  constructor(
    private readonly args: {
      command: string;
      timeoutMs?: number;
    }
  ) {}

  async execute(input: AgentWalletPaymentExecutionInput): Promise<
    Omit<WalletPaymentConfirmation, "confirmedAt"> & { confirmedAt?: string }
  > {
    const [executable, ...args] = this.args.command.split(" ").filter(Boolean);
    if (!executable) {
      throw new Error("agent wallet command must not be empty");
    }

    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error("agent wallet command timed out"));
      }, this.args.timeoutMs ?? 120_000);
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk) => {
        stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      child.stderr.on("data", (chunk) => {
        stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(
            new Error(
              `agent wallet command failed with exit code ${code}: ${Buffer.concat(stderr).toString("utf8")}`
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")) as Omit<
            WalletPaymentConfirmation,
            "confirmedAt"
          > & { confirmedAt?: string });
        } catch (error) {
          reject(
            new Error(
              `agent wallet command returned invalid JSON: ${
                error instanceof Error ? error.message : "unknown parse error"
              }`
            )
          );
        }
      });
      child.stdin.end(`${JSON.stringify(input)}\n`);
    });
  }
}

export interface RunningPaymentRailStubServer {
  server: Server;
  host: string;
  port: number;
  url: string;
  state: PaymentRailServiceState;
  close(): Promise<void>;
}

function stringifyResponse(statusCode: number, body: PaymentRailResponseBody) {
  const bodyText = JSON.stringify(body);
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(bodyText, "utf8").toString(),
    },
    bodyText,
  };
}

function stringifyHtmlResponse(statusCode: number, bodyText: string) {
  return {
    statusCode,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-length": Buffer.byteLength(bodyText, "utf8").toString(),
      "cache-control": "no-store",
    },
    bodyText,
  };
}

function stringifyJavaScriptResponse(statusCode: number, bodyText: string) {
  return {
    statusCode,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "content-length": Buffer.byteLength(bodyText, "utf8").toString(),
      "cache-control": "no-store",
    },
    bodyText,
  };
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function buildFailure(
  requestRef: string,
  statusCode: number,
  code: string,
  message: string
) {
  return stringifyResponse(statusCode, {
    ok: false,
    requestRef,
    statusCode,
    error: { code, message },
  });
}

export function createPaymentRailServiceState(
  plan?: PaymentRailFailurePlan
): PaymentRailServiceState {
  const walletConfirmations = loadWalletConfirmations(plan?.walletConfirmationsPath);
  const walletTxHashes = new Map<string, string>();
  for (const confirmation of walletConfirmations.values()) {
    walletTxHashes.set(confirmation.txHash.toLowerCase(), confirmation.actionRef);
  }

  return {
    executePaymentAttempts: 0,
    executePaymentFailuresRemaining: Math.max(0, plan?.executePaymentFailuresBeforeSuccess ?? 0),
    requireWalletConfirmation: plan?.requireWalletConfirmation ?? false,
    walletConfirmations,
    walletTxHashes,
    walletConfirmationsPath: plan?.walletConfirmationsPath,
    walletVerifier: plan?.walletVerifier,
    agentWalletExecutor: plan?.agentWalletExecutor,
  };
}

function loadWalletConfirmations(path: string | undefined): Map<string, WalletPaymentConfirmation> {
  if (!path || !existsSync(path)) {
    return new Map();
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    confirmations?: WalletPaymentConfirmation[];
  };
  return new Map(
    (parsed.confirmations ?? []).map((confirmation) => [
      confirmation.actionRef,
      confirmation,
    ])
  );
}

function persistWalletConfirmations(state: PaymentRailServiceState): void {
  if (!state.walletConfirmationsPath) {
    return;
  }

  const payload = JSON.stringify(
    {
      schemaVersion: 1,
      confirmations: [...state.walletConfirmations.values()],
    },
    null,
    2
  );
  mkdirSync(dirname(state.walletConfirmationsPath), { recursive: true });
  const tmpPath = `${state.walletConfirmationsPath}.tmp`;
  writeFileSync(tmpPath, `${payload}\n`);
  renameSync(tmpPath, state.walletConfirmationsPath);
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function getIntentSettlementAddress(intent: PaymentIntent): string | undefined {
  return "settlementAddress" in intent.payee &&
    typeof intent.payee.settlementAddress === "string"
    ? intent.payee.settlementAddress
    : undefined;
}

function assertWalletConfirmationMatchesIntent(
  confirmation: WalletPaymentConfirmation,
  intent: PaymentIntent
): void {
  if (confirmation.actionRef !== intent.intentId) {
    throw new Error(
      `wallet confirmation actionRef "${confirmation.actionRef}" does not match intent "${intent.intentId}"`
    );
  }
  if (confirmation.asset !== intent.asset) {
    throw new Error(
      `wallet confirmation asset "${confirmation.asset}" does not match intent asset "${intent.asset}"`
    );
  }
  if (confirmation.chain !== intent.chain) {
    throw new Error(
      `wallet confirmation chain "${confirmation.chain}" does not match intent chain "${intent.chain}"`
    );
  }
  if (decimalToUnits(confirmation.amount) !== decimalToUnits(intent.amount)) {
    throw new Error(
      `wallet confirmation amount "${confirmation.amount}" does not match intent amount "${intent.amount}"`
    );
  }

  const settlementAddress = getIntentSettlementAddress(intent);
  if (
    settlementAddress &&
    normalizeAddress(confirmation.to) !== normalizeAddress(settlementAddress)
  ) {
    throw new Error(
      `wallet confirmation recipient "${confirmation.to}" does not match intent settlement address "${settlementAddress}"`
    );
  }
}

function isWalletPaymentConfirmationBody(body: unknown): body is {
  requestRef: string;
  input: Omit<WalletPaymentConfirmation, "confirmedAt"> & { confirmedAt?: string };
} {
  return Boolean(
    body &&
      typeof body === "object" &&
      "requestRef" in body &&
      typeof body.requestRef === "string" &&
      "input" in body &&
      body.input &&
      typeof body.input === "object" &&
      "actionRef" in body.input &&
      typeof body.input.actionRef === "string" &&
      "txHash" in body.input &&
      typeof body.input.txHash === "string" &&
      "from" in body.input &&
      typeof body.input.from === "string" &&
      "to" in body.input &&
      typeof body.input.to === "string" &&
      "tokenAddress" in body.input &&
      typeof body.input.tokenAddress === "string" &&
      "amount" in body.input &&
      typeof body.input.amount === "string" &&
      "asset" in body.input &&
      typeof body.input.asset === "string" &&
      "chain" in body.input &&
      typeof body.input.chain === "string" &&
      "chainId" in body.input &&
      typeof body.input.chainId === "number"
  );
}

function buildWalletSettlement(
  intent: PaymentIntent,
  decision: AuthorizationDecision,
  confirmation: WalletPaymentConfirmation
): SettlementRecord {
  return {
    settlementId: `stl-wallet-${intent.intentId}`,
    schemaVersion: "0.1",
    settlementType: "onchain-transfer",
    actionRef: intent.intentId,
    decisionRef: decision.decisionId,
    sourceAccountRef: intent.payer.accountId,
    destination: {
      ...intent.payee,
      settlementAddress: confirmation.to,
    },
    asset: confirmation.asset,
    amount: confirmation.amount,
    chain: confirmation.chain,
    txHash: confirmation.txHash,
    status: "settled",
    executedAt: confirmation.confirmedAt,
    settledAt: confirmation.confirmedAt,
  };
}

function isWalletPaymentExecution(value: unknown): value is
  Omit<WalletPaymentConfirmation, "confirmedAt"> & { confirmedAt?: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "actionRef" in value &&
      typeof value.actionRef === "string" &&
      "txHash" in value &&
      typeof value.txHash === "string" &&
      "from" in value &&
      typeof value.from === "string" &&
      "to" in value &&
      typeof value.to === "string" &&
      "tokenAddress" in value &&
      typeof value.tokenAddress === "string" &&
      "amount" in value &&
      typeof value.amount === "string" &&
      "asset" in value &&
      typeof value.asset === "string" &&
      "chain" in value &&
      typeof value.chain === "string" &&
      "chainId" in value &&
      typeof value.chainId === "number"
  );
}

async function executeAgentWalletPayment(
  state: PaymentRailServiceState,
  input: AgentWalletPaymentExecutionInput
): Promise<WalletPaymentConfirmation> {
  if (!state.agentWalletExecutor) {
    throw new Error("agent wallet executor is not configured");
  }
  const execution = await state.agentWalletExecutor.execute(input);
  if (!isWalletPaymentExecution(execution)) {
    throw new Error("agent wallet executor returned invalid wallet payment execution");
  }
  const existingActionForTx = state.walletTxHashes.get(execution.txHash.toLowerCase());
  if (existingActionForTx && existingActionForTx !== execution.actionRef) {
    throw new Error(
      `wallet txHash "${execution.txHash}" is already registered for action "${existingActionForTx}"`
    );
  }

  const confirmation: WalletPaymentConfirmation = {
    ...execution,
    confirmedAt: execution.confirmedAt ?? new Date().toISOString(),
  };
  assertWalletConfirmationMatchesIntent(confirmation, input.intent);
  if (state.walletVerifier) {
    confirmation.verification = await state.walletVerifier.verify(confirmation);
  }

  state.walletConfirmations.set(confirmation.actionRef, confirmation);
  state.walletTxHashes.set(confirmation.txHash.toLowerCase(), confirmation.actionRef);
  persistWalletConfirmations(state);
  return confirmation;
}

function buildWalletDemoHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AFAL MetaMask Payment Demo</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f7f3ea; color: #15201d; }
    main { max-width: 860px; margin: 48px auto; padding: 32px; background: #fffaf0; border: 1px solid #d7c8aa; border-radius: 18px; box-shadow: 0 18px 60px rgba(38, 29, 12, 0.14); }
    h1 { margin: 0 0 8px; font-size: 32px; }
    p { color: #4d5a55; line-height: 1.55; }
    label { display: grid; gap: 6px; margin-top: 16px; font-weight: 700; }
    input { padding: 12px 14px; border: 1px solid #b8aa8d; border-radius: 10px; font: inherit; background: #fff; }
    button { margin-top: 20px; padding: 12px 16px; border: 0; border-radius: 999px; background: #24483f; color: white; font-weight: 800; cursor: pointer; }
    button + button { margin-left: 10px; background: #c47a24; }
    pre { overflow: auto; padding: 16px; background: #15201d; color: #e5f4e8; border-radius: 12px; }
    .warning { padding: 12px 14px; background: #fff1c2; border: 1px solid #e0bd54; border-radius: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>AFAL MetaMask Payment Demo</h1>
    <p class="warning">Testnet-only default: Base Sepolia USDC. Do not use mainnet funds in this page.</p>
    <p>This page sends an ERC-20 transfer with MetaMask, then registers the resulting txHash with the AFAL payment rail demo.</p>
    <label>Action Ref <input id="actionRef" value="payint-0001" /></label>
    <label>Payee Address <input id="to" placeholder="0x..." /></label>
    <label>USDC Amount <input id="amount" value="0.01" /></label>
    <label>Token Address <input id="tokenAddress" value="0x036CbD53842c5426634e7929541eC2318f3dCF7e" /></label>
    <button id="connect">Connect Wallet</button>
    <button id="pay">Send Testnet USDC + Register txHash</button>
    <button id="resetToken" type="button">Reset Base Sepolia USDC</button>
    <pre id="log">{}</pre>
  </main>
  <script src="/wallet-demo.js"></script>
</body>
</html>`;
}

function buildWalletDemoScript(): string {
  return `
const BASE_SEPOLIA_CHAIN_ID = "0x14a34";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BASE_SEPOLIA_PARAMS = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia-explorer.base.org"]
};
const log = (payload) => {
  document.querySelector("#log").textContent = JSON.stringify(payload, null, 2);
};
const isEvmAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value);
const params = new URLSearchParams(window.location.search);
for (const [param, selector] of [
  ["actionRef", "#actionRef"],
  ["to", "#to"],
  ["amount", "#amount"],
  ["tokenAddress", "#tokenAddress"]
]) {
  const value = params.get(param);
  if (value) document.querySelector(selector).value = value;
}
document.querySelector("#resetToken").addEventListener("click", () => {
  document.querySelector("#tokenAddress").value = BASE_SEPOLIA_USDC;
  log({ tokenAddress: BASE_SEPOLIA_USDC, reset: true });
});
const parseUnits = (value, decimals) => {
  const [whole, fraction = ""] = value.trim().split(".");
  const normalizedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt(normalizedFraction || "0");
};
const encodeErc20Transfer = (to, amount) => {
  const selector = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  return "0x" + selector + address + value;
};
async function ensureBaseSepolia() {
  const currentChainId = await ethereum.request({ method: "eth_chainId" });
  if (currentChainId === BASE_SEPOLIA_CHAIN_ID) return;
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
  } catch (error) {
    if (error && error.code === 4902) {
      await ethereum.request({ method: "wallet_addEthereumChain", params: [BASE_SEPOLIA_PARAMS] });
      return;
    }
    throw error;
  }
}
document.querySelector("#connect").addEventListener("click", async () => {
  if (!window.ethereum) throw new Error("MetaMask-compatible wallet not found");
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  await ensureBaseSepolia();
  log({ connected: true, account: accounts[0], chainId: await ethereum.request({ method: "eth_chainId" }) });
});
document.querySelector("#pay").addEventListener("click", async () => {
  if (!window.ethereum) throw new Error("MetaMask-compatible wallet not found");
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  await ensureBaseSepolia();
  const from = accounts[0];
  const actionRef = document.querySelector("#actionRef").value.trim();
  const to = document.querySelector("#to").value.trim();
  const tokenAddress = document.querySelector("#tokenAddress").value.trim();
  const amount = document.querySelector("#amount").value.trim();
  if (!isEvmAddress(to)) {
    log({ ok: false, error: "Invalid payee address", to });
    return;
  }
  if (!isEvmAddress(tokenAddress)) {
    log({ ok: false, error: "Invalid token address", tokenAddress, expectedBaseSepoliaUsdc: BASE_SEPOLIA_USDC });
    return;
  }
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from,
      to: tokenAddress,
      value: "0x0",
      data: encodeErc20Transfer(to, parseUnits(amount, 6))
    }]
  });
  const response = await fetch("/wallet-payments/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestRef: "req-wallet-confirm-" + Date.now(),
      input: { actionRef, txHash, from, to, tokenAddress, amount, asset: "USDC", chain: "base-sepolia", chainId: 84532 }
    })
  });
  log({ txHash, confirmation: await response.json() });
});
`;
}

function isAuthorized(
  requestRef: string,
  headers: Record<string, string | undefined> | undefined,
  auth: PaymentRailServiceAuth | undefined
): { ok: true } | { ok: false; code: string; message: string } {
  if (!auth) {
    return { ok: true };
  }

  const tokenHeaderName = (auth.headerName ?? "x-afal-service-token").toLowerCase();
  const serviceIdHeaderName = (
    auth.serviceIdHeaderName ?? "x-afal-service-id"
  ).toLowerCase();
  const timestampHeaderName = (
    auth.requestTimestampHeaderName ?? "x-afal-request-timestamp"
  ).toLowerCase();
  const signatureHeaderName = (
    auth.signatureHeaderName ?? "x-afal-request-signature"
  ).toLowerCase();

  const token = headers?.[tokenHeaderName];
  const serviceId = headers?.[serviceIdHeaderName];
  const timestamp = headers?.[timestampHeaderName];
  const signature = headers?.[signatureHeaderName];

  if (!token || !serviceId || !timestamp || !signature) {
    return {
      ok: false,
      code: "service-auth-required",
      message:
        `Missing service auth metadata in headers "${auth.headerName ?? "x-afal-service-token"}", ` +
        `"${auth.serviceIdHeaderName ?? "x-afal-service-id"}", ` +
        `"${auth.requestTimestampHeaderName ?? "x-afal-request-timestamp"}", ` +
        `or "${auth.signatureHeaderName ?? "x-afal-request-signature"}"`,
    };
  }

  if (token !== auth.token) {
    return {
      ok: false,
      code: "service-auth-required",
      message: `Missing or invalid payment rail service token in header "${auth.headerName ?? "x-afal-service-token"}"`,
    };
  }

  const expected = createHash("sha256")
    .update(`${serviceId}:${requestRef}:${timestamp}:${auth.signingKey}`)
    .digest("hex");

  if (signature !== expected) {
    return {
      ok: false,
      code: "service-signature-invalid",
      message: "Invalid payment rail request signature",
    };
  }

  return { ok: true };
}

function isExecuteRequest(body: unknown): body is PaymentRailRequestBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "requestRef" in body &&
      typeof body.requestRef === "string" &&
      "input" in body &&
      body.input &&
      typeof body.input === "object" &&
      "intent" in body.input &&
      "decision" in body.input
  );
}

export async function handlePaymentRailNodeHttpRequest(request: {
  method?: string;
  url?: string;
  bodyText?: string;
  headers?: Record<string, string | undefined>;
}, state: PaymentRailServiceState = createPaymentRailServiceState(), auth?: PaymentRailServiceAuth) {
  const method = request.method ?? "GET";
  const pathname = new URL(request.url ?? "/", `http://${DEFAULT_HOST}`).pathname;

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.health) {
    if (method !== "GET") {
      return buildFailure("health", 405, "method-not-allowed", "health only supports GET");
    }
    return stringifyResponse(200, {
      ok: true,
      requestRef: "health",
      data: {
        status: "ok",
        service: "payment-rail-stub",
      },
    });
  }

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.walletDemo) {
    if (method !== "GET") {
      return buildFailure("wallet-demo", 405, "method-not-allowed", "wallet demo only supports GET");
    }
    return stringifyHtmlResponse(200, buildWalletDemoHtml());
  }

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.walletDemoScript) {
    if (method !== "GET") {
      return buildFailure("wallet-demo", 405, "method-not-allowed", "wallet demo script only supports GET");
    }
    return stringifyJavaScriptResponse(200, buildWalletDemoScript());
  }

  if (pathname.startsWith(`${PAYMENT_RAIL_SERVICE_ROUTES.getWalletPaymentConfirmation}/`)) {
    if (method !== "GET") {
      return buildFailure(
        "wallet-confirmation",
        405,
        "method-not-allowed",
        "wallet payment confirmation readback only supports GET"
      );
    }
    const actionRef = decodeURIComponent(
      pathname.slice(PAYMENT_RAIL_SERVICE_ROUTES.getWalletPaymentConfirmation.length + 1)
    );
    const confirmation = state.walletConfirmations.get(actionRef);
    if (!confirmation) {
      return buildFailure(
        "wallet-confirmation",
        404,
        "wallet-confirmation-not-found",
        `No wallet payment confirmation found for action "${actionRef}"`
      );
    }
    return stringifyResponse(200, {
      ok: true,
      requestRef: `wallet-confirmation-${actionRef}`,
      data: {
        ...confirmation,
        status: "ok",
      },
    });
  }

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment) {
    if (method !== "POST") {
      return buildFailure(
        "unknown",
        405,
        "method-not-allowed",
        "wallet payment confirmation only supports POST"
      );
    }

    let body: unknown;
    try {
      body = request.bodyText ? JSON.parse(request.bodyText) : undefined;
    } catch {
      return buildFailure("unknown", 400, "bad-request", "request body must be valid JSON");
    }

    if (!isWalletPaymentConfirmationBody(body)) {
      return buildFailure(
        "unknown",
        400,
        "bad-request",
        "request body must include requestRef and wallet payment confirmation input"
      );
    }

    const existingActionForTx = state.walletTxHashes.get(body.input.txHash.toLowerCase());
    if (existingActionForTx && existingActionForTx !== body.input.actionRef) {
      return buildFailure(
        body.requestRef,
        409,
        "wallet-transfer-replay",
        `wallet txHash "${body.input.txHash}" is already registered for action "${existingActionForTx}"`
      );
    }

    const confirmation: WalletPaymentConfirmation = {
      ...body.input,
      confirmedAt: body.input.confirmedAt ?? new Date().toISOString(),
    };

    if (state.walletVerifier) {
      try {
        confirmation.verification = await state.walletVerifier.verify(confirmation);
      } catch (error) {
        return buildFailure(
          body.requestRef,
          422,
          "wallet-transfer-verification-failed",
          error instanceof Error ? error.message : "wallet transfer verification failed"
        );
      }
    }

    state.walletConfirmations.set(confirmation.actionRef, confirmation);
    state.walletTxHashes.set(confirmation.txHash.toLowerCase(), confirmation.actionRef);
    persistWalletConfirmations(state);

    return stringifyResponse(200, {
      ok: true,
      requestRef: body.requestRef,
      data: {
        ...confirmation,
        status: "ok",
      },
    });
  }

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.executePayment) {
    if (method !== "POST") {
      return buildFailure(
        "unknown",
        405,
        "method-not-allowed",
        "payments/execute only supports POST"
      );
    }

    let body: unknown;
    try {
      body = request.bodyText ? JSON.parse(request.bodyText) : undefined;
    } catch {
      return buildFailure("unknown", 400, "bad-request", "request body must be valid JSON");
    }

    if (!isExecuteRequest(body)) {
      return buildFailure(
        "unknown",
        400,
        "bad-request",
        "request body must include requestRef and input.intent/input.decision"
      );
    }

    const authResult = isAuthorized(body.requestRef, request.headers, auth);
    if (!authResult.ok) {
      return buildFailure(
        body.requestRef,
        403,
        authResult.code,
        authResult.message
      );
    }

    try {
      state.executePaymentAttempts += 1;
      if (state.executePaymentFailuresRemaining > 0) {
        state.executePaymentFailuresRemaining -= 1;
        return buildFailure(
          body.requestRef,
          503,
          "transient-upstream-unavailable",
          "payment rail stub is temporarily unavailable"
        );
      }
      let confirmation = state.walletConfirmations.get(body.input.intent.intentId);
      if (!confirmation && state.agentWalletExecutor) {
        confirmation = await executeAgentWalletPayment(state, body.input);
      }
      if (state.requireWalletConfirmation && !confirmation) {
        return buildFailure(
          body.requestRef,
          409,
          "wallet-transfer-not-confirmed",
          `wallet transfer confirmation not found for action "${body.input.intent.intentId}"`
        );
      }
      if (confirmation) {
        assertWalletConfirmationMatchesIntent(confirmation, body.input.intent);
      }
      const data = confirmation
        ? buildWalletSettlement(body.input.intent, body.input.decision, confirmation)
        : await createSeededPaymentRailAdapter().executePayment(
            body.input.intent,
            body.input.decision
          );
      return stringifyResponse(200, {
        ok: true,
        requestRef: body.requestRef,
        data,
      });
    } catch (error) {
      return buildFailure(
        body.requestRef,
        500,
        "internal-error",
        error instanceof Error ? error.message : "payment rail execution failed"
      );
    }
  }

  return buildFailure("unknown", 404, "not-found", `unknown payment rail route: ${pathname}`);
}

export function createPaymentRailRequestListener(
  state: PaymentRailServiceState = createPaymentRailServiceState(),
  auth?: PaymentRailServiceAuth
): RequestListener {
  return async (request, response) => {
    try {
      const result = await handlePaymentRailNodeHttpRequest({
        method: request.method,
        url: request.url,
        bodyText: await readBody(request),
        headers: Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key.toLowerCase(),
            Array.isArray(value) ? value.join(", ") : value,
          ])
        ),
      }, state, auth);
      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    } catch (error) {
      const result = buildFailure(
        "unknown",
        500,
        "internal-error",
        error instanceof Error ? error.message : "Unhandled payment rail server error"
      );
      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    }
  };
}

export async function startPaymentRailStubServer(args?: {
  host?: string;
  port?: number;
  failurePlan?: PaymentRailFailurePlan;
  auth?: PaymentRailServiceAuth;
}): Promise<RunningPaymentRailStubServer> {
  const host = args?.host ?? DEFAULT_HOST;
  const port = args?.port ?? DEFAULT_PORT;
  const state = createPaymentRailServiceState(args?.failurePlan);
  const server = createServer(createPaymentRailRequestListener(state, args?.auth));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("payment rail stub server did not bind to a TCP port");
  }

  return {
    server,
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
    state,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function main(): Promise<void> {
  const host = process.argv[2] ?? DEFAULT_HOST;
  const port = Number(process.argv[3] ?? DEFAULT_PORT);
  const token = process.env.PAYMENT_RAIL_TOKEN;
  const signingKey = process.env.PAYMENT_RAIL_SIGNING_KEY;
  const requireWalletConfirmation =
    process.env.PAYMENT_RAIL_REQUIRE_WALLET_CONFIRMATION === "true" ||
    process.env.PAYMENT_RAIL_REQUIRE_WALLET_CONFIRMATION === "1";
  const verifyOnchain =
    process.env.PAYMENT_RAIL_VERIFY_ONCHAIN === "true" ||
    process.env.PAYMENT_RAIL_VERIFY_ONCHAIN === "1";
  const rpcUrl = process.env.PAYMENT_RAIL_RPC_URL;
  const walletConfirmationsPath = process.env.PAYMENT_RAIL_WALLET_CONFIRMATIONS_PATH;
  const agentWalletCommand = process.env.PAYMENT_RAIL_AGENT_WALLET_COMMAND;
  const agentWalletCommandTimeoutMs = process.env.PAYMENT_RAIL_AGENT_WALLET_COMMAND_TIMEOUT_MS
    ? Number(process.env.PAYMENT_RAIL_AGENT_WALLET_COMMAND_TIMEOUT_MS)
    : undefined;
  if (verifyOnchain && !rpcUrl) {
    throw new Error("PAYMENT_RAIL_RPC_URL is required when PAYMENT_RAIL_VERIFY_ONCHAIN is enabled");
  }
  const server = await startPaymentRailStubServer({
    host,
    port,
    failurePlan: {
      requireWalletConfirmation,
      walletConfirmationsPath,
      agentWalletExecutor: agentWalletCommand
        ? new CommandAgentWalletPaymentExecutor({
            command: agentWalletCommand,
            timeoutMs: agentWalletCommandTimeoutMs,
          })
        : undefined,
      walletVerifier: verifyOnchain && rpcUrl
        ? new JsonRpcWalletPaymentVerifier({ rpcUrl })
        : undefined,
    },
    auth: token && signingKey
      ? {
          token,
          signingKey,
        }
      : undefined,
  });
  console.log(
    JSON.stringify(
      {
        host: server.host,
        port: server.port,
        url: server.url,
        requireWalletConfirmation,
        walletConfirmationsPath: walletConfirmationsPath ?? null,
        agentWalletExecutor: agentWalletCommand ? "command" : null,
        verifyOnchain,
        rpcUrl: verifyOnchain ? rpcUrl : null,
        routes: PAYMENT_RAIL_SERVICE_ROUTES,
      },
      null,
      2
    )
  );
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
