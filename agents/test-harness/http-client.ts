import { createHash } from "node:crypto";

import type {
  ActionStatusOutput,
  PaymentApprovalRequestOutput,
  ResourceApprovalRequestOutput,
  ResumeApprovedActionOutput,
} from "../../backend/afal/interfaces";
import type { AfalAdminAuditEntry } from "../../backend/afal/admin-audit";
import type {
  AfalApiFailure,
  AfalApiSuccess,
} from "../../backend/afal/api/types";
import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import type { ApprovalResult, ApprovalSession, IdRef } from "../../sdk/types";
import type {
  ApplyApprovalResultOutput,
  RunNotificationWorkerOutput,
} from "../../backend/afal/service";
import type {
  SettlementNotificationDeliveryRecord,
  SettlementNotificationOutboxWorkerStatus,
} from "../../backend/afal/notifications";
import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";

export interface AgentHarnessClient {
  requestPaymentApproval(args?: {
    requestRef?: string;
    monetaryBudgetRef?: IdRef;
  }): Promise<PaymentApprovalRequestOutput>;
  requestResourceApproval(args?: {
    requestRef?: string;
    resourceBudgetRef?: IdRef;
    resourceQuotaRef?: IdRef;
  }): Promise<ResourceApprovalRequestOutput>;
  getActionStatus(args: {
    requestRef: string;
    actionRef: IdRef;
  }): Promise<ActionStatusOutput>;
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
  getNotificationDelivery(args: {
    requestRef: string;
    notificationId: IdRef;
  }): Promise<SettlementNotificationDeliveryRecord>;
  listNotificationDeliveries(args: { requestRef: string }): Promise<
    SettlementNotificationDeliveryRecord[]
  >;
  getAdminAuditEntry(args: {
    requestRef: string;
    auditId: IdRef;
  }): Promise<AfalAdminAuditEntry>;
  listAdminAuditEntries(args: { requestRef: string }): Promise<AfalAdminAuditEntry[]>;
  getNotificationWorkerStatus(args: {
    requestRef: string;
  }): Promise<SettlementNotificationOutboxWorkerStatus>;
  runNotificationWorker(args: { requestRef: string }): Promise<RunNotificationWorkerOutput>;
}

export interface AgentHarnessClientOptions {
  operatorToken?: string;
  operatorHeaderName?: string;
  externalClientAuth?: {
    clientId: string;
    signingKey: string;
    clientIdHeaderName?: string;
    requestTimestampHeaderName?: string;
    signatureHeaderName?: string;
    now?: () => Date;
  };
}

export interface NodeTransportRequest {
  method?: string;
  url?: string;
  bodyText?: string;
  headers?: Record<string, string | undefined>;
}

export interface NodeTransportResponse {
  statusCode: number;
  bodyText: string;
}

export type NodeTransportHandler = (
  request: NodeTransportRequest
) => Promise<NodeTransportResponse>;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertSuccess<T>(body: T | AfalApiFailure): T {
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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T | AfalApiFailure;
  return assertSuccess(body);
}

function buildCanonicalPaymentApprovalRequest(args?: {
  requestRef?: string;
  monetaryBudgetRef?: IdRef;
}) {
  const requestRef = args?.requestRef ?? paymentFlowFixtures.capabilityResponse.requestRef;
  const monetaryBudgetRef =
    args?.monetaryBudgetRef ?? paymentFlowFixtures.monetaryBudgetInitial.budgetId;

  return {
    requestRef,
    input: {
      requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef,
    },
  };
}

function buildCanonicalResourceApprovalRequest(args?: {
  requestRef?: string;
  resourceBudgetRef?: IdRef;
  resourceQuotaRef?: IdRef;
}) {
  const requestRef = args?.requestRef ?? resourceFlowFixtures.capabilityResponse.requestRef;
  const resourceBudgetRef =
    args?.resourceBudgetRef ?? resourceFlowFixtures.resourceBudgetInitial.budgetId;
  const resourceQuotaRef =
    args?.resourceQuotaRef ?? resourceFlowFixtures.resourceQuotaInitial.quotaId;

  return {
    requestRef,
    input: {
      requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef,
      resourceQuotaRef,
    },
  };
}

export function createAfalHttpClient(
  baseUrl: string,
  options?: AgentHarnessClientOptions
): AgentHarnessClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const operatorHeaderName = options?.operatorHeaderName ?? "x-afal-operator-token";
  const externalClientAuth = options?.externalClientAuth;
  const externalClientIdHeaderName =
    externalClientAuth?.clientIdHeaderName ?? "x-afal-client-id";
  const externalClientTimestampHeaderName =
    externalClientAuth?.requestTimestampHeaderName ?? "x-afal-request-timestamp";
  const externalClientSignatureHeaderName =
    externalClientAuth?.signatureHeaderName ?? "x-afal-request-signature";

  function withOperatorHeaders(headers: Record<string, string>): Record<string, string> {
    if (!options?.operatorToken) {
      return headers;
    }

    return {
      ...headers,
      [operatorHeaderName]: options.operatorToken,
    };
  }

  function withExternalClientHeaders(
    headers: Record<string, string>,
    requestRef: string
  ): Record<string, string> {
    if (!externalClientAuth) {
      return headers;
    }

    const timestamp = (externalClientAuth.now ?? (() => new Date()))().toISOString();
    return {
      ...headers,
      [externalClientIdHeaderName]: externalClientAuth.clientId,
      [externalClientTimestampHeaderName]: timestamp,
      [externalClientSignatureHeaderName]: sha256(
        `${externalClientAuth.clientId}:${requestRef}:${timestamp}:${externalClientAuth.signingKey}`
      ),
    };
  }

  return {
    async requestPaymentApproval(args) {
      const request = buildCanonicalPaymentApprovalRequest(args);
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.requestPaymentApproval}`,
        {
          method: "POST",
          headers: withOperatorHeaders(
            withExternalClientHeaders(
              {
                "content-type": "application/json",
              },
              request.requestRef
            )
          ),
          body: JSON.stringify(request),
        }
      );

      const body = await parseJsonResponse<AfalApiSuccess<PaymentApprovalRequestOutput>>(response);
      return body.data;
    },

    async requestResourceApproval(args) {
      const request = buildCanonicalResourceApprovalRequest(args);
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.requestResourceApproval}`,
        {
          method: "POST",
          headers: withOperatorHeaders(
            withExternalClientHeaders(
              {
                "content-type": "application/json",
              },
              request.requestRef
            )
          ),
          body: JSON.stringify(request),
        }
      );

      const body = await parseJsonResponse<AfalApiSuccess<ResourceApprovalRequestOutput>>(response);
      return body.data;
    },

    async getActionStatus(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getActionStatus}`, {
        method: "POST",
        headers: withOperatorHeaders(
          withExternalClientHeaders(
            {
              "content-type": "application/json",
            },
            args.requestRef
          )
        ),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            actionRef: args.actionRef,
          },
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<ActionStatusOutput>>(response);
      return body.data;
    },

    async getApprovalSession(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getApprovalSession}`, {
        method: "POST",
        headers: withOperatorHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
          },
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<ApprovalSession>>(response);
      return body.data;
    },

    async applyApprovalResult(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.applyApprovalResult}`, {
        method: "POST",
        headers: withOperatorHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
            result: args.result,
          },
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<ApplyApprovalResultOutput>>(response);
      return body.data;
    },

    async resumeApprovedAction(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.resumeApprovedAction}`, {
        method: "POST",
        headers: withOperatorHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
          },
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<ResumeApprovedActionOutput>>(response);
      return body.data;
    },

    async getNotificationDelivery(args) {
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getNotificationDelivery}`,
        {
          method: "POST",
          headers: withOperatorHeaders({
            "content-type": "application/json",
          }),
          body: JSON.stringify({
            requestRef: args.requestRef,
            input: {
              notificationId: args.notificationId,
            },
          }),
        }
      );

      const body =
        await parseJsonResponse<AfalApiSuccess<SettlementNotificationDeliveryRecord>>(response);
      return body.data;
    },

    async listNotificationDeliveries(args) {
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.listNotificationDeliveries}`,
        {
          method: "POST",
          headers: withOperatorHeaders({
            "content-type": "application/json",
          }),
          body: JSON.stringify({
            requestRef: args.requestRef,
            input: {},
          }),
        }
      );

      const body =
        await parseJsonResponse<AfalApiSuccess<SettlementNotificationDeliveryRecord[]>>(response);
      return body.data;
    },

    async getAdminAuditEntry(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getAdminAuditEntry}`, {
        method: "POST",
        headers: withOperatorHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {
            auditId: args.auditId,
          },
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<AfalAdminAuditEntry>>(response);
      return body.data;
    },

    async listAdminAuditEntries(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.listAdminAuditEntries}`, {
        method: "POST",
        headers: withOperatorHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {},
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<AfalAdminAuditEntry[]>>(response);
      return body.data;
    },

    async getNotificationWorkerStatus(args) {
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getNotificationWorkerStatus}`,
        {
          method: "POST",
          headers: withOperatorHeaders({
            "content-type": "application/json",
          }),
          body: JSON.stringify({
            requestRef: args.requestRef,
            input: {},
          }),
        }
      );

      const body =
        await parseJsonResponse<AfalApiSuccess<SettlementNotificationOutboxWorkerStatus>>(response);
      return body.data;
    },

    async runNotificationWorker(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.runNotificationWorker}`, {
        method: "POST",
        headers: withOperatorHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          requestRef: args.requestRef,
          input: {},
        }),
      });

      const body = await parseJsonResponse<AfalApiSuccess<RunNotificationWorkerOutput>>(response);
      return body.data;
    },
  };
}

export function createAfalNodeTransportClient(
  handler: NodeTransportHandler,
  options?: AgentHarnessClientOptions
): AgentHarnessClient {
  const operatorHeaderName = options?.operatorHeaderName ?? "x-afal-operator-token";

  async function request<T>(path: string, payload: unknown): Promise<T> {
    const response = await handler({
      method: "POST",
      url: path,
      bodyText: JSON.stringify(payload),
      headers: options?.operatorToken
        ? {
            [operatorHeaderName]: options.operatorToken,
          }
        : undefined,
    });
    const body = JSON.parse(response.bodyText) as T | AfalApiFailure;
    return assertSuccess(body);
  }

  return {
    async requestPaymentApproval(args) {
      const body = await request<AfalApiSuccess<PaymentApprovalRequestOutput>>(
        AFAL_HTTP_ROUTES.requestPaymentApproval,
        buildCanonicalPaymentApprovalRequest(args)
      );
      return body.data;
    },

    async requestResourceApproval(args) {
      const body = await request<AfalApiSuccess<ResourceApprovalRequestOutput>>(
        AFAL_HTTP_ROUTES.requestResourceApproval,
        buildCanonicalResourceApprovalRequest(args)
      );
      return body.data;
    },

    async getActionStatus(args) {
      const body = await request<AfalApiSuccess<ActionStatusOutput>>(AFAL_HTTP_ROUTES.getActionStatus, {
        requestRef: args.requestRef,
        input: {
          actionRef: args.actionRef,
        },
      });
      return body.data;
    },

    async getApprovalSession(args) {
      const body = await request<AfalApiSuccess<ApprovalSession>>(AFAL_HTTP_ROUTES.getApprovalSession, {
        requestRef: args.requestRef,
        input: {
          approvalSessionRef: args.approvalSessionRef,
        },
      });
      return body.data;
    },

    async applyApprovalResult(args) {
      const body = await request<AfalApiSuccess<ApplyApprovalResultOutput>>(
        AFAL_HTTP_ROUTES.applyApprovalResult,
        {
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
            result: args.result,
          },
        }
      );
      return body.data;
    },

    async resumeApprovedAction(args) {
      const body = await request<AfalApiSuccess<ResumeApprovedActionOutput>>(
        AFAL_HTTP_ROUTES.resumeApprovedAction,
        {
          requestRef: args.requestRef,
          input: {
            approvalSessionRef: args.approvalSessionRef,
          },
        }
      );
      return body.data;
    },

    async getNotificationDelivery(args) {
      const body = await request<AfalApiSuccess<SettlementNotificationDeliveryRecord>>(
        AFAL_HTTP_ROUTES.getNotificationDelivery,
        {
          requestRef: args.requestRef,
          input: {
            notificationId: args.notificationId,
          },
        }
      );
      return body.data;
    },

    async listNotificationDeliveries(args) {
      const body = await request<AfalApiSuccess<SettlementNotificationDeliveryRecord[]>>(
        AFAL_HTTP_ROUTES.listNotificationDeliveries,
        {
          requestRef: args.requestRef,
          input: {},
        }
      );
      return body.data;
    },

    async getAdminAuditEntry(args) {
      const body = await request<AfalApiSuccess<AfalAdminAuditEntry>>(
        AFAL_HTTP_ROUTES.getAdminAuditEntry,
        {
          requestRef: args.requestRef,
          input: {
            auditId: args.auditId,
          },
        }
      );
      return body.data;
    },

    async listAdminAuditEntries(args) {
      const body = await request<AfalApiSuccess<AfalAdminAuditEntry[]>>(
        AFAL_HTTP_ROUTES.listAdminAuditEntries,
        {
          requestRef: args.requestRef,
          input: {},
        }
      );
      return body.data;
    },

    async getNotificationWorkerStatus(args) {
      const body = await request<AfalApiSuccess<SettlementNotificationOutboxWorkerStatus>>(
        AFAL_HTTP_ROUTES.getNotificationWorkerStatus,
        {
          requestRef: args.requestRef,
          input: {},
        }
      );
      return body.data;
    },

    async runNotificationWorker(args) {
      const body = await request<AfalApiSuccess<RunNotificationWorkerOutput>>(
        AFAL_HTTP_ROUTES.runNotificationWorker,
        {
          requestRef: args.requestRef,
          input: {},
        }
      );
      return body.data;
    },
  };
}
