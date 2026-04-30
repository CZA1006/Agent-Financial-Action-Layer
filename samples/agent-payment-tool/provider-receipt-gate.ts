import { pathToFileURL } from "node:url";

import type { PaymentActionStatusOutput } from "../../backend/afal/interfaces";
import { createAfalClient } from "../../sdk/client";

export interface ProviderReceiptGateArgs {
  baseUrl: string;
  clientId: string;
  signingKey: string;
  actionRef: string;
  expectedPayeeAddress?: string;
  expectedAmount?: string;
  expectedAsset?: string;
  expectedChain?: string;
  expectedTxHash?: string;
}

export interface ProviderReceiptGateResult {
  tool: "afal.provider_receipt_gate";
  actionRef: string;
  deliverService: boolean;
  reason: string;
  checks: {
    actionTypePayment: boolean;
    intentSettled: boolean;
    settlementPresent: boolean;
    paymentReceiptFinal: boolean;
    receiptSettlementMatches: boolean;
    payeeMatches?: boolean;
    amountMatches?: boolean;
    assetMatches?: boolean;
    chainMatches?: boolean;
    txHashMatches?: boolean;
  };
  evidence?: {
    settlementRef?: string;
    receiptRef?: string;
    txHash?: string;
    amount?: unknown;
    asset?: unknown;
    chain?: unknown;
    payeeDid?: unknown;
    settlementAddress?: string;
  };
}

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

function parseArgs(argv: string[]): ProviderReceiptGateArgs {
  const args: Partial<ProviderReceiptGateArgs> = {
    baseUrl: process.env.AFAL_BASE_URL,
    clientId: process.env.AFAL_CLIENT_ID,
    signingKey: process.env.AFAL_SIGNING_KEY,
    actionRef: process.env.AFAL_ACTION_REF,
    expectedPayeeAddress: process.env.AFAL_EXPECTED_PAYEE_ADDRESS,
    expectedAmount: process.env.AFAL_EXPECTED_AMOUNT,
    expectedAsset: process.env.AFAL_EXPECTED_ASSET,
    expectedChain: process.env.AFAL_EXPECTED_CHAIN,
    expectedTxHash: process.env.AFAL_EXPECTED_TX_HASH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--client-id") {
      args.clientId = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--signing-key") {
      args.signingKey = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--action-ref") {
      args.actionRef = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--expected-payee-address") {
      args.expectedPayeeAddress = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--expected-amount") {
      args.expectedAmount = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--expected-asset") {
      args.expectedAsset = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--expected-chain") {
      args.expectedChain = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--expected-tx-hash") {
      args.expectedTxHash = getArgValue(argv, index);
      index += 1;
    }
  }

  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", args.baseUrl),
    clientId: required("AFAL_CLIENT_ID or --client-id", args.clientId),
    signingKey: required("AFAL_SIGNING_KEY or --signing-key", args.signingKey),
    actionRef: required("AFAL_ACTION_REF or --action-ref", args.actionRef),
    expectedPayeeAddress: args.expectedPayeeAddress,
    expectedAmount: args.expectedAmount,
    expectedAsset: args.expectedAsset,
    expectedChain: args.expectedChain,
    expectedTxHash: args.expectedTxHash,
  };
}

function normalizeAddress(value: string | undefined): string | undefined {
  return value?.toLowerCase();
}

function buildRejectedResult(
  actionRef: string,
  reason: string,
  checks?: Partial<ProviderReceiptGateResult["checks"]>
): ProviderReceiptGateResult {
  return {
    tool: "afal.provider_receipt_gate",
    actionRef,
    deliverService: false,
    reason,
    checks: {
      actionTypePayment: false,
      intentSettled: false,
      settlementPresent: false,
      paymentReceiptFinal: false,
      receiptSettlementMatches: false,
      ...checks,
    },
  };
}

export function evaluateProviderReceiptGate(args: {
  actionRef: string;
  status: PaymentActionStatusOutput;
  expectedPayeeAddress?: string;
  expectedAmount?: string;
  expectedAsset?: string;
  expectedChain?: string;
  expectedTxHash?: string;
}): ProviderReceiptGateResult {
  const receipt = args.status.paymentReceipt;
  const settlement = args.status.settlement;
  const receiptEvidence = receipt?.evidence ?? {};
  const checks: ProviderReceiptGateResult["checks"] = {
    actionTypePayment: true,
    intentSettled: args.status.intent.status === "settled",
    settlementPresent: Boolean(settlement),
    paymentReceiptFinal: receipt?.status === "final",
    receiptSettlementMatches:
      Boolean(receipt?.settlementRef) &&
      Boolean(settlement?.settlementId) &&
      receipt?.settlementRef === settlement?.settlementId,
  };

  if (args.expectedPayeeAddress) {
    checks.payeeMatches =
      normalizeAddress(args.expectedPayeeAddress) ===
      normalizeAddress(args.status.intent.payee.settlementAddress);
  }
  if (args.expectedAmount) {
    checks.amountMatches = receiptEvidence.amount === args.expectedAmount;
  }
  if (args.expectedAsset) {
    checks.assetMatches = receiptEvidence.asset === args.expectedAsset;
  }
  if (args.expectedChain) {
    checks.chainMatches = receiptEvidence.chain === args.expectedChain;
  }
  if (args.expectedTxHash) {
    checks.txHashMatches =
      typeof receiptEvidence.txHash === "string" &&
      receiptEvidence.txHash.toLowerCase() === args.expectedTxHash.toLowerCase();
  }

  const failed = Object.entries(checks).filter(([, value]) => value === false);
  return {
    tool: "afal.provider_receipt_gate",
    actionRef: args.actionRef,
    deliverService: failed.length === 0,
    reason:
      failed.length === 0
        ? "AFAL action is settled with final receipt evidence; provider may deliver service."
        : `Provider must not deliver service; failed checks: ${failed
            .map(([name]) => name)
            .join(", ")}`,
    checks,
    evidence: {
      settlementRef: settlement?.settlementId,
      receiptRef: receipt?.receiptId,
      txHash: typeof receiptEvidence.txHash === "string" ? receiptEvidence.txHash : undefined,
      amount: receiptEvidence.amount,
      asset: receiptEvidence.asset,
      chain: receiptEvidence.chain,
      payeeDid: receiptEvidence.payeeDid,
      settlementAddress: args.status.intent.payee.settlementAddress,
    },
  };
}

export async function runProviderReceiptGate(
  args: ProviderReceiptGateArgs
): Promise<ProviderReceiptGateResult> {
  const afal = createAfalClient({
    baseUrl: args.baseUrl,
    clientId: args.clientId,
    signingKey: args.signingKey,
  });
  const status = await afal.getActionStatus({
    actionRef: args.actionRef,
  });

  if (status.actionType !== "payment") {
    return buildRejectedResult(args.actionRef, "AFAL action is not a payment action");
  }

  return evaluateProviderReceiptGate({
    actionRef: args.actionRef,
    status,
    expectedPayeeAddress: args.expectedPayeeAddress,
    expectedAmount: args.expectedAmount,
    expectedAsset: args.expectedAsset,
    expectedChain: args.expectedChain,
    expectedTxHash: args.expectedTxHash,
  });
}

async function main(): Promise<void> {
  const result = await runProviderReceiptGate(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
