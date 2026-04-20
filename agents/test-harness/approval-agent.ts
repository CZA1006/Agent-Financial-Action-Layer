import { pathToFileURL } from "node:url";

import {
  runTrustedSurfaceStub,
  type TrustedSurfaceStubRunResult,
} from "../../app/trusted-surface/stub";
import { createTrustedSurfaceServiceHttpClient } from "../../app/trusted-surface/server";
import { createAfalHttpClient, type AgentHarnessClient } from "./http-client";

export interface ApprovalAgentResult {
  summary: {
    agentId: string;
    approvalSessionRef: string;
    result: string;
    resumedAction: boolean;
    finalIntentStatus?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  response: TrustedSurfaceStubRunResult;
}

export async function runApprovalAgent(
  client: AgentHarnessClient,
  options: {
    approvalSessionRef: string;
    requestRefPrefix?: string;
    result?: "approved" | "rejected" | "expired" | "cancelled";
    comment?: string;
    resumeAction?: boolean;
  }
): Promise<ApprovalAgentResult> {
  const response = await runTrustedSurfaceStub(client, {
    approvalSessionRef: options.approvalSessionRef,
    requestRefPrefix: options.requestRefPrefix ?? "req-agent-approval",
    decidedAt: "2026-03-24T12:07:00Z",
    result: options.result,
    comment: options.comment ?? "Approved via runtime-agent harness",
    resumeAction: options.resumeAction,
  });

  return {
    summary: {
      agentId: response.approvalResult.approvedBy,
      approvalSessionRef: response.summary.approvalSessionRef,
      result: response.summary.result,
      resumedAction: response.summary.resumedAction,
      finalIntentStatus: response.summary.finalIntentStatus,
      settlementRef: response.summary.settlementRef,
      receiptRef: response.summary.receiptRef,
    },
    response,
  };
}

export async function runApprovalAgentViaTrustedSurfaceService(
  trustedSurfaceUrl: string,
  options: {
    approvalSessionRef: string;
    requestRefPrefix?: string;
    result?: "approved" | "rejected" | "expired" | "cancelled";
    comment?: string;
    resumeAction?: boolean;
  }
): Promise<ApprovalAgentResult> {
  const response = await createTrustedSurfaceServiceHttpClient(trustedSurfaceUrl).reviewApprovalSession({
    requestRef: `${options.requestRefPrefix ?? "req-agent-approval"}-service`,
    input: {
      approvalSessionRef: options.approvalSessionRef,
      requestRefPrefix: options.requestRefPrefix ?? "req-agent-approval",
      result: options.result,
      decidedAt: "2026-03-24T12:07:00Z",
      comment: options.comment ?? "Approved via runtime-agent harness",
      resumeAction: options.resumeAction,
    },
  });

  return {
    summary: {
      agentId: response.approvalResult.approvedBy,
      approvalSessionRef: response.summary.approvalSessionRef,
      result: response.summary.result,
      resumedAction: response.summary.resumedAction,
      finalIntentStatus: response.summary.finalIntentStatus,
      settlementRef: response.summary.settlementRef,
      receiptRef: response.summary.receiptRef,
    },
    response,
  };
}

function parseArgs(argv: string[]): {
  baseUrl?: string;
  trustedSurfaceUrl?: string;
  approvalSessionRef: string;
} {
  let baseUrl: string | undefined;
  let trustedSurfaceUrl: string | undefined;
  let approvalSessionRef = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      baseUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--trusted-surface-url") {
      trustedSurfaceUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--approval-session-ref") {
      approvalSessionRef = argv[index + 1] ?? "";
      index += 1;
    }
  }

  if ((!baseUrl && !trustedSurfaceUrl) || !approvalSessionRef) {
    throw new Error(
      "approval-agent requires --approval-session-ref and either --base-url or --trusted-surface-url"
    );
  }

  return {
    baseUrl,
    trustedSurfaceUrl,
    approvalSessionRef,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = args.trustedSurfaceUrl
    ? await runApprovalAgentViaTrustedSurfaceService(args.trustedSurfaceUrl, {
        approvalSessionRef: args.approvalSessionRef,
      })
    : await runApprovalAgent(createAfalHttpClient(args.baseUrl ?? ""), {
        approvalSessionRef: args.approvalSessionRef,
      });
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
