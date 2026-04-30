import { pathToFileURL } from "node:url";

import { runAfalPaymentTool, type AfalPaymentToolArgs } from "./afal-payment-tool";
import { runApproveResumeTool, type ApproveResumeToolArgs } from "./approve-resume-tool";
import {
  runProviderReceiptGate,
  type ProviderReceiptGateArgs,
} from "./provider-receipt-gate";

export type AgentRuntimeToolCommand = "request-payment" | "approve-resume" | "provider-gate";

export interface AgentRuntimeToolResult {
  tool: "afal.agent_runtime_tool";
  command: AgentRuntimeToolCommand;
  result: unknown;
}

export interface AgentRuntimeToolRunners {
  requestPayment(args: AfalPaymentToolArgs): Promise<unknown>;
  approveResume(args: ApproveResumeToolArgs): Promise<unknown>;
  providerGate(args: ProviderReceiptGateArgs): Promise<unknown>;
}

const defaultRunners: AgentRuntimeToolRunners = {
  requestPayment: runAfalPaymentTool,
  approveResume: runApproveResumeTool,
  providerGate: runProviderReceiptGate,
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
    value === "provider-gate"
  ) {
    return value;
  }
  throw new Error(
    'First argument must be one of "request-payment", "approve-resume", or "provider-gate"'
  );
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
