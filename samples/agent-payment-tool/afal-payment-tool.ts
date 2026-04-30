import { pathToFileURL } from "node:url";

import {
  buildAgentPaymentIntent,
  buildWalletPaymentUrl,
  createAfalClient,
  parseAgentPaymentInstruction,
} from "../../sdk/client";

export interface AfalPaymentToolArgs {
  baseUrl: string;
  clientId: string;
  signingKey: string;
  message: string;
  walletDemoUrl: string;
  waitForReceipt: boolean;
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

function parseArgs(argv: string[]): AfalPaymentToolArgs {
  const args: Partial<AfalPaymentToolArgs> = {
    baseUrl: process.env.AFAL_BASE_URL,
    clientId: process.env.AFAL_CLIENT_ID,
    signingKey: process.env.AFAL_SIGNING_KEY,
    message: process.env.AFAL_AGENT_PAYMENT_MESSAGE,
    walletDemoUrl: process.env.AFAL_WALLET_DEMO_URL ?? "http://34.44.95.42:3412/wallet-demo",
    waitForReceipt: false,
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
    if (arg === "--message") {
      args.message = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--wallet-demo-url") {
      args.walletDemoUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--wait-for-receipt") {
      args.waitForReceipt = true;
    }
  }

  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", args.baseUrl),
    clientId: required("AFAL_CLIENT_ID or --client-id", args.clientId),
    signingKey: required("AFAL_SIGNING_KEY or --signing-key", args.signingKey),
    message: required("AFAL_AGENT_PAYMENT_MESSAGE or --message", args.message),
    walletDemoUrl: required("AFAL_WALLET_DEMO_URL or --wallet-demo-url", args.walletDemoUrl),
    waitForReceipt: Boolean(args.waitForReceipt),
  };
}

export async function runAfalPaymentTool(args: AfalPaymentToolArgs) {
  const afal = createAfalClient({
    baseUrl: args.baseUrl,
    clientId: args.clientId,
    signingKey: args.signingKey,
  });
  const instruction = parseAgentPaymentInstruction({ message: args.message });
  const intent = buildAgentPaymentIntent(instruction);
  const approval = await afal.requestPaymentApproval({
    intent,
    monetaryBudgetRef: instruction.monetaryBudgetRef,
  });
  const walletUrl = buildWalletPaymentUrl({
    walletDemoUrl: args.walletDemoUrl,
    actionRef: approval.intent.intentId,
    instruction,
  });

  const result = {
    tool: "afal.request_payment",
    status: "pending_approval",
    actionRef: approval.intent.intentId,
    approvalSessionRef: approval.approvalSession.approvalSessionId,
    payeeDid: instruction.payeeDid,
    payeeAddress: instruction.payeeAddress,
    amount: instruction.amount,
    asset: instruction.asset,
    chain: instruction.chain,
    walletUrl,
    afal: {
      decisionRef: approval.initialDecision.decisionId,
      challengeRef: approval.challenge.challengeId,
      reservedAmount: approval.updatedBudget?.reservedAmount,
      availableAmount: approval.updatedBudget?.availableAmount,
    },
  };

  if (!args.waitForReceipt) {
    return result;
  }

  const receipt = await afal.waitForPaymentReceipt({
    actionRef: approval.intent.intentId,
  });
  return {
    ...result,
    status: "settled",
    receiptRef: receipt.receiptRef,
    settlementRef: receipt.settlementRef,
    txHash: receipt.txHash,
  };
}

async function main(): Promise<void> {
  const result = await runAfalPaymentTool(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
