import type { ApprovalResult } from "../../../sdk/types";
import type { PaymentFlowInput, ResourceFlowInput } from "../interfaces";
import type {
  AfalApiFailure,
  ApplyApprovalResultResponse,
  GetActionStatusResponse,
  GetApprovalSessionResponse,
  RequestPaymentApprovalResponse,
  PaymentCapabilityResponse,
  RequestResourceApprovalResponse,
  ResumeApprovedActionResponse,
  ResourceCapabilityResponse,
  ResumeApprovalSessionResponse,
} from "../api";

export const AFAL_HTTP_ROUTES = {
  requestPaymentApproval: "/capabilities/request-payment-approval",
  executePayment: "/capabilities/execute-payment",
  requestResourceApproval: "/capabilities/request-resource-approval",
  settleResourceUsage: "/capabilities/settle-resource-usage",
  getActionStatus: "/actions/get",
  getApprovalSession: "/approval-sessions/get",
  applyApprovalResult: "/approval-sessions/apply-result",
  resumeApprovalSession: "/approval-sessions/resume",
  resumeApprovedAction: "/approval-sessions/resume-action",
} as const;

export type AfalHttpPath = (typeof AFAL_HTTP_ROUTES)[keyof typeof AFAL_HTTP_ROUTES];

export interface ExecutePaymentHttpBody {
  requestRef: string;
  input: PaymentFlowInput;
}

export interface RequestPaymentApprovalHttpBody {
  requestRef: string;
  input: PaymentFlowInput;
}

export interface SettleResourceUsageHttpBody {
  requestRef: string;
  input: ResourceFlowInput;
}

export interface RequestResourceApprovalHttpBody {
  requestRef: string;
  input: ResourceFlowInput;
}

export interface GetApprovalSessionHttpBody {
  requestRef: string;
  input: {
    approvalSessionRef: string;
  };
}

export interface GetActionStatusHttpBody {
  requestRef: string;
  input: {
    actionRef: string;
  };
}

export interface ApplyApprovalResultHttpBody {
  requestRef: string;
  input: {
    approvalSessionRef: string;
    result: ApprovalResult;
  };
}

export interface ResumeApprovalSessionHttpBody {
  requestRef: string;
  input: {
    approvalSessionRef: string;
  };
}

export interface ResumeApprovedActionHttpBody {
  requestRef: string;
  input: {
    approvalSessionRef: string;
  };
}

export type AfalHttpBody =
  | RequestPaymentApprovalHttpBody
  | ExecutePaymentHttpBody
  | RequestResourceApprovalHttpBody
  | SettleResourceUsageHttpBody
  | GetActionStatusHttpBody
  | GetApprovalSessionHttpBody
  | ApplyApprovalResultHttpBody
  | ResumeApprovalSessionHttpBody
  | ResumeApprovedActionHttpBody;

export interface AfalHttpRequest {
  method: string;
  path: string;
  body?: unknown;
}

export interface AfalHttpResponse<TBody> {
  statusCode: number;
  headers: {
    "content-type": "application/json";
  };
  body: TBody;
}

export type AfalHttpSuccessBody =
  | RequestPaymentApprovalResponse
  | PaymentCapabilityResponse
  | RequestResourceApprovalResponse
  | ResourceCapabilityResponse
  | GetActionStatusResponse
  | GetApprovalSessionResponse
  | ApplyApprovalResultResponse
  | ResumeApprovalSessionResponse
  | ResumeApprovedActionResponse;
export type AfalHttpErrorBody = AfalApiFailure;
export type AfalHttpResponseBody = AfalHttpSuccessBody | AfalHttpErrorBody;
