import { createAfalApiHandlers, type AfalApiFailure } from "../api";
import type { PaymentFlowOrchestrator, ResourceFlowOrchestrator } from "../interfaces";
import type {
  AfalHttpRequest,
  AfalHttpResponse,
  AfalHttpResponseBody,
  ExecutePaymentHttpBody,
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
  capability: "executePayment" | "settleResourceUsage";
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

function ensureRequestRefConsistency(
  outerRequestRef: string,
  inputRequestRef: string,
  capability: "executePayment" | "settleResourceUsage"
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
}) {
  const apiHandlers = createAfalApiHandlers(args);

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
