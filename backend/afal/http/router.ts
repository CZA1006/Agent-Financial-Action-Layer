import {
  createAfalApiHandlers,
  type AfalApiFailure,
  type AfalApiServiceAdapter,
} from "../api";
import type { PaymentFlowOrchestrator, ResourceFlowOrchestrator } from "../interfaces";
import type {
  ApplyApprovalResultHttpBody,
  AfalHttpRequest,
  AfalHttpResponse,
  AfalHttpResponseBody,
  ExecutePaymentHttpBody,
  GetAdminAuditEntryHttpBody,
  GetActionStatusHttpBody,
  GetApprovalSessionHttpBody,
  GetNotificationDeliveryHttpBody,
  ListAdminAuditEntriesHttpBody,
  ListNotificationDeliveriesHttpBody,
  RedeliverNotificationHttpBody,
  ResumeApprovedActionHttpBody,
  ResumeApprovalSessionHttpBody,
  SettleResourceUsageHttpBody,
} from "./types";
import { AFAL_HTTP_ROUTES } from "./types";

function buildJsonResponse<TBody>(statusCode: number, body: TBody): AfalHttpResponse<TBody> {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body,
  };
}

function buildTransportError(args: {
  capability:
    | "requestPaymentApproval"
    | "executePayment"
    | "requestResourceApproval"
    | "settleResourceUsage"
    | "getActionStatus"
    | "getNotificationDelivery"
    | "listNotificationDeliveries"
    | "getNotificationWorkerStatus"
    | "getAdminAuditEntry"
    | "listAdminAuditEntries"
    | "getApprovalSession"
    | "applyApprovalResult"
    | "redeliverNotification"
    | "startNotificationWorker"
    | "stopNotificationWorker"
    | "runNotificationWorker"
    | "resumeApprovalSession"
    | "resumeApprovedAction";
  requestRef: string;
  statusCode: 400 | 403 | 404;
  code: "bad-request" | "not-found" | "operator-auth-required";
  message: string;
}): AfalApiFailure {
  return {
    ok: false,
    capability: args.capability,
    requestRef: args.requestRef,
    statusCode: args.statusCode,
    error: {
      code: args.code,
      message: args.message,
    },
  };
}

function getHeaderValue(
  headers: Record<string, string | undefined> | undefined,
  headerName: string
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const direct = headers[headerName];
  if (direct !== undefined) {
    return direct;
  }

  return headers[headerName.toLowerCase()];
}

function ensureOperatorAuthorization(args: {
  enabled: boolean;
  token: string;
  headerName: string;
  headers: Record<string, string | undefined> | undefined;
  capability:
    | "getNotificationDelivery"
    | "listNotificationDeliveries"
    | "redeliverNotification"
    | "getNotificationWorkerStatus"
    | "startNotificationWorker"
    | "stopNotificationWorker"
    | "runNotificationWorker"
    | "getAdminAuditEntry"
    | "listAdminAuditEntries";
  requestRef: string;
}): AfalApiFailure | null {
  if (!args.enabled) {
    return null;
  }

  const suppliedToken = getHeaderValue(args.headers, args.headerName);
  if (suppliedToken === args.token) {
    return null;
  }

  return buildTransportError({
    capability: args.capability,
    requestRef: args.requestRef,
    statusCode: 403,
    code: "operator-auth-required",
    message: `Missing or invalid operator token in header "${args.headerName}"`,
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExecutePaymentBody(body: unknown): body is ExecutePaymentHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.requestRef === "string"
  );
}

function isSettleResourceUsageBody(body: unknown): body is SettleResourceUsageHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.requestRef === "string"
  );
}

function isGetApprovalSessionBody(body: unknown): body is GetApprovalSessionHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.approvalSessionRef === "string"
  );
}

function isGetActionStatusBody(body: unknown): body is GetActionStatusHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.actionRef === "string"
  );
}

function isGetNotificationDeliveryBody(body: unknown): body is GetNotificationDeliveryHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.notificationId === "string"
  );
}

function isListNotificationDeliveriesBody(
  body: unknown
): body is ListNotificationDeliveriesHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    (body.input === undefined || isObjectRecord(body.input))
  );
}

function isNotificationWorkerCommandBody(
  body: unknown
): body is ListNotificationDeliveriesHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    (body.input === undefined || isObjectRecord(body.input))
  );
}

function isGetAdminAuditEntryBody(body: unknown): body is GetAdminAuditEntryHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.auditId === "string"
  );
}

function isListAdminAuditEntriesBody(body: unknown): body is ListAdminAuditEntriesHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    (body.input === undefined || isObjectRecord(body.input))
  );
}

function isApplyApprovalResultBody(body: unknown): body is ApplyApprovalResultHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.approvalSessionRef === "string" &&
    isObjectRecord(body.input.result)
  );
}

function isResumeApprovalSessionBody(body: unknown): body is ResumeApprovalSessionHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.approvalSessionRef === "string"
  );
}

function isResumeApprovedActionBody(body: unknown): body is ResumeApprovedActionHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.approvalSessionRef === "string"
  );
}

function isRedeliverNotificationBody(body: unknown): body is RedeliverNotificationHttpBody {
  return (
    isObjectRecord(body) &&
    typeof body.requestRef === "string" &&
    isObjectRecord(body.input) &&
    typeof body.input.notificationId === "string"
  );
}

function ensureRequestRefConsistency(
  outerRequestRef: string,
  inputRequestRef: string,
  capability:
    | "requestPaymentApproval"
    | "executePayment"
    | "requestResourceApproval"
    | "settleResourceUsage"
): AfalApiFailure | null {
  if (outerRequestRef === inputRequestRef) {
    return null;
  }

  return buildTransportError({
    capability,
    requestRef: outerRequestRef,
    statusCode: 400,
    code: "bad-request",
    message: "requestRef must match between the HTTP envelope and capability input",
  });
}

export function createAfalHttpRouter(args?: {
  paymentOrchestrator?: PaymentFlowOrchestrator;
  resourceOrchestrator?: ResourceFlowOrchestrator;
  handlers?: AfalApiServiceAdapter;
  operatorAuth?: {
    token: string;
    headerName?: string;
  };
}) {
  const apiHandlers =
    args?.handlers ??
    createAfalApiHandlers({
      paymentOrchestrator: args?.paymentOrchestrator,
      resourceOrchestrator: args?.resourceOrchestrator,
    });
  const operatorToken = args?.operatorAuth?.token;
  const operatorHeaderName = args?.operatorAuth?.headerName ?? "x-afal-operator-token";
  const operatorAuthEnabled = typeof operatorToken === "string" && operatorToken.length > 0;

  return {
    async handle(request: AfalHttpRequest): Promise<AfalHttpResponse<AfalHttpResponseBody>> {
      if (request.path === AFAL_HTTP_ROUTES.executePayment) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "executePayment",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "executePayment transport only supports POST",
            })
          );
        }

        if (!isExecutePaymentBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "executePayment",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "executePayment request body must include requestRef and input",
            })
          );
        }

        const mismatch = ensureRequestRefConsistency(
          request.body.requestRef,
          request.body.input.requestRef,
          "executePayment"
        );
        if (mismatch) {
          return buildJsonResponse(mismatch.statusCode, mismatch);
        }

        const response = await apiHandlers.handleExecutePayment({
          capability: "executePayment",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.requestPaymentApproval) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "requestPaymentApproval",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "requestPaymentApproval transport only supports POST",
            })
          );
        }

        if (!isExecutePaymentBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "requestPaymentApproval",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "requestPaymentApproval request body must include requestRef and input",
            })
          );
        }

        const mismatch = ensureRequestRefConsistency(
          request.body.requestRef,
          request.body.input.requestRef,
          "requestPaymentApproval"
        );
        if (mismatch) {
          return buildJsonResponse(mismatch.statusCode, mismatch);
        }

        const response = await apiHandlers.handleRequestPaymentApproval({
          capability: "requestPaymentApproval",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.settleResourceUsage) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "settleResourceUsage",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "settleResourceUsage transport only supports POST",
            })
          );
        }

        if (!isSettleResourceUsageBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "settleResourceUsage",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "settleResourceUsage request body must include requestRef and input",
            })
          );
        }

        const mismatch = ensureRequestRefConsistency(
          request.body.requestRef,
          request.body.input.requestRef,
          "settleResourceUsage"
        );
        if (mismatch) {
          return buildJsonResponse(mismatch.statusCode, mismatch);
        }

        const response = await apiHandlers.handleSettleResourceUsage({
          capability: "settleResourceUsage",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.requestResourceApproval) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "requestResourceApproval",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "requestResourceApproval transport only supports POST",
            })
          );
        }

        if (!isSettleResourceUsageBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "requestResourceApproval",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "requestResourceApproval request body must include requestRef and input",
            })
          );
        }

        const mismatch = ensureRequestRefConsistency(
          request.body.requestRef,
          request.body.input.requestRef,
          "requestResourceApproval"
        );
        if (mismatch) {
          return buildJsonResponse(mismatch.statusCode, mismatch);
        }

        const response = await apiHandlers.handleRequestResourceApproval({
          capability: "requestResourceApproval",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.getActionStatus) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getActionStatus",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getActionStatus transport only supports POST",
            })
          );
        }
        if (!isGetActionStatusBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getActionStatus",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getActionStatus request body must include requestRef and input.actionRef",
            })
          );
        }
        const response = await apiHandlers.handleGetActionStatus({
          capability: "getActionStatus",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.getNotificationDelivery) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getNotificationDelivery",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getNotificationDelivery transport only supports POST",
            })
          );
        }
        if (!isGetNotificationDeliveryBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getNotificationDelivery",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message:
                "getNotificationDelivery request body must include requestRef and input.notificationId",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "getNotificationDelivery",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleGetNotificationDelivery({
          capability: "getNotificationDelivery",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.listNotificationDeliveries) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "listNotificationDeliveries",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "listNotificationDeliveries transport only supports POST",
            })
          );
        }
        if (!isListNotificationDeliveriesBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "listNotificationDeliveries",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "listNotificationDeliveries request body must include requestRef",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "listNotificationDeliveries",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleListNotificationDeliveries({
          capability: "listNotificationDeliveries",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.getAdminAuditEntry) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getAdminAuditEntry",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getAdminAuditEntry transport only supports POST",
            })
          );
        }
        if (!isGetAdminAuditEntryBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getAdminAuditEntry",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getAdminAuditEntry request body must include requestRef and input.auditId",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "getAdminAuditEntry",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleGetAdminAuditEntry({
          capability: "getAdminAuditEntry",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.listAdminAuditEntries) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "listAdminAuditEntries",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "listAdminAuditEntries transport only supports POST",
            })
          );
        }
        if (!isListAdminAuditEntriesBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "listAdminAuditEntries",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "listAdminAuditEntries request body must include requestRef",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "listAdminAuditEntries",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleListAdminAuditEntries({
          capability: "listAdminAuditEntries",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.getNotificationWorkerStatus) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getNotificationWorkerStatus",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getNotificationWorkerStatus transport only supports POST",
            })
          );
        }
        if (!isNotificationWorkerCommandBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getNotificationWorkerStatus",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getNotificationWorkerStatus request body must include requestRef",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "getNotificationWorkerStatus",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleGetNotificationWorkerStatus({
          capability: "getNotificationWorkerStatus",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.startNotificationWorker) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "startNotificationWorker",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "startNotificationWorker transport only supports POST",
            })
          );
        }
        if (!isNotificationWorkerCommandBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "startNotificationWorker",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "startNotificationWorker request body must include requestRef",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "startNotificationWorker",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleStartNotificationWorker({
          capability: "startNotificationWorker",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.stopNotificationWorker) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "stopNotificationWorker",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "stopNotificationWorker transport only supports POST",
            })
          );
        }
        if (!isNotificationWorkerCommandBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "stopNotificationWorker",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "stopNotificationWorker request body must include requestRef",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "stopNotificationWorker",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleStopNotificationWorker({
          capability: "stopNotificationWorker",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.runNotificationWorker) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "runNotificationWorker",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "runNotificationWorker transport only supports POST",
            })
          );
        }
        if (!isNotificationWorkerCommandBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "runNotificationWorker",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "runNotificationWorker request body must include requestRef",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "runNotificationWorker",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleRunNotificationWorker({
          capability: "runNotificationWorker",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.getApprovalSession) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getApprovalSession",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getApprovalSession transport only supports POST",
            })
          );
        }
        if (!isGetApprovalSessionBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "getApprovalSession",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "getApprovalSession request body must include requestRef and input.approvalSessionRef",
            })
          );
        }
        const response = await apiHandlers.handleGetApprovalSession({
          capability: "getApprovalSession",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.redeliverNotification) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "redeliverNotification",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "redeliverNotification transport only supports POST",
            })
          );
        }
        if (!isRedeliverNotificationBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "redeliverNotification",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message:
                "redeliverNotification request body must include requestRef and input.notificationId",
            })
          );
        }
        const operatorAuthFailure = ensureOperatorAuthorization({
          enabled: operatorAuthEnabled,
          token: operatorToken ?? "",
          headerName: operatorHeaderName,
          headers: request.headers,
          capability: "redeliverNotification",
          requestRef: request.body.requestRef,
        });
        if (operatorAuthFailure) {
          return buildJsonResponse(operatorAuthFailure.statusCode, operatorAuthFailure);
        }
        const response = await apiHandlers.handleRedeliverNotification({
          capability: "redeliverNotification",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.applyApprovalResult) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "applyApprovalResult",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "applyApprovalResult transport only supports POST",
            })
          );
        }
        if (!isApplyApprovalResultBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "applyApprovalResult",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "applyApprovalResult request body must include requestRef, approvalSessionRef, and result",
            })
          );
        }
        const response = await apiHandlers.handleApplyApprovalResult({
          capability: "applyApprovalResult",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.resumeApprovalSession) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "resumeApprovalSession",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "resumeApprovalSession transport only supports POST",
            })
          );
        }
        if (!isResumeApprovalSessionBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "resumeApprovalSession",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "resumeApprovalSession request body must include requestRef and input.approvalSessionRef",
            })
          );
        }
        const response = await apiHandlers.handleResumeApprovalSession({
          capability: "resumeApprovalSession",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      if (request.path === AFAL_HTTP_ROUTES.resumeApprovedAction) {
        if (request.method !== "POST") {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "resumeApprovedAction",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "resumeApprovedAction transport only supports POST",
            })
          );
        }
        if (!isResumeApprovedActionBody(request.body)) {
          return buildJsonResponse(
            400,
            buildTransportError({
              capability: "resumeApprovedAction",
              requestRef: "unknown",
              statusCode: 400,
              code: "bad-request",
              message: "resumeApprovedAction request body must include requestRef and input.approvalSessionRef",
            })
          );
        }
        const response = await apiHandlers.handleResumeApprovedAction({
          capability: "resumeApprovedAction",
          requestRef: request.body.requestRef,
          input: request.body.input,
        });
        return buildJsonResponse(response.statusCode, response);
      }

      return buildJsonResponse(
        404,
        buildTransportError({
          capability: "executePayment",
          requestRef: "unknown",
          statusCode: 404,
          code: "not-found",
          message: `Unknown AFAL HTTP route "${request.path}"`,
        })
      );
    },
  };
}
