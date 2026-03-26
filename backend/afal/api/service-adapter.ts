import type { AfalModuleService } from "../service";
import { createAfalRuntimeService } from "../service";
import type {
  AfalApiSuccess,
  ApplyApprovalResultRequest,
  AfalCapabilityRequest,
  AfalCapabilityResponse,
  ApplyApprovalResultResponse,
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
