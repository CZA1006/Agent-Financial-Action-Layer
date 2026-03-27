import type {
  ActionStatusOutput,
  PaymentFlowInput,
  PaymentFlowOutput,
  PaymentApprovalRequestOutput,
  ResumeApprovedActionOutput,
  ResourceFlowInput,
  ResourceFlowOutput,
  ResourceApprovalRequestOutput,
} from "../interfaces";
import type { AfalAdminAuditEntry } from "../admin-audit";
import type {
  SettlementNotificationDeliveryRecord,
  SettlementNotificationOutboxWorkerStatus,
} from "../notifications";
import type {
  ApprovalResult,
  ApprovalSession,
  AuthorizationDecision,
  ChallengeRecord,
  IdRef,
} from "../../../sdk/types";

export type AfalServiceCapability =
  | "requestPaymentApproval"
  | "requestResourceApproval"
  | "executePayment"
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

export interface ExecutePaymentCommand {
  capability: "executePayment";
  requestRef: string;
  input: PaymentFlowInput;
}

export interface RequestPaymentApprovalCommand {
  capability: "requestPaymentApproval";
  requestRef: string;
  input: PaymentFlowInput;
}

export interface SettleResourceUsageCommand {
  capability: "settleResourceUsage";
  requestRef: string;
  input: ResourceFlowInput;
}

export interface RequestResourceApprovalCommand {
  capability: "requestResourceApproval";
  requestRef: string;
  input: ResourceFlowInput;
}

export interface GetApprovalSessionCommand {
  capability: "getApprovalSession";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
  };
}

export interface GetActionStatusCommand {
  capability: "getActionStatus";
  requestRef: string;
  input: {
    actionRef: IdRef;
  };
}

export interface ApplyApprovalResultCommand {
  capability: "applyApprovalResult";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
    result: ApprovalResult;
  };
}

export interface ResumeApprovalSessionCommand {
  capability: "resumeApprovalSession";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
  };
}

export interface ResumeApprovedActionCommand {
  capability: "resumeApprovedAction";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
  };
}

export interface GetNotificationDeliveryCommand {
  capability: "getNotificationDelivery";
  requestRef: string;
  input: {
    notificationId: IdRef;
  };
}

export interface ListNotificationDeliveriesCommand {
  capability: "listNotificationDeliveries";
  requestRef: string;
  input?: Record<string, never>;
}

export interface RedeliverNotificationCommand {
  capability: "redeliverNotification";
  requestRef: string;
  input: {
    notificationId: IdRef;
  };
}

export interface GetNotificationWorkerStatusCommand {
  capability: "getNotificationWorkerStatus";
  requestRef: string;
  input?: Record<string, never>;
}

export interface StartNotificationWorkerCommand {
  capability: "startNotificationWorker";
  requestRef: string;
  input?: Record<string, never>;
}

export interface StopNotificationWorkerCommand {
  capability: "stopNotificationWorker";
  requestRef: string;
  input?: Record<string, never>;
}

export interface RunNotificationWorkerCommand {
  capability: "runNotificationWorker";
  requestRef: string;
  input?: Record<string, never>;
}

export interface GetAdminAuditEntryCommand {
  capability: "getAdminAuditEntry";
  requestRef: string;
  input: {
    auditId: IdRef;
  };
}

export interface ListAdminAuditEntriesCommand {
  capability: "listAdminAuditEntries";
  requestRef: string;
  input?: Record<string, never>;
}

export type AfalServiceCommand =
  | RequestPaymentApprovalCommand
  | ExecutePaymentCommand
  | RequestResourceApprovalCommand
  | SettleResourceUsageCommand
  | GetActionStatusCommand
  | GetApprovalSessionCommand
  | ApplyApprovalResultCommand
  | ResumeApprovalSessionCommand
  | ResumeApprovedActionCommand
  | GetNotificationDeliveryCommand
  | ListNotificationDeliveriesCommand
  | RedeliverNotificationCommand
  | GetNotificationWorkerStatusCommand
  | StartNotificationWorkerCommand
  | StopNotificationWorkerCommand
  | RunNotificationWorkerCommand
  | GetAdminAuditEntryCommand
  | ListAdminAuditEntriesCommand;

export interface ApplyApprovalResultOutput {
  approvalResult: ApprovalResult;
  approvalSession: ApprovalSession;
  challenge: ChallengeRecord;
}

export interface ResumeApprovalSessionOutput {
  finalDecision: AuthorizationDecision;
  approvalResult: ApprovalResult;
  approvalSession: ApprovalSession;
  challenge: ChallengeRecord;
}

export interface RedeliverNotificationOutput {
  delivery: SettlementNotificationDeliveryRecord;
}

export interface RunNotificationWorkerOutput {
  redelivered: number;
  status: SettlementNotificationOutboxWorkerStatus;
}

export type AfalServiceResult =
  | PaymentApprovalRequestOutput
  | PaymentFlowOutput
  | ResourceApprovalRequestOutput
  | ResourceFlowOutput
  | ActionStatusOutput
  | ApprovalSession
  | ApplyApprovalResultOutput
  | ResumeApprovalSessionOutput
  | ResumeApprovedActionOutput
  | SettlementNotificationDeliveryRecord
  | SettlementNotificationDeliveryRecord[]
  | RedeliverNotificationOutput
  | SettlementNotificationOutboxWorkerStatus
  | RunNotificationWorkerOutput
  | AfalAdminAuditEntry
  | AfalAdminAuditEntry[];

export interface AfalModuleService {
  requestPaymentApproval(
    command: RequestPaymentApprovalCommand
  ): Promise<PaymentApprovalRequestOutput>;
  executePayment(command: ExecutePaymentCommand): Promise<PaymentFlowOutput>;
  requestResourceApproval(
    command: RequestResourceApprovalCommand
  ): Promise<ResourceApprovalRequestOutput>;
  settleResourceUsage(command: SettleResourceUsageCommand): Promise<ResourceFlowOutput>;
  getActionStatus(command: GetActionStatusCommand): Promise<ActionStatusOutput>;
  getApprovalSession(command: GetApprovalSessionCommand): Promise<ApprovalSession>;
  applyApprovalResult(command: ApplyApprovalResultCommand): Promise<ApplyApprovalResultOutput>;
  resumeApprovalSession(
    command: ResumeApprovalSessionCommand
  ): Promise<ResumeApprovalSessionOutput>;
  resumeApprovedAction(
    command: ResumeApprovedActionCommand
  ): Promise<ResumeApprovedActionOutput>;
  getNotificationDelivery(
    command: GetNotificationDeliveryCommand
  ): Promise<SettlementNotificationDeliveryRecord>;
  listNotificationDeliveries(
    command: ListNotificationDeliveriesCommand
  ): Promise<SettlementNotificationDeliveryRecord[]>;
  redeliverNotification(
    command: RedeliverNotificationCommand
  ): Promise<RedeliverNotificationOutput>;
  getNotificationWorkerStatus(
    command: GetNotificationWorkerStatusCommand
  ): Promise<SettlementNotificationOutboxWorkerStatus>;
  startNotificationWorker(
    command: StartNotificationWorkerCommand
  ): Promise<SettlementNotificationOutboxWorkerStatus>;
  stopNotificationWorker(
    command: StopNotificationWorkerCommand
  ): Promise<SettlementNotificationOutboxWorkerStatus>;
  runNotificationWorker(
    command: RunNotificationWorkerCommand
  ): Promise<RunNotificationWorkerOutput>;
  getAdminAuditEntry(command: GetAdminAuditEntryCommand): Promise<AfalAdminAuditEntry>;
  listAdminAuditEntries(
    command: ListAdminAuditEntriesCommand
  ): Promise<AfalAdminAuditEntry[]>;
  invoke(command: AfalServiceCommand): Promise<AfalServiceResult>;
}
