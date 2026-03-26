import type { ApprovalResult } from "../../../sdk/types";
import type {
  ActionStatusOutput,
  PaymentFlowInput,
  PaymentFlowOutput,
  PaymentApprovalRequestOutput,
  ResourceFlowInput,
  ResourceFlowOutput,
  ResourceApprovalRequestOutput,
} from "../interfaces";
import type {
  ApplyApprovalResultOutput,
  AfalModuleService,
  ResumeApprovalSessionOutput,
} from "../service";

export type AfalCapability =
  | "requestPaymentApproval"
  | "executePayment"
  | "requestResourceApproval"
  | "settleResourceUsage"
  | "getActionStatus"
  | "getApprovalSession"
  | "applyApprovalResult"
  | "resumeApprovalSession"
  | "resumeApprovedAction";

export interface RequestPaymentApprovalRequest {
  capability: "requestPaymentApproval";
  requestRef: string;
  input: PaymentFlowInput;
}

export interface PaymentCapabilityRequest {
  capability: "executePayment";
  requestRef: string;
  input: PaymentFlowInput;
}

export interface RequestResourceApprovalRequest {
  capability: "requestResourceApproval";
  requestRef: string;
  input: ResourceFlowInput;
}

export interface ResourceCapabilityRequest {
  capability: "settleResourceUsage";
  requestRef: string;
  input: ResourceFlowInput;
}

export interface GetApprovalSessionRequest {
  capability: "getApprovalSession";
  requestRef: string;
  input: {
    approvalSessionRef: string;
  };
}

export interface GetActionStatusRequest {
  capability: "getActionStatus";
  requestRef: string;
  input: {
    actionRef: string;
  };
}

export interface ApplyApprovalResultRequest {
  capability: "applyApprovalResult";
  requestRef: string;
  input: {
    approvalSessionRef: string;
    result: ApprovalResult;
  };
}

export interface ResumeApprovalSessionRequest {
  capability: "resumeApprovalSession";
  requestRef: string;
  input: {
    approvalSessionRef: string;
  };
}

export interface ResumeApprovedActionRequest {
  capability: "resumeApprovedAction";
  requestRef: string;
  input: {
    approvalSessionRef: string;
  };
}

export type AfalCapabilityRequest =
  | RequestPaymentApprovalRequest
  | PaymentCapabilityRequest
  | RequestResourceApprovalRequest
  | ResourceCapabilityRequest
  | GetActionStatusRequest
  | GetApprovalSessionRequest
  | ApplyApprovalResultRequest
  | ResumeApprovalSessionRequest
  | ResumeApprovedActionRequest;

export interface AfalApiError {
  code:
    | "bad-request"
    | "not-found"
    | "credential-verification-failed"
    | "authorization-rejected"
    | "authorization-expired"
    | "authorization-cancelled"
    | "provider-failure"
    | "internal-error";
  message: string;
}

export interface AfalApiSuccess<TData> {
  ok: true;
  capability: AfalCapability;
  requestRef: string;
  statusCode: 200;
  data: TData;
}

export interface AfalApiFailure {
  ok: false;
  capability: AfalCapability;
  requestRef: string;
  statusCode: 400 | 403 | 404 | 409 | 502 | 500;
  error: AfalApiError;
}

export type RequestPaymentApprovalResponse =
  | AfalApiSuccess<PaymentApprovalRequestOutput>
  | AfalApiFailure;
export type PaymentCapabilityResponse = AfalApiSuccess<PaymentFlowOutput> | AfalApiFailure;
export type RequestResourceApprovalResponse =
  | AfalApiSuccess<ResourceApprovalRequestOutput>
  | AfalApiFailure;
export type ResourceCapabilityResponse = AfalApiSuccess<ResourceFlowOutput> | AfalApiFailure;
export type GetActionStatusResponse = AfalApiSuccess<ActionStatusOutput> | AfalApiFailure;
export type GetApprovalSessionResponse =
  | AfalApiSuccess<Awaited<ReturnType<import("../service").AfalModuleService["getApprovalSession"]>>>
  | AfalApiFailure;
export type ApplyApprovalResultResponse =
  | AfalApiSuccess<ApplyApprovalResultOutput>
  | AfalApiFailure;
export type ResumeApprovalSessionResponse =
  | AfalApiSuccess<ResumeApprovalSessionOutput>
  | AfalApiFailure;
export type ResumeApprovedActionResponse =
  | AfalApiSuccess<Awaited<ReturnType<AfalModuleService["resumeApprovedAction"]>>>
  | AfalApiFailure;
export type AfalCapabilityResponse =
  | AfalApiSuccess<
      | PaymentFlowOutput
      | PaymentApprovalRequestOutput
      | ResourceFlowOutput
      | ResourceApprovalRequestOutput
      | ActionStatusOutput
      | Awaited<ReturnType<import("../service").AfalModuleService["getApprovalSession"]>>
      | ApplyApprovalResultOutput
      | ResumeApprovalSessionOutput
      | Awaited<ReturnType<AfalModuleService["resumeApprovedAction"]>>
    >
  | AfalApiFailure;
