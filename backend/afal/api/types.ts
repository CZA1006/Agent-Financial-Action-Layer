import type { ApprovalResult } from "../../../sdk/types";
import type { AfalAdminAuditEntry } from "../admin-audit";
import type {
  SettlementNotificationDeliveryRecord,
  SettlementNotificationOutboxWorkerStatus,
} from "../notifications";
import type { AfalModuleService } from "../service";
import type {
  ActionStatusOutput,
  PaymentFlowInput,
  PaymentFlowOutput,
  PaymentApprovalRequestOutput,
  ResourceFlowInput,
  ResourceFlowOutput,
  ResourceApprovalRequestOutput,
} from "../interfaces";
import type { ApplyApprovalResultOutput, ResumeApprovalSessionOutput } from "../service";

export type AfalCapability =
  | "requestPaymentApproval"
  | "executePayment"
  | "requestResourceApproval"
  | "settleResourceUsage"
  | "getActionStatus"
  | "getApprovalSession"
  | "applyApprovalResult"
  | "resumeApprovalSession"
  | "resumeApprovedAction"
  | "getNotificationDelivery"
  | "listNotificationDeliveries"
  | "redeliverNotification"
  | "getNotificationWorkerStatus"
  | "startNotificationWorker"
  | "stopNotificationWorker"
  | "runNotificationWorker"
  | "getAdminAuditEntry"
  | "listAdminAuditEntries";

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

export interface GetNotificationDeliveryRequest {
  capability: "getNotificationDelivery";
  requestRef: string;
  input: {
    notificationId: string;
  };
}

export interface ListNotificationDeliveriesRequest {
  capability: "listNotificationDeliveries";
  requestRef: string;
  input?: Record<string, never>;
}

export interface RedeliverNotificationRequest {
  capability: "redeliverNotification";
  requestRef: string;
  input: {
    notificationId: string;
  };
}

export interface GetNotificationWorkerStatusRequest {
  capability: "getNotificationWorkerStatus";
  requestRef: string;
  input?: Record<string, never>;
}

export interface StartNotificationWorkerRequest {
  capability: "startNotificationWorker";
  requestRef: string;
  input?: Record<string, never>;
}

export interface StopNotificationWorkerRequest {
  capability: "stopNotificationWorker";
  requestRef: string;
  input?: Record<string, never>;
}

export interface RunNotificationWorkerRequest {
  capability: "runNotificationWorker";
  requestRef: string;
  input?: Record<string, never>;
}

export interface GetAdminAuditEntryRequest {
  capability: "getAdminAuditEntry";
  requestRef: string;
  input: {
    auditId: string;
  };
}

export interface ListAdminAuditEntriesRequest {
  capability: "listAdminAuditEntries";
  requestRef: string;
  input?: Record<string, never>;
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
  | ResumeApprovedActionRequest
  | GetNotificationDeliveryRequest
  | ListNotificationDeliveriesRequest
  | RedeliverNotificationRequest
  | GetNotificationWorkerStatusRequest
  | StartNotificationWorkerRequest
  | StopNotificationWorkerRequest
  | RunNotificationWorkerRequest
  | GetAdminAuditEntryRequest
  | ListAdminAuditEntriesRequest;

export interface AfalApiError {
  code:
    | "bad-request"
    | "not-found"
    | "operator-auth-required"
    | "credential-verification-failed"
    | "authorization-rejected"
    | "authorization-expired"
    | "authorization-cancelled"
    | "provider-failure"
    | "external-adapter-unavailable"
    | "external-adapter-rejected"
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
  statusCode: 400 | 403 | 404 | 409 | 502 | 503 | 500;
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
export type GetNotificationDeliveryResponse =
  | AfalApiSuccess<SettlementNotificationDeliveryRecord>
  | AfalApiFailure;
export type ListNotificationDeliveriesResponse =
  | AfalApiSuccess<SettlementNotificationDeliveryRecord[]>
  | AfalApiFailure;
export type RedeliverNotificationResponse =
  | AfalApiSuccess<Awaited<ReturnType<AfalModuleService["redeliverNotification"]>>>
  | AfalApiFailure;
export type GetNotificationWorkerStatusResponse =
  | AfalApiSuccess<SettlementNotificationOutboxWorkerStatus>
  | AfalApiFailure;
export type StartNotificationWorkerResponse =
  | AfalApiSuccess<SettlementNotificationOutboxWorkerStatus>
  | AfalApiFailure;
export type StopNotificationWorkerResponse =
  | AfalApiSuccess<SettlementNotificationOutboxWorkerStatus>
  | AfalApiFailure;
export type RunNotificationWorkerResponse =
  | AfalApiSuccess<Awaited<ReturnType<AfalModuleService["runNotificationWorker"]>>>
  | AfalApiFailure;
export type GetAdminAuditEntryResponse = AfalApiSuccess<AfalAdminAuditEntry> | AfalApiFailure;
export type ListAdminAuditEntriesResponse =
  | AfalApiSuccess<AfalAdminAuditEntry[]>
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
      | SettlementNotificationDeliveryRecord
      | SettlementNotificationDeliveryRecord[]
      | Awaited<ReturnType<AfalModuleService["redeliverNotification"]>>
      | SettlementNotificationOutboxWorkerStatus
      | Awaited<ReturnType<AfalModuleService["runNotificationWorker"]>>
      | AfalAdminAuditEntry
      | AfalAdminAuditEntry[]
    >
  | AfalApiFailure;
