import type { ApprovalResult } from "../../../sdk/types";
import type { PaymentFlowInput, ResourceFlowInput } from "../interfaces";
import type {
  AfalApiFailure,
  ApplyApprovalResultResponse,
  GetAdminAuditEntryResponse,
  GetActionStatusResponse,
  GetApprovalSessionResponse,
  GetExternalCallbackRegistrationResponse,
  GetNotificationDeliveryResponse,
  GetNotificationWorkerStatusResponse,
  RequestPaymentApprovalResponse,
  RegisterExternalCallbackResponse,
  ListAdminAuditEntriesResponse,
  ListExternalCallbackRegistrationsResponse,
  ListNotificationDeliveriesResponse,
  PaymentCapabilityResponse,
  RequestResourceApprovalResponse,
  RedeliverNotificationResponse,
  RunNotificationWorkerResponse,
  ResumeApprovedActionResponse,
  ResourceCapabilityResponse,
  ResumeApprovalSessionResponse,
  StartNotificationWorkerResponse,
  StopNotificationWorkerResponse,
} from "../api";

export const AFAL_HTTP_ROUTES = {
  requestPaymentApproval: "/capabilities/request-payment-approval",
  executePayment: "/capabilities/execute-payment",
  requestResourceApproval: "/capabilities/request-resource-approval",
  settleResourceUsage: "/capabilities/settle-resource-usage",
  getActionStatus: "/actions/get",
  registerExternalCallback: "/integrations/callbacks/register",
  getExternalCallbackRegistration: "/integrations/callbacks/get",
  listExternalCallbackRegistrations: "/integrations/callbacks/list",
  getNotificationDelivery: "/notification-deliveries/get",
  listNotificationDeliveries: "/notification-deliveries/list",
  redeliverNotification: "/notification-deliveries/redeliver",
  getNotificationWorkerStatus: "/notification-worker/get",
  startNotificationWorker: "/notification-worker/start",
  stopNotificationWorker: "/notification-worker/stop",
  runNotificationWorker: "/notification-worker/run",
  getAdminAuditEntry: "/admin-audit/get",
  listAdminAuditEntries: "/admin-audit/list",
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

export interface RegisterExternalCallbackHttpBody {
  requestRef: string;
  input: {
    eventTypes?: Array<"payment.settled" | "resource.settled">;
    paymentSettlementUrl?: string;
    resourceSettlementUrl?: string;
  };
}

export interface GetExternalCallbackRegistrationHttpBody {
  requestRef: string;
  input?: Record<string, never>;
}

export interface ListExternalCallbackRegistrationsHttpBody {
  requestRef: string;
  input?: Record<string, never>;
}

export interface GetNotificationDeliveryHttpBody {
  requestRef: string;
  input: {
    notificationId: string;
  };
}

export interface ListNotificationDeliveriesHttpBody {
  requestRef: string;
  input?: Record<string, never>;
}

export interface NotificationWorkerCommandHttpBody {
  requestRef: string;
  input?: Record<string, never>;
}

export interface GetAdminAuditEntryHttpBody {
  requestRef: string;
  input: {
    auditId: string;
  };
}

export interface ListAdminAuditEntriesHttpBody {
  requestRef: string;
  input?: Record<string, never>;
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

export interface RedeliverNotificationHttpBody {
  requestRef: string;
  input: {
    notificationId: string;
  };
}

export type AfalHttpBody =
  | RequestPaymentApprovalHttpBody
  | ExecutePaymentHttpBody
  | RequestResourceApprovalHttpBody
  | SettleResourceUsageHttpBody
  | GetActionStatusHttpBody
  | RegisterExternalCallbackHttpBody
  | GetExternalCallbackRegistrationHttpBody
  | ListExternalCallbackRegistrationsHttpBody
  | GetNotificationDeliveryHttpBody
  | ListNotificationDeliveriesHttpBody
  | NotificationWorkerCommandHttpBody
  | GetAdminAuditEntryHttpBody
  | ListAdminAuditEntriesHttpBody
  | GetApprovalSessionHttpBody
  | ApplyApprovalResultHttpBody
  | ResumeApprovalSessionHttpBody
  | ResumeApprovedActionHttpBody
  | RedeliverNotificationHttpBody;

export interface AfalHttpHeaders {
  [headerName: string]: string | undefined;
}

export interface AfalHttpRequest {
  method: string;
  path: string;
  body?: unknown;
  headers?: AfalHttpHeaders;
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
  | RegisterExternalCallbackResponse
  | GetExternalCallbackRegistrationResponse
  | ListExternalCallbackRegistrationsResponse
  | GetNotificationDeliveryResponse
  | ListNotificationDeliveriesResponse
  | GetNotificationWorkerStatusResponse
  | GetAdminAuditEntryResponse
  | ListAdminAuditEntriesResponse
  | GetApprovalSessionResponse
  | ApplyApprovalResultResponse
  | ResumeApprovalSessionResponse
  | ResumeApprovedActionResponse
  | RedeliverNotificationResponse
  | StartNotificationWorkerResponse
  | StopNotificationWorkerResponse
  | RunNotificationWorkerResponse;
export type AfalHttpErrorBody = AfalApiFailure;
export type AfalHttpResponseBody = AfalHttpSuccessBody | AfalHttpErrorBody;
