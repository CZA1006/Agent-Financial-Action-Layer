import type {
  PaymentFlowOrchestrator,
  ResourceFlowOrchestrator,
} from "../interfaces";
import {
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "../mock";
import type {
  AfalApiFailure,
  AfalApiSuccess,
  AfalCapabilityRequest,
  AfalCapabilityResponse,
  PaymentCapabilityRequest,
  PaymentCapabilityResponse,
  ResourceCapabilityRequest,
  ResourceCapabilityResponse,
} from "./types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown AFAL API error";
}

function mapFailure(
  capability: PaymentCapabilityRequest["capability"] | ResourceCapabilityRequest["capability"],
  requestRef: string,
  error: unknown
): AfalApiFailure {
  const message = toErrorMessage(error);

  if (message.includes("Unknown DID") || message.includes("Unknown accountRef") || message.includes("Unknown resource budget") || message.includes("Unknown resource quota") || message.includes("Unknown monetary budget") || message.includes("Unknown actionRef")) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 404,
      error: {
        code: "not-found",
        message,
      },
    };
  }

  if (message.includes("verified") && message.includes("credential")) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 403,
      error: {
        code: "credential-verification-failed",
        message,
      },
    };
  }

  if (message.includes('authorization result was "expired"')) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 409,
      error: {
        code: "authorization-expired",
        message,
      },
    };
  }

  if (message.includes('authorization result was "rejected"')) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 403,
      error: {
        code: "authorization-rejected",
        message,
      },
    };
  }

  if (message.includes('authorization result was "cancelled"')) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 409,
      error: {
        code: "authorization-cancelled",
        message,
      },
    };
  }

  if (message.includes("Provider usage confirmation failed")) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 502,
      error: {
        code: "provider-failure",
        message,
      },
    };
  }

  return {
    ok: false,
    capability,
    requestRef,
    statusCode: 500,
    error: {
      code: "internal-error",
      message,
    },
  };
}

export async function handleExecutePayment(
  request: PaymentCapabilityRequest,
  orchestrator: PaymentFlowOrchestrator = createMockPaymentFlowOrchestrator()
): Promise<PaymentCapabilityResponse> {
  try {
    const data = await orchestrator.executePaymentFlow(request.input);
    const response: AfalApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleSettleResourceUsage(
  request: ResourceCapabilityRequest,
  orchestrator: ResourceFlowOrchestrator = createMockResourceFlowOrchestrator()
): Promise<ResourceCapabilityResponse> {
  try {
    const data = await orchestrator.executeResourceSettlementFlow(request.input);
    const response: AfalApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export function createAfalApiHandlers(args?: {
  paymentOrchestrator?: PaymentFlowOrchestrator;
  resourceOrchestrator?: ResourceFlowOrchestrator;
}) {
  const paymentOrchestrator = args?.paymentOrchestrator ?? createMockPaymentFlowOrchestrator();
  const resourceOrchestrator = args?.resourceOrchestrator ?? createMockResourceFlowOrchestrator();

  return {
    handleExecutePayment: (request: PaymentCapabilityRequest) =>
      handleExecutePayment(request, paymentOrchestrator),
    handleSettleResourceUsage: (request: ResourceCapabilityRequest) =>
      handleSettleResourceUsage(request, resourceOrchestrator),
    invokeCapability: async (request: AfalCapabilityRequest): Promise<AfalCapabilityResponse> => {
      if (request.capability === "executePayment") {
        return handleExecutePayment(request, paymentOrchestrator);
      }

      return handleSettleResourceUsage(request, resourceOrchestrator);
    },
  };
}
