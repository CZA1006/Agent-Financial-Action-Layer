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
  GetAdminAuditEntryRequest,
  GetAdminAuditEntryResponse,
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
  GetNotificationDeliveryRequest,
  GetNotificationDeliveryResponse,
  GetNotificationWorkerStatusRequest,
  GetNotificationWorkerStatusResponse,
  ListAdminAuditEntriesRequest,
  ListAdminAuditEntriesResponse,
  ListNotificationDeliveriesRequest,
  ListNotificationDeliveriesResponse,
  RedeliverNotificationRequest,
  RedeliverNotificationResponse,
  RunNotificationWorkerRequest,
  RunNotificationWorkerResponse,
  StartNotificationWorkerRequest,
  StartNotificationWorkerResponse,
  StopNotificationWorkerRequest,
  StopNotificationWorkerResponse,
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

export async function handleGetNotificationDelivery(
  request: GetNotificationDeliveryRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<GetNotificationDeliveryResponse> {
  try {
    const data = await service.getNotificationDelivery({
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

export async function handleListNotificationDeliveries(
  request: ListNotificationDeliveriesRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<ListNotificationDeliveriesResponse> {
  try {
    const data = await service.listNotificationDeliveries({
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

export async function handleRedeliverNotification(
  request: RedeliverNotificationRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<RedeliverNotificationResponse> {
  try {
    const data = await service.redeliverNotification({
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

export async function handleGetNotificationWorkerStatus(
  request: GetNotificationWorkerStatusRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<GetNotificationWorkerStatusResponse> {
  try {
    const data = await service.getNotificationWorkerStatus({
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

export async function handleStartNotificationWorker(
  request: StartNotificationWorkerRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<StartNotificationWorkerResponse> {
  try {
    const data = await service.startNotificationWorker({
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

export async function handleStopNotificationWorker(
  request: StopNotificationWorkerRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<StopNotificationWorkerResponse> {
  try {
    const data = await service.stopNotificationWorker({
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

export async function handleRunNotificationWorker(
  request: RunNotificationWorkerRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<RunNotificationWorkerResponse> {
  try {
    const data = await service.runNotificationWorker({
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

export async function handleGetAdminAuditEntry(
  request: GetAdminAuditEntryRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<GetAdminAuditEntryResponse> {
  try {
    const data = await service.getAdminAuditEntry({
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

export async function handleListAdminAuditEntries(
  request: ListAdminAuditEntriesRequest,
  service: AfalModuleService = createAfalRuntimeService()
): Promise<ListAdminAuditEntriesResponse> {
  try {
    const data = await service.listAdminAuditEntries({
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
    handleGetNotificationDelivery: (request: GetNotificationDeliveryRequest) =>
      handleGetNotificationDelivery(request, runtime),
    handleListNotificationDeliveries: (request: ListNotificationDeliveriesRequest) =>
      handleListNotificationDeliveries(request, runtime),
    handleRedeliverNotification: (request: RedeliverNotificationRequest) =>
      handleRedeliverNotification(request, runtime),
    handleGetNotificationWorkerStatus: (request: GetNotificationWorkerStatusRequest) =>
      handleGetNotificationWorkerStatus(request, runtime),
    handleStartNotificationWorker: (request: StartNotificationWorkerRequest) =>
      handleStartNotificationWorker(request, runtime),
    handleStopNotificationWorker: (request: StopNotificationWorkerRequest) =>
      handleStopNotificationWorker(request, runtime),
    handleRunNotificationWorker: (request: RunNotificationWorkerRequest) =>
      handleRunNotificationWorker(request, runtime),
    handleGetAdminAuditEntry: (request: GetAdminAuditEntryRequest) =>
      handleGetAdminAuditEntry(request, runtime),
    handleListAdminAuditEntries: (request: ListAdminAuditEntriesRequest) =>
      handleListAdminAuditEntries(request, runtime),
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
      if (request.capability === "resumeApprovedAction") {
        return handleResumeApprovedAction(request, runtime);
      }
      if (request.capability === "getNotificationDelivery") {
        return handleGetNotificationDelivery(request, runtime);
      }
      if (request.capability === "listNotificationDeliveries") {
        return handleListNotificationDeliveries(request, runtime);
      }
      if (request.capability === "getNotificationWorkerStatus") {
        return handleGetNotificationWorkerStatus(request, runtime);
      }
      if (request.capability === "startNotificationWorker") {
        return handleStartNotificationWorker(request, runtime);
      }
      if (request.capability === "stopNotificationWorker") {
        return handleStopNotificationWorker(request, runtime);
      }
      if (request.capability === "runNotificationWorker") {
        return handleRunNotificationWorker(request, runtime);
      }
      if (request.capability === "getAdminAuditEntry") {
        return handleGetAdminAuditEntry(request, runtime);
      }
      if (request.capability === "listAdminAuditEntries") {
        return handleListAdminAuditEntries(request, runtime);
      }

      return handleRedeliverNotification(request, runtime);
    },
  };
}
