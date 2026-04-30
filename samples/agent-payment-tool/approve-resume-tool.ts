import { pathToFileURL } from "node:url";

import type { ResumeApprovedActionOutput } from "../../backend/afal/interfaces";
import {
  createTrustedSurfaceHttpClient,
  runTrustedSurfaceStub,
  type TrustedSurfaceStubRunResult,
} from "../../app/trusted-surface/stub";

export interface ApproveResumeToolArgs {
  baseUrl: string;
  approvalSessionRef: string;
  comment?: string;
  requestRefPrefix?: string;
}

export interface ApproveResumeToolResult {
  tool: "afal.trusted_surface_approve_resume";
  approvalSessionRef: string;
  actionRef: string;
  result: string;
  resumedAction: boolean;
  finalIntentStatus?: string;
  settlementRef?: string;
  receiptRef?: string;
  txHash?: string;
  deliverableHint: "run_provider_gate" | "not_settled";
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

function parseArgs(argv: string[]): ApproveResumeToolArgs {
  const args: Partial<ApproveResumeToolArgs> = {
    baseUrl: process.env.AFAL_BASE_URL,
    approvalSessionRef: process.env.AFAL_APPROVAL_SESSION_REF,
    comment: process.env.AFAL_APPROVAL_COMMENT,
    requestRefPrefix: process.env.AFAL_APPROVAL_REQUEST_REF_PREFIX,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--approval-session-ref") {
      args.approvalSessionRef = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--comment") {
      args.comment = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--request-ref-prefix") {
      args.requestRefPrefix = getArgValue(argv, index);
      index += 1;
    }
  }

  return {
    baseUrl: required("AFAL_BASE_URL or --base-url", args.baseUrl),
    approvalSessionRef: required(
      "AFAL_APPROVAL_SESSION_REF or --approval-session-ref",
      args.approvalSessionRef
    ),
    comment: args.comment,
    requestRefPrefix: args.requestRefPrefix,
  };
}

function extractTxHash(resumed: ResumeApprovedActionOutput | undefined): string | undefined {
  if (!resumed || !("paymentReceipt" in resumed)) {
    return undefined;
  }
  const txHash = resumed.paymentReceipt.evidence.txHash ?? resumed.settlement.txHash;
  return typeof txHash === "string" ? txHash : undefined;
}

export function summarizeApproveResume(
  run: TrustedSurfaceStubRunResult
): ApproveResumeToolResult {
  const txHash = extractTxHash(run.resumed);
  return {
    tool: "afal.trusted_surface_approve_resume",
    approvalSessionRef: run.summary.approvalSessionRef,
    actionRef: run.summary.actionRef,
    result: run.summary.result,
    resumedAction: run.summary.resumedAction,
    finalIntentStatus: run.summary.finalIntentStatus,
    settlementRef: run.summary.settlementRef,
    receiptRef: run.summary.receiptRef,
    txHash,
    deliverableHint: run.summary.finalIntentStatus === "settled" ? "run_provider_gate" : "not_settled",
  };
}

export async function runApproveResumeTool(
  args: ApproveResumeToolArgs
): Promise<ApproveResumeToolResult> {
  const run = await runTrustedSurfaceStub(createTrustedSurfaceHttpClient(args.baseUrl), {
    approvalSessionRef: args.approvalSessionRef,
    requestRefPrefix: args.requestRefPrefix ?? "req-agent-payment-approval",
    result: "approved",
    comment: args.comment ?? "Approved by AFAL trusted-surface approval/resume tool",
    resumeAction: true,
  });

  return summarizeApproveResume(run);
}

async function main(): Promise<void> {
  const result = await runApproveResumeTool(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
