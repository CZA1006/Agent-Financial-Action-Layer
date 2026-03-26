import type {
  PaymentFlowOrchestrator,
  ResourceFlowOrchestrator,
} from "../interfaces";
import { createAfalRuntimeService, type AfalModuleService } from "../service";
import { createAfalApiServiceAdapter } from "./service-adapter";
import type {
  ApplyApprovalResultRequest,
  AfalApiSuccess,
  AfalCapabilityRequest,
  AfalCapabilityResponse,
  ApplyApprovalResultResponse,
  GetActionStatusRequest,
  GetActionStatusResponse,
  GetApprovalSessionRequest,
  GetApprovalSessionResponse,
  RequestPaymentApprovalRequest,
  RequestPaymentApprovalResponse,
  PaymentCapabilityRequest,
  PaymentCapabilityResponse,
  RequestResourceApprovalRequest,
  RequestResourceApprovalResponse,
  ResumeApprovedActionRequest,
  ResumeApprovedActionResponse,
  ResumeApprovalSessionRequest,
  ResumeApprovalSessionResponse,
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

export async function handleRequestPaymentApproval(
  request: RequestPaymentApprovalRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<RequestPaymentApprovalResponse> {
  try {
    const data = await service.requestPaymentApproval({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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

export async function handleRequestResourceApproval(
  request: RequestResourceApprovalRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<RequestResourceApprovalResponse> {
  try {
    const data = await service.requestResourceApproval({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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

export async function handleGetActionStatus(
  request: GetActionStatusRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<GetActionStatusResponse> {
  try {
    const data = await service.getActionStatus({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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

export async function handleGetApprovalSession(
  request: GetApprovalSessionRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<GetApprovalSessionResponse> {
  try {
    const data = await service.getApprovalSession({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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

export async function handleApplyApprovalResult(
  request: ApplyApprovalResultRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<ApplyApprovalResultResponse> {
  try {
    const data = await service.applyApprovalResult({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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

export async function handleResumeApprovalSession(
  request: ResumeApprovalSessionRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<ResumeApprovalSessionResponse> {
  try {
    const data = await service.resumeApprovalSession({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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

export async function handleResumeApprovedAction(
  request: ResumeApprovedActionRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<ResumeApprovedActionResponse> {
  try {
    const data = await service.resumeApprovedAction({
      capability: request.capability,
      requestRef: request.requestRef,
      input: request.input,
    });
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
  service?: AfalModuleService;
}) {
  if (args?.service) {
    return createAfalApiServiceAdapter(args.service);
  }

  if (!args?.paymentOrchestrator && !args?.resourceOrchestrator) {
    return createAfalApiServiceAdapter();
  }

  const runtime = createAfalRuntimeService();
  const paymentOrchestrator = args?.paymentOrchestrator ?? runtime;
  const resourceOrchestrator = args?.resourceOrchestrator ?? runtime;

  return {
    handleExecutePayment: (request: PaymentCapabilityRequest) =>
      handleExecutePayment(request, paymentOrchestrator),
    handleRequestPaymentApproval: (request: RequestPaymentApprovalRequest) =>
      handleRequestPaymentApproval(request, runtime),
    handleSettleResourceUsage: (request: ResourceCapabilityRequest) =>
      handleSettleResourceUsage(request, resourceOrchestrator),
    handleRequestResourceApproval: (request: RequestResourceApprovalRequest) =>
      handleRequestResourceApproval(request, runtime),
    handleGetActionStatus: (request: GetActionStatusRequest) =>
      handleGetActionStatus(request, runtime),
    handleGetApprovalSession: (request: GetApprovalSessionRequest) =>
      handleGetApprovalSession(request, runtime),
    handleApplyApprovalResult: (request: ApplyApprovalResultRequest) =>
      handleApplyApprovalResult(request, runtime),
    handleResumeApprovalSession: (request: ResumeApprovalSessionRequest) =>
      handleResumeApprovalSession(request, runtime),
    handleResumeApprovedAction: (request: ResumeApprovedActionRequest) =>
      handleResumeApprovedAction(request, runtime),
    invokeCapability: async (request: AfalCapabilityRequest): Promise<AfalCapabilityResponse> => {
      if (request.capability === "executePayment") {
        return handleExecutePayment(request, paymentOrchestrator);
      }
      if (request.capability === "requestPaymentApproval") {
        return handleRequestPaymentApproval(request, runtime);
      }
      if (request.capability === "settleResourceUsage") {
        return handleSettleResourceUsage(request, resourceOrchestrator);
      }
      if (request.capability === "requestResourceApproval") {
        return handleRequestResourceApproval(request, runtime);
      }
      if (request.capability === "getActionStatus") {
        return handleGetActionStatus(request, runtime);
      }
      if (request.capability === "getApprovalSession") {
        return handleGetApprovalSession(request, runtime);
      }
      if (request.capability === "applyApprovalResult") {
        return handleApplyApprovalResult(request, runtime);
      }
      if (request.capability === "resumeApprovalSession") {
        return handleResumeApprovalSession(request, runtime);
      }

      return handleResumeApprovedAction(request, runtime);
    },
  };
}
