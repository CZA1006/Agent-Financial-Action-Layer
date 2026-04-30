import { pathToFileURL } from "node:url";

import {
  Contract,
  JsonRpcProvider,
  Wallet,
  getAddress,
  isAddress,
  parseUnits,
} from "ethers";

import type { AuthorizationDecision, PaymentIntent } from "../../sdk/types";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
] as const;

interface AgentWalletSignerInput {
  intent: PaymentIntent;
  decision: AuthorizationDecision;
}

export interface AgentWalletSignerConfig {
  privateKey: string;
  rpcUrl: string;
  maxAmount: string;
  tokenAddress: string;
  allowedPayeeAddresses: string[];
  confirmations: number;
  chainId: number;
}

export interface AgentWalletSignerOutput {
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
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function readPositiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function normalizeAddress(name: string, value: string): string {
  if (!isAddress(value)) {
    throw new Error(`${name} must be an EVM address`);
  }
  return getAddress(value);
}

function parseAllowedPayees(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeAddress("AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES", item));
}

export function loadAgentWalletSignerConfig(env: NodeJS.ProcessEnv): AgentWalletSignerConfig {
  return {
    privateKey: required("AGENT_WALLET_PRIVATE_KEY", env.AGENT_WALLET_PRIVATE_KEY),
    rpcUrl: required("AGENT_WALLET_RPC_URL or PAYMENT_RAIL_RPC_URL", env.AGENT_WALLET_RPC_URL ?? env.PAYMENT_RAIL_RPC_URL),
    maxAmount: env.AGENT_WALLET_MAX_USDC_AMOUNT ?? "0.01",
    tokenAddress: normalizeAddress(
      "AGENT_WALLET_USDC_TOKEN_ADDRESS",
      env.AGENT_WALLET_USDC_TOKEN_ADDRESS ?? BASE_SEPOLIA_USDC
    ),
    allowedPayeeAddresses: parseAllowedPayees(env.AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES),
    confirmations: readPositiveInteger(
      "AGENT_WALLET_RECEIPT_CONFIRMATIONS",
      env.AGENT_WALLET_RECEIPT_CONFIRMATIONS,
      1
    ),
    chainId: readPositiveInteger("AGENT_WALLET_CHAIN_ID", env.AGENT_WALLET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID),
  };
}

function getSettlementAddress(intent: PaymentIntent): string {
  if (!("settlementAddress" in intent.payee) || typeof intent.payee.settlementAddress !== "string") {
    throw new Error("intent.payee.settlementAddress must be set for agent-wallet payments");
  }
  return normalizeAddress("intent.payee.settlementAddress", intent.payee.settlementAddress);
}

export function validateAgentWalletPayment(
  input: AgentWalletSignerInput,
  config: AgentWalletSignerConfig
): {
  actionRef: string;
  to: string;
  amountUnits: bigint;
} {
  if (input.decision.result !== "approved") {
    throw new Error(`AFAL decision must be approved, got "${input.decision.result}"`);
  }
  if (input.intent.asset !== "USDC") {
    throw new Error(`agent wallet only supports USDC, got "${input.intent.asset}"`);
  }
  if (input.intent.chain !== "base-sepolia") {
    throw new Error(`agent wallet only supports base-sepolia, got "${input.intent.chain}"`);
  }

  const to = getSettlementAddress(input.intent);
  if (
    config.allowedPayeeAddresses.length > 0 &&
    !config.allowedPayeeAddresses.some((address) => address.toLowerCase() === to.toLowerCase())
  ) {
    throw new Error(`payee address "${to}" is not in AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES`);
  }

  const amountUnits = parseUnits(input.intent.amount, 6);
  const maxUnits = parseUnits(config.maxAmount, 6);
  if (amountUnits <= 0n) {
    throw new Error("payment amount must be positive");
  }
  if (amountUnits > maxUnits) {
    throw new Error(
      `payment amount "${input.intent.amount}" exceeds AGENT_WALLET_MAX_USDC_AMOUNT "${config.maxAmount}"`
    );
  }

  return {
    actionRef: input.intent.intentId,
    to,
    amountUnits,
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function executeAgentWalletPayment(
  input: AgentWalletSignerInput,
  config: AgentWalletSignerConfig
): Promise<AgentWalletSignerOutput> {
  const validated = validateAgentWalletPayment(input, config);
  const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== config.chainId) {
    throw new Error(`RPC chainId mismatch: expected ${config.chainId}, got ${network.chainId.toString()}`);
  }

  const wallet = new Wallet(config.privateKey, provider);
  const token = new Contract(config.tokenAddress, ERC20_ABI, wallet);
  const tx = await token.transfer(validated.to, validated.amountUnits);
  const receipt = await tx.wait(config.confirmations);
  if (!receipt) {
    throw new Error(`transaction receipt not found for "${tx.hash}"`);
  }
  if (receipt.status !== 1) {
    throw new Error(`transaction "${tx.hash}" failed`);
  }

  return {
    actionRef: validated.actionRef,
    txHash: tx.hash,
    from: await wallet.getAddress(),
    to: validated.to,
    tokenAddress: config.tokenAddress,
    amount: input.intent.amount,
    asset: input.intent.asset,
    chain: input.intent.chain,
    chainId: config.chainId,
    confirmedAt: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  const parsed = JSON.parse(await readStdin()) as AgentWalletSignerInput;
  const result = await executeAgentWalletPayment(parsed, loadAgentWalletSignerConfig(process.env));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
