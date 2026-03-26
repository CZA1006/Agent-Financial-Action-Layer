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
  GetApprovalSessionHttpBody,
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
    | "getApprovalSession"
    | "applyApprovalResult"
    | "resumeApprovalSession"
    | "resumeApprovedAction";
  requestRef: string;
  statusCode: 400 | 404;
  code: "bad-request" | "not-found";
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
}) {
  const apiHandlers =
    args?.handlers ??
    createAfalApiHandlers({
      paymentOrchestrator: args?.paymentOrchestrator,
      resourceOrchestrator: args?.resourceOrchestrator,
    });

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
