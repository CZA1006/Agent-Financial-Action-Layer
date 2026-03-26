import type {
  PaymentFlowOrchestrator,
  ResourceFlowOrchestrator,
} from "../interfaces";
import { createAfalRuntimeService } from "../service";
import { createAfalApiServiceAdapter } from "./service-adapter";
import type {
  AfalApiSuccess,
  AfalCapabilityRequest,
  AfalCapabilityResponse,
  PaymentCapabilityRequest,
  PaymentCapabilityResponse,
  ResourceCapabilityRequest,
  ResourceCapabilityResponse,
} from "./types";
import { mapAfalFailure } from "./failures";

export async function handleExecutePayment(
  request: PaymentCapabilityRequest,
  orchestrator: PaymentFlowOrchestrator = createAfalRuntimeService()
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
    return mapAfalFailure(request.capability, request.requestRef, error);
  }
}

export async function handleSettleResourceUsage(
  request: ResourceCapabilityRequest,
  orchestrator: ResourceFlowOrchestrator = createAfalRuntimeService()
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
    return mapAfalFailure(request.capability, request.requestRef, error);
  }
}

export function createAfalApiHandlers(args?: {
  paymentOrchestrator?: PaymentFlowOrchestrator;
  resourceOrchestrator?: ResourceFlowOrchestrator;
}) {
  if (!args?.paymentOrchestrator && !args?.resourceOrchestrator) {
    return createAfalApiServiceAdapter();
  }

  const runtime = createAfalRuntimeService();
  const paymentOrchestrator = args?.paymentOrchestrator ?? runtime;
  const resourceOrchestrator = args?.resourceOrchestrator ?? runtime;

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
