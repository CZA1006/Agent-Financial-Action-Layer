import { pathToFileURL } from "node:url";

import type { ApprovalResult, ApprovalSession, Did, IdRef, Timestamp } from "../../sdk/types";
import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import type { AfalApiFailure } from "../../backend/afal/api";
import type {
  AfalModuleService,
  ApplyApprovalResultOutput,
} from "../../backend/afal/service";
import type { ResumeApprovedActionOutput } from "../../backend/afal/interfaces";

export interface TrustedSurfaceStubClient {
  getApprovalSession(args: {
    requestRef: string;
    approvalSessionRef: IdRef;
  }): Promise<ApprovalSession>;
  applyApprovalResult(args: {
    requestRef: string;
    approvalSessionRef: IdRef;
    result: ApprovalResult;
  }): Promise<ApplyApprovalResultOutput>;
  resumeApprovedAction(args: {
    requestRef: string;
    approvalSessionRef: IdRef;
  }): Promise<ResumeApprovedActionOutput>;
}

export interface TrustedSurfaceStubOptions {
  approvalSessionRef: IdRef;
  requestRefPrefix?: string;
  result?: ApprovalResult["result"];
  approvedBy?: string;
  approvalChannel?: string;
  stepUpAuthUsed?: boolean;
  comment?: string;
  approvalResultId?: IdRef;
  approvalReceiptRef?: IdRef;
  decidedAt?: Timestamp;
  resumeAction?: boolean;
}

export interface TrustedSurfaceStubRunResult {
  summary: {
    approvalSessionRef: IdRef;
    actionRef: IdRef;
    actionType: string;
    result: ApprovalResult["result"];
    resumedAction: boolean;
    finalIntentStatus?: string;
    settlementRef?: IdRef;
    receiptRef?: IdRef;
  };
  session: ApprovalSession;
  approvalResult: ApprovalResult;
  applied: ApplyApprovalResultOutput;
  resumed?: ResumeApprovedActionOutput;
}

function deriveChallengeSuffix(session: ApprovalSession): string {
  return session.challengeRef.replace(/^chall-/, "");
}

function buildDefaultComment(
  result: ApprovalResult["result"],
  session: ApprovalSession
): string | undefined {
  if (result === "approved") {
    return `Approved ${session.actionType} action via trusted surface`;
  }
  if (result === "rejected") {
    return `Rejected ${session.actionType} action via trusted surface`;
  }
  if (result === "cancelled") {
    return `Cancelled ${session.actionType} action via trusted surface`;
  }
  return undefined;
}

export function buildTrustedSurfaceApprovalResult(
  session: ApprovalSession,
  options: Omit<TrustedSurfaceStubOptions, "approvalSessionRef" | "requestRefPrefix" | "resumeAction"> = {}
): ApprovalResult {
  const suffix = deriveChallengeSuffix(session);
  const result = options.result ?? "approved";

  return {
    approvalResultId: options.approvalResultId ?? (`apr-${suffix}` as IdRef),
    challengeRef: session.challengeRef,
    actionRef: session.actionRef,
    result,
    approvedBy: (options.approvedBy ?? "did:afal:owner:alice-01") as Did,
    approvalChannel: options.approvalChannel ?? session.trustedSurfaceRef,
    stepUpAuthUsed: options.stepUpAuthUsed ?? true,
    comment: options.comment ?? buildDefaultComment(result, session),
    approvalReceiptRef:
      options.approvalReceiptRef ??
      (result === "approved" ? (`rcpt-approval-${suffix}` as IdRef) : undefined),
    decidedAt: options.decidedAt ?? new Date().toISOString(),
  };
}

export async function runTrustedSurfaceStub(
  client: TrustedSurfaceStubClient,
  options: TrustedSurfaceStubOptions
): Promise<TrustedSurfaceStubRunResult> {
  const requestRefPrefix = options.requestRefPrefix ?? "req-trusted-surface";
  const session = await client.getApprovalSession({
    requestRef: `${requestRefPrefix}-get`,
    approvalSessionRef: options.approvalSessionRef,
  });

  const approvalResult = buildTrustedSurfaceApprovalResult(session, options);
  const applied = await client.applyApprovalResult({
    requestRef: `${requestRefPrefix}-apply`,
    approvalSessionRef: options.approvalSessionRef,
    result: approvalResult,
  });

  const shouldResume = options.resumeAction !== false;
  const resumed = shouldResume
    ? await client.resumeApprovedAction({
        requestRef: `${requestRefPrefix}-resume`,
        approvalSessionRef: options.approvalSessionRef,
      })
    : undefined;

  return {
    summary: {
      approvalSessionRef: options.approvalSessionRef,
      actionRef: session.actionRef,
      actionType: session.actionType,
      result: approvalResult.result,
      resumedAction: shouldResume,
      finalIntentStatus: resumed?.intent.status,
      settlementRef: resumed?.settlement.settlementId,
      receiptRef:
        resumed && "paymentReceipt" in resumed
          ? resumed.paymentReceipt.receiptId
          : resumed && "resourceReceipt" in resumed
            ? resumed.resourceReceipt.receiptId
            : undefined,
    },
    session,
    approvalResult,
    applied,
    resumed,
  };
}

async function parseAfalJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T | AfalApiFailure;

  if (
    typeof body === "object" &&
    body !== null &&
    "ok" in body &&
    body.ok === false &&
    "error" in body
  ) {
    throw new Error(
      `AFAL request failed: ${body.capability} [${body.statusCode} ${body.error.code}] ${body.error.message}`
    );
  }

  return body as T;
}

export function createTrustedSurfaceHttpClient(baseUrl: string): TrustedSurfaceStubClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    async getApprovalSession(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getApprovalSession}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
          },
        }),
      });

      const body = await parseAfalJsonResponse<{
        ok: true;
        data: ApprovalSession;
      }>(response);

      return body.data;
    },

    async applyApprovalResult(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.applyApprovalResult}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
            result: args.result,
          },
        }),
      });

      const body = await parseAfalJsonResponse<{
        ok: true;
        data: ApplyApprovalResultOutput;
      }>(response);

      return body.data;
    },

    async resumeApprovedAction(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.resumeApprovedAction}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
          },
        }),
      });

      const body = await parseAfalJsonResponse<{
        ok: true;
        data: ResumeApprovedActionOutput;
      }>(response);

      return body.data;
    },
  };
}

export function createTrustedSurfaceServiceClient(service: AfalModuleService): TrustedSurfaceStubClient {
  return {
    getApprovalSession: async ({ requestRef, approvalSessionRef }) =>
      service.getApprovalSession({
        capability: "getApprovalSession",
        requestRef,
        input: { approvalSessionRef },
      }),
    applyApprovalResult: async ({ requestRef, approvalSessionRef, result }) =>
      service.applyApprovalResult({
        capability: "applyApprovalResult",
        requestRef,
        input: { approvalSessionRef, result },
      }),
    resumeApprovedAction: async ({ requestRef, approvalSessionRef }) =>
      service.resumeApprovedAction({
        capability: "resumeApprovedAction",
        requestRef,
        input: { approvalSessionRef },
      }),
  };
}

function readOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function assertOption(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`Missing required option: ${flag}`);
  }

  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const baseUrl = readOption(args, "--base-url") ?? "http://127.0.0.1:3212";
  const approvalSessionRef = assertOption(readOption(args, "--approval-session-ref"), "--approval-session-ref");
  const result = (readOption(args, "--result") ?? "approved") as ApprovalResult["result"];
  const requestRefPrefix = readOption(args, "--request-ref-prefix");
  const approvedBy = readOption(args, "--approved-by");
  const approvalChannel = readOption(args, "--approval-channel");
  const comment = readOption(args, "--comment");
  const approvalResultId = readOption(args, "--approval-result-id") as IdRef | undefined;
  const approvalReceiptRef = readOption(args, "--approval-receipt-ref") as IdRef | undefined;
  const decidedAt = readOption(args, "--decided-at");
  const stepUpAuthUsed = hasFlag(args, "--no-step-up-auth") ? false : true;
  const resumeAction = hasFlag(args, "--skip-resume-action") ? false : true;

  const client = createTrustedSurfaceHttpClient(baseUrl);
  const output = await runTrustedSurfaceStub(client, {
    approvalSessionRef,
    requestRefPrefix,
    result,
    approvedBy,
    approvalChannel,
    stepUpAuthUsed,
    comment,
    approvalResultId,
    approvalReceiptRef,
    decidedAt,
    resumeAction,
  });

  console.log(JSON.stringify(output, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
