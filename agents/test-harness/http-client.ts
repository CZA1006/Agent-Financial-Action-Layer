import type {
  ActionStatusOutput,
  PaymentApprovalRequestOutput,
  ResourceApprovalRequestOutput,
  ResumeApprovedActionOutput,
} from "../../backend/afal/interfaces";
import type {
  AfalApiFailure,
  AfalApiSuccess,
} from "../../backend/afal/api/types";
import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import type { ApprovalResult, ApprovalSession, IdRef } from "../../sdk/types";
import type { ApplyApprovalResultOutput } from "../../backend/afal/service";
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
}

export interface NodeTransportRequest {
  method?: string;
  url?: string;
  bodyText?: string;
}

export interface NodeTransportResponse {
  statusCode: number;
  bodyText: string;
}

export type NodeTransportHandler = (
  request: NodeTransportRequest
) => Promise<NodeTransportResponse>;

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

export function createAfalHttpClient(baseUrl: string): AgentHarnessClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    async requestPaymentApproval(args) {
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.requestPaymentApproval}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(buildCanonicalPaymentApprovalRequest(args)),
        }
      );

      const body = await parseJsonResponse<AfalApiSuccess<PaymentApprovalRequestOutput>>(response);
      return body.data;
    },

    async requestResourceApproval(args) {
      const response = await fetch(
        `${normalizedBaseUrl}${AFAL_HTTP_ROUTES.requestResourceApproval}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(buildCanonicalResourceApprovalRequest(args)),
        }
      );

      const body = await parseJsonResponse<AfalApiSuccess<ResourceApprovalRequestOutput>>(response);
      return body.data;
    },

    async getActionStatus(args) {
      const response = await fetch(`${normalizedBaseUrl}${AFAL_HTTP_ROUTES.getActionStatus}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
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

      const body = await parseJsonResponse<AfalApiSuccess<ApprovalSession>>(response);
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

      const body = await parseJsonResponse<AfalApiSuccess<ApplyApprovalResultOutput>>(response);
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

      const body = await parseJsonResponse<AfalApiSuccess<ResumeApprovedActionOutput>>(response);
      return body.data;
    },
  };
}

export function createAfalNodeTransportClient(handler: NodeTransportHandler): AgentHarnessClient {
  async function request<T>(path: string, payload: unknown): Promise<T> {
    const response = await handler({
      method: "POST",
      url: path,
      bodyText: JSON.stringify(payload),
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
  };
}
