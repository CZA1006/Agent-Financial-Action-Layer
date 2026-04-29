import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";

import type { PaymentApprovalRequestOutput } from "../../backend/afal/interfaces";
import type { AfalApiFailure, AfalApiSuccess } from "../../backend/afal/api/types";
import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import type { PaymentIntent } from "../../sdk/types";
import { runApprovalAgent, type ApprovalAgentResult } from "./approval-agent";
import { createAfalHttpClient } from "./http-client";
import { runPayeeAgent, type PayeeAgentResult } from "./payee-agent";

const DEFAULT_WALLET_DEMO_URL = "http://34.44.95.42:3412/wallet-demo";
const DEFAULT_TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const DEFAULT_PAYEE_ADDRESS = "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94";
const DEFAULT_AMOUNT = "0.01";

interface DemoArgs {
  baseUrl: string;
  clientId: string;
  signingKey: string;
  message: string;
  walletDemoUrl: string;
  payeeAddress: string;
  amount: string;
  tokenAddress: string;
  autoApprove: boolean;
  assumeWalletConfirmed: boolean;
  outputMode: "json" | "transcript";
}

interface PaymentInstruction {
  rawMessage: string;
  payerAgentId: string;
  payeeAgentId: string;
  payeeAddress: string;
  amount: string;
  asset: "USDC";
  chain: "base-sepolia";
  tokenAddress: string;
}

interface DemoTimelineEvent {
  actor: string;
  event: string;
  detail: Record<string, unknown>;
}

interface WalletPaymentConfirmationReadback {
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
    ok: true;
    verifiedAt: string;
    chainId: number;
    txHash: string;
    logIndex: number;
  };
  status: "ok";
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getArgValue(argv: string[], index: number): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${argv[index]} requires a value`);
  }
  return value;
}

function parseArgs(argv: string[]): DemoArgs {
  const result: Partial<DemoArgs> = {
    baseUrl: process.env.AFAL_BASE_URL,
    clientId: process.env.AFAL_CLIENT_ID,
    signingKey: process.env.AFAL_SIGNING_KEY,
    message: process.env.AFAL_AGENT_PAYMENT_MESSAGE,
    walletDemoUrl: process.env.AFAL_WALLET_DEMO_URL ?? DEFAULT_WALLET_DEMO_URL,
    payeeAddress: process.env.AFAL_DEMO_PAYEE_ADDRESS ?? DEFAULT_PAYEE_ADDRESS,
    amount: process.env.AFAL_DEMO_PAYMENT_AMOUNT ?? DEFAULT_AMOUNT,
    tokenAddress: process.env.AFAL_DEMO_TOKEN_ADDRESS ?? DEFAULT_TOKEN_ADDRESS,
    autoApprove: process.env.AFAL_DEMO_AUTO_APPROVE !== "false",
    assumeWalletConfirmed: process.env.AFAL_DEMO_ASSUME_WALLET_CONFIRMED === "true",
    outputMode: process.env.AFAL_DEMO_OUTPUT_MODE === "transcript" ? "transcript" : "json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      result.baseUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--client-id") {
      result.clientId = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--signing-key") {
      result.signingKey = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--message") {
      result.message = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--wallet-demo-url") {
      result.walletDemoUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--payee-address") {
      result.payeeAddress = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--amount") {
      result.amount = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--token-address") {
      result.tokenAddress = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--auto-approve") {
      result.autoApprove = true;
      continue;
    }
    if (arg === "--no-auto-approve") {
      result.autoApprove = false;
      continue;
    }
    if (arg === "--assume-wallet-confirmed") {
      result.assumeWalletConfirmed = true;
      continue;
    }
    if (arg === "--transcript") {
      result.outputMode = "transcript";
      continue;
    }
    if (arg === "--json") {
      result.outputMode = "json";
    }
  }

  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", result.baseUrl),
    clientId: required("AFAL_CLIENT_ID or --client-id", result.clientId),
    signingKey: required("AFAL_SIGNING_KEY or --signing-key", result.signingKey),
    message: required("AFAL_AGENT_PAYMENT_MESSAGE or --message", result.message),
    walletDemoUrl: required("AFAL_WALLET_DEMO_URL or --wallet-demo-url", result.walletDemoUrl),
    payeeAddress: required("AFAL_DEMO_PAYEE_ADDRESS or --payee-address", result.payeeAddress),
    amount: required("AFAL_DEMO_PAYMENT_AMOUNT or --amount", result.amount),
    tokenAddress: required("AFAL_DEMO_TOKEN_ADDRESS or --token-address", result.tokenAddress),
    autoApprove: Boolean(result.autoApprove),
    assumeWalletConfirmed: Boolean(result.assumeWalletConfirmed),
    outputMode: result.outputMode ?? "json",
  };
}

function parsePaymentInstruction(args: DemoArgs): PaymentInstruction {
  const amountMatch = args.message.match(/(\d+(?:\.\d+)?)\s*USDC/iu);
  const addressMatch = args.message.match(/0x[a-fA-F0-9]{40}/u);

  return {
    rawMessage: args.message,
    payerAgentId: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
    payeeAgentId: paymentFlowFixtures.paymentIntentCreated.payee.payeeDid,
    payeeAddress: addressMatch?.[0] ?? args.payeeAddress,
    amount: amountMatch?.[1] ?? args.amount,
    asset: "USDC",
    chain: "base-sepolia",
    tokenAddress: args.tokenAddress,
  };
}

function createSignedHeaders(args: {
  clientId: string;
  signingKey: string;
  requestRef: string;
}): Record<string, string> {
  const timestamp = new Date().toISOString();
  return {
    "content-type": "application/json",
    "x-afal-client-id": args.clientId,
    "x-afal-request-timestamp": timestamp,
    "x-afal-request-signature": sha256(
      `${args.clientId}:${args.requestRef}:${timestamp}:${args.signingKey}`
    ),
  };
}

async function postJson<T>(args: {
  url: string;
  requestRef: string;
  clientId: string;
  signingKey: string;
  body: unknown;
}): Promise<T> {
  const response = await fetch(args.url, {
    method: "POST",
    headers: createSignedHeaders({
      clientId: args.clientId,
      signingKey: args.signingKey,
      requestRef: args.requestRef,
    }),
    body: JSON.stringify(args.body),
  });
  const body = (await response.json()) as T | AfalApiFailure;
  if (
    typeof body === "object" &&
    body !== null &&
    "ok" in body &&
    body.ok === false
  ) {
    throw new Error(
      `AFAL request failed: ${body.capability} [${body.statusCode} ${body.error.code}] ${body.error.message}`
    );
  }
  return body as T;
}

function buildPromptPaymentIntent(instruction: PaymentInstruction): PaymentIntent {
  return {
    ...clone(paymentFlowFixtures.paymentIntentCreated),
    payee: {
      ...paymentFlowFixtures.paymentIntentCreated.payee,
      settlementAddress: instruction.payeeAddress,
    },
    amount: instruction.amount,
    chain: instruction.chain,
    purpose: {
      category: "service-payment",
      description: `Agent prompt payment: ${instruction.rawMessage}`,
      referenceId: "agent-prompt-payment-demo",
    },
  };
}

async function requestPaymentApproval(args: {
  baseUrl: string;
  clientId: string;
  signingKey: string;
  instruction: PaymentInstruction;
}): Promise<PaymentApprovalRequestOutput> {
  const requestRef = `req-agent-prompt-payment-${Date.now()}`;
  const intent = buildPromptPaymentIntent(args.instruction);
  const body = {
    requestRef,
    input: {
      requestRef,
      intent,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  };
  const response = await postJson<AfalApiSuccess<PaymentApprovalRequestOutput>>({
    url: `${args.baseUrl.replace(/\/+$/, "")}${AFAL_HTTP_ROUTES.requestPaymentApproval}`,
    requestRef,
    clientId: args.clientId,
    signingKey: args.signingKey,
    body,
  });
  return response.data;
}

function buildWalletDemoUrl(args: {
  walletDemoUrl: string;
  actionRef: string;
  instruction: PaymentInstruction;
}): string {
  const url = new URL(args.walletDemoUrl);
  url.searchParams.set("actionRef", args.actionRef);
  url.searchParams.set("to", args.instruction.payeeAddress);
  url.searchParams.set("amount", args.instruction.amount);
  url.searchParams.set("tokenAddress", args.instruction.tokenAddress);
  return url.toString();
}

async function waitForWalletConfirmation(prompt: string): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    await rl.question(prompt);
  } finally {
    rl.close();
  }
}

async function readWalletPaymentConfirmation(args: {
  walletDemoUrl: string;
  actionRef: string;
}): Promise<WalletPaymentConfirmationReadback | undefined> {
  const url = new URL(args.walletDemoUrl);
  url.pathname = `/wallet-payments/confirmations/${encodeURIComponent(args.actionRef)}`;
  url.search = "";
  const response = await fetch(url);
  if (!response.ok) {
    return undefined;
  }
  const body = (await response.json()) as {
    ok?: boolean;
    data?: WalletPaymentConfirmationReadback;
  };
  return body.ok === true ? body.data : undefined;
}

function writePreWalletTranscript(args: {
  instruction: PaymentInstruction;
  payer: PaymentApprovalRequestOutput;
  walletUrl: string;
}): void {
  process.stdout.write(
    [
      "AFAL MetaMask Agent Payment Demo Transcript",
      "",
      `1. user -> payer-agent: "${args.instruction.rawMessage}"`,
      `2. payer-agent parsed: ${args.instruction.amount} ${args.instruction.asset} on ${args.instruction.chain} to ${args.instruction.payeeAddress}`,
      `3. payer-agent -> AFAL: requestPaymentApproval(actionRef=${args.payer.intent.intentId})`,
      `4. AFAL -> payer-agent: pending approval ${args.payer.approvalSession.approvalSessionId}, reserved ${args.payer.updatedBudget?.reservedAmount ?? "n/a"} ${args.instruction.asset}, available ${args.payer.updatedBudget?.availableAmount ?? "n/a"}`,
      `5. payment-rail -> wallet: open MetaMask URL and send ${args.instruction.amount} ${args.instruction.asset}`,
      args.walletUrl,
      "",
    ].join("\n")
  );
}

function writeFinalTranscript(args: {
  instruction: PaymentInstruction;
  payer: PaymentApprovalRequestOutput;
  approval?: ApprovalAgentResult;
  payee: PayeeAgentResult;
  walletUrl: string;
  walletConfirmation?: WalletPaymentConfirmationReadback;
}): void {
  const settlement = args.payee.response.settlement;
  const receipt = args.payee.response.paymentReceipt;
  const verification = args.walletConfirmation?.verification;
  const receiptEvidence = receipt?.evidence as Record<string, unknown> | undefined;
  process.stdout.write(
    [
      "",
      "AFAL Settlement Result",
      "",
      `6. trusted-surface -> AFAL: ${args.approval?.summary.result ?? "not-auto-approved"} ${args.approval?.summary.approvalSessionRef ?? args.payer.approvalSession.approvalSessionId}`,
      `7. payment-rail -> AFAL: wallet confirmation ${args.walletConfirmation?.status ?? "n/a"} txHash=${args.walletConfirmation?.txHash ?? settlement?.txHash ?? "n/a"}`,
      `8. payment-rail onchain verification: ${verification?.ok ? "ok" : "n/a"}, chainId=${verification?.chainId ?? args.walletConfirmation?.chainId ?? "n/a"}, logIndex=${verification?.logIndex ?? "n/a"}`,
      `9. AFAL -> payment-rail: execute approved action ${args.payer.intent.intentId}`,
      `10. AFAL -> payer/payee agents: receipt=${receipt?.receiptId ?? args.payee.summary.receiptRef ?? "n/a"}, status=${args.payee.summary.intentStatus}`,
      `11. AFAL receipt evidence: txHash=${receiptEvidence?.txHash ?? settlement?.txHash ?? "n/a"}, amount=${receiptEvidence?.amount ?? settlement?.amount ?? args.instruction.amount} ${receiptEvidence?.asset ?? settlement?.asset ?? args.instruction.asset}`,
      `12. payee-agent -> AFAL: verified amount=${settlement?.amount ?? args.instruction.amount} ${settlement?.asset ?? args.instruction.asset}, chain=${settlement?.chain ?? args.instruction.chain}, settlement=${args.payee.summary.settlementRef ?? "n/a"}`,
      "",
      "Demo Summary",
      `actionRef: ${args.payer.intent.intentId}`,
      `approvalSessionRef: ${args.payer.approvalSession.approvalSessionId}`,
      `walletUrl: ${args.walletUrl}`,
      `finalIntentStatus: ${args.payee.summary.intentStatus}`,
      `settlementRef: ${args.payee.summary.settlementRef ?? "n/a"}`,
      `receiptRef: ${args.payee.summary.receiptRef ?? "n/a"}`,
      `onchainVerification: ${verification?.ok ? "ok" : "n/a"}`,
      `verifiedChainId: ${verification?.chainId ?? args.walletConfirmation?.chainId ?? "n/a"}`,
      `verifiedLogIndex: ${verification?.logIndex ?? "n/a"}`,
      `txHash: ${settlement?.txHash ?? "n/a"}`,
      "",
    ].join("\n")
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const instruction = parsePaymentInstruction(args);
  const timeline: DemoTimelineEvent[] = [
    {
      actor: "user",
      event: "message_to_payer_agent",
      detail: {
        message: instruction.rawMessage,
      },
    },
    {
      actor: "payer-agent",
      event: "parsed_payment_instruction",
      detail: {
        payeeAgentId: instruction.payeeAgentId,
        payeeAddress: instruction.payeeAddress,
        amount: instruction.amount,
        asset: instruction.asset,
        chain: instruction.chain,
      },
    },
  ];

  const payer = await requestPaymentApproval({
    baseUrl: args.baseUrl,
    clientId: args.clientId,
    signingKey: args.signingKey,
    instruction,
  });
  timeline.push({
    actor: "afal",
    event: "payment_intent_pending_approval",
    detail: {
      actionRef: payer.intent.intentId,
      approvalSessionRef: payer.approvalSession.approvalSessionId,
      decisionRef: payer.initialDecision.decisionId,
      challengeRef: payer.challenge.challengeId,
      reservedAmount: payer.updatedBudget?.reservedAmount,
      availableAmount: payer.updatedBudget?.availableAmount,
    },
  });

  const walletUrl = buildWalletDemoUrl({
    walletDemoUrl: args.walletDemoUrl,
    actionRef: payer.intent.intentId,
    instruction,
  });
  timeline.push({
    actor: "payment-rail",
    event: "wallet_transfer_required",
    detail: {
      walletUrl,
      tokenAddress: instruction.tokenAddress,
      amount: instruction.amount,
      payeeAddress: instruction.payeeAddress,
    },
  });

  if (args.outputMode === "transcript") {
    writePreWalletTranscript({ instruction, payer, walletUrl });
  } else {
    process.stdout.write(`${JSON.stringify({ timeline }, null, 2)}\n`);
  }

  if (!args.assumeWalletConfirmed) {
    await waitForWalletConfirmation(
      `Open this wallet demo URL, send the Base Sepolia USDC transfer, then press Enter after confirmation.ok=true:\n${walletUrl}\n`
    );
  }

  const walletConfirmation = await readWalletPaymentConfirmation({
    walletDemoUrl: args.walletDemoUrl,
    actionRef: payer.intent.intentId,
  });
  timeline.push({
    actor: "payment-rail",
    event: "wallet_confirmation_readback",
    detail: {
      actionRef: payer.intent.intentId,
      txHash: walletConfirmation?.txHash,
      status: walletConfirmation?.status,
      verification: walletConfirmation?.verification,
    },
  });

  let approval: ApprovalAgentResult | undefined;
  if (args.autoApprove) {
    const approvalClient = createAfalHttpClient(args.baseUrl);
    approval = await runApprovalAgent(approvalClient, {
      approvalSessionRef: payer.approvalSession.approvalSessionId,
      comment: "Approved in prompt-driven MetaMask agent payment demo",
    });
    timeline.push({
      actor: "trusted-surface",
      event: "approved_and_resumed",
      detail: {
        approvalSessionRef: approval.summary.approvalSessionRef,
        result: approval.summary.result,
        finalIntentStatus: approval.summary.finalIntentStatus,
        settlementRef: approval.summary.settlementRef,
        receiptRef: approval.summary.receiptRef,
      },
    });
  }

  const payeeClient = createAfalHttpClient(args.baseUrl, {
    externalClientAuth: {
      clientId: args.clientId,
      signingKey: args.signingKey,
    },
  });
  const payee: PayeeAgentResult = await runPayeeAgent(payeeClient, {
    actionRef: payer.intent.intentId,
  });
  timeline.push({
    actor: "payee-agent",
    event: "read_afal_action_status",
    detail: {
      actionRef: payee.summary.actionRef,
      intentStatus: payee.summary.intentStatus,
      settlementRef: payee.summary.settlementRef,
      receiptRef: payee.summary.receiptRef,
      settlement: payee.response.settlement,
      paymentReceipt: payee.response.paymentReceipt,
    },
  });

  if (args.outputMode === "transcript") {
    writeFinalTranscript({ instruction, payer, approval, payee, walletUrl, walletConfirmation });
  } else {
    process.stdout.write(
      `${JSON.stringify(
        {
          summary: {
            actionRef: payer.intent.intentId,
            approvalSessionRef: payer.approvalSession.approvalSessionId,
            walletUrl,
            finalIntentStatus: payee.summary.intentStatus,
            settlementRef: payee.summary.settlementRef,
            receiptRef: payee.summary.receiptRef,
          },
          instruction,
          payer,
          walletConfirmation,
          approval,
          payee,
          timeline,
        },
        null,
        2
      )}\n`
    );
  }
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
