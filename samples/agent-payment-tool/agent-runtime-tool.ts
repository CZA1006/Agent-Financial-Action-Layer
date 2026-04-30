import { pathToFileURL } from "node:url";

import { runAfalPaymentTool, type AfalPaymentToolArgs } from "./afal-payment-tool";
import { runApproveResumeTool, type ApproveResumeToolArgs } from "./approve-resume-tool";
import {
  runProviderReceiptGate,
  type ProviderReceiptGateResult,
  type ProviderReceiptGateArgs,
} from "./provider-receipt-gate";

export type AgentRuntimeToolCommand =
  | "request-payment"
  | "approve-resume"
  | "provider-gate"
  | "pay-and-gate";

export interface AgentRuntimeToolResult {
  tool: "afal.agent_runtime_tool";
  command: AgentRuntimeToolCommand;
  result: unknown;
}

export interface AgentRuntimePayAndGateArgs extends AfalPaymentToolArgs {
  approvalComment?: string;
  paymentMode: "wallet" | "agent-wallet";
  walletConfirmationBaseUrl: string;
  walletConfirmationTimeoutMs: number;
  walletConfirmationPollIntervalMs: number;
}

export interface WalletConfirmationReadback {
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
  verification?: {
    ok: boolean;
    verifiedAt: string;
    chainId: number;
    txHash: string;
    logIndex?: number;
  };
  status: "ok";
}

export interface AgentRuntimePayAndGateResult {
  tool: "afal.pay_and_gate";
  status: "settled" | "not_deliverable";
  actionRef: string;
  approvalSessionRef: string;
  walletUrl: string;
  walletConfirmation?: WalletConfirmationReadback;
  approval: unknown;
  providerGate: ProviderReceiptGateResult;
  deliverService: boolean;
}

export interface AgentRuntimeToolRunners {
  requestPayment(args: AfalPaymentToolArgs): Promise<unknown>;
  approveResume(args: ApproveResumeToolArgs): Promise<unknown>;
  providerGate(args: ProviderReceiptGateArgs): Promise<unknown>;
  waitForWalletConfirmation(args: {
    baseUrl: string;
    actionRef: string;
    timeoutMs: number;
    pollIntervalMs: number;
  }): Promise<WalletConfirmationReadback>;
}

const defaultRunners: AgentRuntimeToolRunners = {
  requestPayment: runAfalPaymentTool,
  approveResume: runApproveResumeTool,
  providerGate: runProviderReceiptGate,
  waitForWalletConfirmation,
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function getArgValue(argv: string[], index: number): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${argv[index]} requires a value`);
  }
  return value;
}

function readOption(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return getArgValue(argv, index);
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function optionalPositiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function deriveWalletConfirmationBaseUrl(walletDemoUrl: string): string {
  const url = new URL(walletDemoUrl);
  return url.origin;
}

function readPaymentMode(value: string | undefined): "wallet" | "agent-wallet" {
  if (!value || value === "wallet") {
    return "wallet";
  }
  if (value === "agent-wallet") {
    return value;
  }
  throw new Error('--payment-mode must be "wallet" or "agent-wallet"');
}

function parseRequestPaymentArgs(argv: string[]): AfalPaymentToolArgs {
  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", readOption(argv, "--base-url") ?? process.env.AFAL_BASE_URL),
    clientId: required("AFAL_CLIENT_ID or --client-id", readOption(argv, "--client-id") ?? process.env.AFAL_CLIENT_ID),
    signingKey: required(
      "AFAL_SIGNING_KEY or --signing-key",
      readOption(argv, "--signing-key") ?? process.env.AFAL_SIGNING_KEY
    ),
    message: required(
      "AFAL_AGENT_PAYMENT_MESSAGE or --message",
      readOption(argv, "--message") ?? process.env.AFAL_AGENT_PAYMENT_MESSAGE
    ),
    walletDemoUrl: required(
      "AFAL_WALLET_DEMO_URL or --wallet-demo-url",
      readOption(argv, "--wallet-demo-url") ??
        process.env.AFAL_WALLET_DEMO_URL ??
        "http://34.44.95.42:3412/wallet-demo"
    ),
    waitForReceipt: hasFlag(argv, "--wait-for-receipt"),
  };
}

function parsePayAndGateArgs(argv: string[]): AgentRuntimePayAndGateArgs {
  const requestArgs = parseRequestPaymentArgs(argv);
  const walletConfirmationBaseUrl =
    readOption(argv, "--wallet-confirmation-base-url") ??
    process.env.AFAL_WALLET_CONFIRMATION_BASE_URL ??
    deriveWalletConfirmationBaseUrl(requestArgs.walletDemoUrl);

  return {
    ...requestArgs,
    approvalComment:
      readOption(argv, "--comment") ??
      process.env.AFAL_APPROVAL_COMMENT ??
      "Approved after wallet-confirmed AFAL payment",
    paymentMode: readPaymentMode(readOption(argv, "--payment-mode") ?? process.env.AFAL_PAYMENT_MODE),
    walletConfirmationBaseUrl,
    walletConfirmationTimeoutMs: optionalPositiveInteger(
      "AFAL_WALLET_CONFIRMATION_TIMEOUT_MS or --wallet-confirmation-timeout-ms",
      readOption(argv, "--wallet-confirmation-timeout-ms") ??
        process.env.AFAL_WALLET_CONFIRMATION_TIMEOUT_MS,
      300_000
    ),
    walletConfirmationPollIntervalMs: optionalPositiveInteger(
      "AFAL_WALLET_CONFIRMATION_POLL_INTERVAL_MS or --wallet-confirmation-poll-interval-ms",
      readOption(argv, "--wallet-confirmation-poll-interval-ms") ??
        process.env.AFAL_WALLET_CONFIRMATION_POLL_INTERVAL_MS,
      2_000
    ),
  };
}

function parseApproveResumeArgs(argv: string[]): ApproveResumeToolArgs {
  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", readOption(argv, "--base-url") ?? process.env.AFAL_BASE_URL),
    approvalSessionRef: required(
      "AFAL_APPROVAL_SESSION_REF or --approval-session-ref",
      readOption(argv, "--approval-session-ref") ?? process.env.AFAL_APPROVAL_SESSION_REF
    ),
    comment: readOption(argv, "--comment") ?? process.env.AFAL_APPROVAL_COMMENT,
    requestRefPrefix:
      readOption(argv, "--request-ref-prefix") ?? process.env.AFAL_APPROVAL_REQUEST_REF_PREFIX,
  };
}

function parseProviderGateArgs(argv: string[]): ProviderReceiptGateArgs {
  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", readOption(argv, "--base-url") ?? process.env.AFAL_BASE_URL),
    clientId: required("AFAL_CLIENT_ID or --client-id", readOption(argv, "--client-id") ?? process.env.AFAL_CLIENT_ID),
    signingKey: required(
      "AFAL_SIGNING_KEY or --signing-key",
      readOption(argv, "--signing-key") ?? process.env.AFAL_SIGNING_KEY
    ),
    actionRef: required("AFAL_ACTION_REF or --action-ref", readOption(argv, "--action-ref") ?? process.env.AFAL_ACTION_REF),
    expectedPayeeAddress:
      readOption(argv, "--expected-payee-address") ?? process.env.AFAL_EXPECTED_PAYEE_ADDRESS,
    expectedAmount: readOption(argv, "--expected-amount") ?? process.env.AFAL_EXPECTED_AMOUNT,
    expectedAsset: readOption(argv, "--expected-asset") ?? process.env.AFAL_EXPECTED_ASSET,
    expectedChain: readOption(argv, "--expected-chain") ?? process.env.AFAL_EXPECTED_CHAIN,
    expectedTxHash: readOption(argv, "--expected-tx-hash") ?? process.env.AFAL_EXPECTED_TX_HASH,
  };
}

function parseCommand(value: string | undefined): AgentRuntimeToolCommand {
  if (
    value === "request-payment" ||
    value === "approve-resume" ||
    value === "provider-gate" ||
    value === "pay-and-gate"
  ) {
    return value;
  }
  throw new Error(
    'First argument must be one of "request-payment", "approve-resume", "provider-gate", or "pay-and-gate"'
  );
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readStringField(value: Record<string, unknown>, field: string, name: string): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string") {
    throw new Error(`${name}.${field} must be a string`);
  }
  return fieldValue;
}

function readBooleanField(value: Record<string, unknown>, field: string, name: string): boolean {
  const fieldValue = value[field];
  if (typeof fieldValue !== "boolean") {
    throw new Error(`${name}.${field} must be a boolean`);
  }
  return fieldValue;
}

function readOptionalStringField(
  value: Record<string, unknown>,
  field: string,
  name: string
): string | undefined {
  const fieldValue = value[field];
  if (fieldValue === undefined) {
    return undefined;
  }
  if (typeof fieldValue !== "string") {
    throw new Error(`${name}.${field} must be a string`);
  }
  return fieldValue;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isWalletConfirmationReadback(value: unknown): value is WalletConfirmationReadback {
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
      typeof value.chainId === "number" &&
      "confirmedAt" in value &&
      typeof value.confirmedAt === "string" &&
      "status" in value &&
      value.status === "ok"
  );
}

async function readWalletConfirmation(
  baseUrl: string,
  actionRef: string
): Promise<WalletConfirmationReadback | undefined> {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/wallet-payments/confirmations/${encodeURIComponent(actionRef)}`
  );
  if (response.status === 404) {
    return undefined;
  }
  const body = (await response.json()) as unknown;
  const envelope = asRecord(body, "wallet confirmation response");
  if (envelope.ok !== true) {
    throw new Error(JSON.stringify(body));
  }
  const data = envelope.data;
  if (!isWalletConfirmationReadback(data)) {
    throw new Error("wallet confirmation response data is invalid");
  }
  return data;
}

async function waitForWalletConfirmation(args: {
  baseUrl: string;
  actionRef: string;
  timeoutMs: number;
  pollIntervalMs: number;
}): Promise<WalletConfirmationReadback> {
  const deadline = Date.now() + args.timeoutMs;
  while (Date.now() <= deadline) {
    const confirmation = await readWalletConfirmation(args.baseUrl, args.actionRef);
    if (confirmation) {
      return confirmation;
    }
    await sleep(args.pollIntervalMs);
  }
  throw new Error(
    `Timed out waiting for wallet confirmation for action "${args.actionRef}"`
  );
}

async function runPayAndGate(
  args: AgentRuntimePayAndGateArgs,
  runners: AgentRuntimeToolRunners
): Promise<AgentRuntimePayAndGateResult> {
  const requestPayment = asRecord(
    await runners.requestPayment({ ...args, waitForReceipt: false }),
    "requestPayment result"
  );
  const actionRef = readStringField(requestPayment, "actionRef", "requestPayment result");
  const approvalSessionRef = readStringField(
    requestPayment,
    "approvalSessionRef",
    "requestPayment result"
  );
  const walletUrl = readStringField(requestPayment, "walletUrl", "requestPayment result");
  const payeeAddress = readStringField(requestPayment, "payeeAddress", "requestPayment result");
  const amount = readStringField(requestPayment, "amount", "requestPayment result");
  const asset = readStringField(requestPayment, "asset", "requestPayment result");
  const chain = readStringField(requestPayment, "chain", "requestPayment result");

  const walletConfirmation =
    args.paymentMode === "wallet"
      ? await runners.waitForWalletConfirmation({
          baseUrl: args.walletConfirmationBaseUrl,
          actionRef,
          timeoutMs: args.walletConfirmationTimeoutMs,
          pollIntervalMs: args.walletConfirmationPollIntervalMs,
        })
      : undefined;

  const approval = await runners.approveResume({
    baseUrl: args.baseUrl,
    approvalSessionRef,
    comment: args.approvalComment,
  });
  const approvalRecord = asRecord(approval, "approval result");
  const approvalTxHash = readOptionalStringField(approvalRecord, "txHash", "approval result");
  const expectedTxHash = walletConfirmation?.txHash ?? approvalTxHash;
  if (!expectedTxHash) {
    throw new Error("payment txHash was not available from wallet confirmation or approval result");
  }
  const providerGate = (await runners.providerGate({
    baseUrl: args.baseUrl,
    clientId: args.clientId,
    signingKey: args.signingKey,
    actionRef,
    expectedPayeeAddress: payeeAddress,
    expectedAmount: amount,
    expectedAsset: asset,
    expectedChain: chain,
    expectedTxHash,
  })) as ProviderReceiptGateResult;
  const providerGateRecord = asRecord(providerGate, "providerGate result");
  const deliverService = readBooleanField(
    providerGateRecord,
    "deliverService",
    "providerGate result"
  );

  return {
    tool: "afal.pay_and_gate",
    status: deliverService ? "settled" : "not_deliverable",
    actionRef,
    approvalSessionRef,
    walletUrl,
    walletConfirmation,
    approval,
    providerGate,
    deliverService,
  };
}

export async function runAgentRuntimeTool(
  argv: string[],
  runners: AgentRuntimeToolRunners = defaultRunners
): Promise<AgentRuntimeToolResult> {
  const command = parseCommand(argv[0]);
  const commandArgs = argv.slice(1);

  if (command === "request-payment") {
    return {
      tool: "afal.agent_runtime_tool",
      command,
      result: await runners.requestPayment(parseRequestPaymentArgs(commandArgs)),
    };
  }

  if (command === "approve-resume") {
    return {
      tool: "afal.agent_runtime_tool",
      command,
      result: await runners.approveResume(parseApproveResumeArgs(commandArgs)),
    };
  }

  if (command === "pay-and-gate") {
    return {
      tool: "afal.agent_runtime_tool",
      command,
      result: await runPayAndGate(parsePayAndGateArgs(commandArgs), runners),
    };
  }

  return {
    tool: "afal.agent_runtime_tool",
    command,
    result: await runners.providerGate(parseProviderGateArgs(commandArgs)),
  };
}

async function main(): Promise<void> {
  const result = await runAgentRuntimeTool(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
