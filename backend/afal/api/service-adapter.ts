import type { AfalModuleService } from "../service";
import { createAfalRuntimeService } from "../service";
import type {
  AfalApiSuccess,
  ApplyApprovalResultRequest,
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

export interface AfalApiServiceAdapter {
  handleRequestPaymentApproval(
    request: RequestPaymentApprovalRequest
  ): Promise<RequestPaymentApprovalResponse>;
  handleExecutePayment(request: PaymentCapabilityRequest): Promise<PaymentCapabilityResponse>;
  handleRequestResourceApproval(
    request: RequestResourceApprovalRequest
  ): Promise<RequestResourceApprovalResponse>;
  handleSettleResourceUsage(
    request: ResourceCapabilityRequest
  ): Promise<ResourceCapabilityResponse>;
  handleGetActionStatus(request: GetActionStatusRequest): Promise<GetActionStatusResponse>;
  handleGetApprovalSession(
    request: GetApprovalSessionRequest
  ): Promise<GetApprovalSessionResponse>;
  handleApplyApprovalResult(
    request: ApplyApprovalResultRequest
  ): Promise<ApplyApprovalResultResponse>;
  handleResumeApprovalSession(
    request: ResumeApprovalSessionRequest
  ): Promise<ResumeApprovalSessionResponse>;
  handleResumeApprovedAction(
    request: ResumeApprovedActionRequest
  ): Promise<ResumeApprovedActionResponse>;
  handleGetNotificationDelivery(
    request: GetNotificationDeliveryRequest
  ): Promise<GetNotificationDeliveryResponse>;
  handleListNotificationDeliveries(
    request: ListNotificationDeliveriesRequest
  ): Promise<ListNotificationDeliveriesResponse>;
  handleRedeliverNotification(
    request: RedeliverNotificationRequest
  ): Promise<RedeliverNotificationResponse>;
  handleGetNotificationWorkerStatus(
    request: GetNotificationWorkerStatusRequest
  ): Promise<GetNotificationWorkerStatusResponse>;
  handleStartNotificationWorker(
    request: StartNotificationWorkerRequest
  ): Promise<StartNotificationWorkerResponse>;
  handleStopNotificationWorker(
    request: StopNotificationWorkerRequest
  ): Promise<StopNotificationWorkerResponse>;
  handleRunNotificationWorker(
    request: RunNotificationWorkerRequest
  ): Promise<RunNotificationWorkerResponse>;
  handleGetAdminAuditEntry(
    request: GetAdminAuditEntryRequest
  ): Promise<GetAdminAuditEntryResponse>;
  handleListAdminAuditEntries(
    request: ListAdminAuditEntriesRequest
  ): Promise<ListAdminAuditEntriesResponse>;
  invokeCapability(request: AfalCapabilityRequest): Promise<AfalCapabilityResponse>;
}

export function createAfalApiServiceAdapter(
  service: AfalModuleService = createAfalRuntimeService()
): AfalApiServiceAdapter {
  return {
    handleRequestPaymentApproval: async (request) => {
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
    },
    handleExecutePayment: async (request) => {
      try {
        const data = await service.executePayment({
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
    },
    handleSettleResourceUsage: async (request) => {
      try {
        const data = await service.settleResourceUsage({
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
    },
    handleRequestResourceApproval: async (request) => {
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
    },
    handleGetActionStatus: async (request) => {
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
    },
    handleGetApprovalSession: async (request) => {
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
    },
    handleApplyApprovalResult: async (request) => {
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
    },
    handleResumeApprovalSession: async (request) => {
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
    },
    handleResumeApprovedAction: async (request) => {
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
    },
    handleGetNotificationDelivery: async (request) => {
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
    },
    handleListNotificationDeliveries: async (request) => {
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
    },
    handleRedeliverNotification: async (request) => {
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
    },
    handleGetNotificationWorkerStatus: async (request) => {
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
    },
    handleStartNotificationWorker: async (request) => {
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
    },
    handleStopNotificationWorker: async (request) => {
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
    },
    handleRunNotificationWorker: async (request) => {
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
    },
    handleGetAdminAuditEntry: async (request) => {
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
    },
    handleListAdminAuditEntries: async (request) => {
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
    },
    invokeCapability: async (request) => {
      try {
        const data = await service.invoke(request);

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
    },
  };
}
