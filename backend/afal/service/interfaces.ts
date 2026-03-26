import type {
  PaymentFlowInput,
  PaymentFlowOutput,
  PaymentApprovalRequestOutput,
  ResumeApprovedActionOutput,
  ResourceFlowInput,
  ResourceFlowOutput,
  ResourceApprovalRequestOutput,
} from "../interfaces";
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
  | "getApprovalSession"
  | "applyApprovalResult"
  | "resumeApprovalSession"
  | "resumeApprovedAction";

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

export type AfalServiceCommand =
  | RequestPaymentApprovalCommand
  | ExecutePaymentCommand
  | RequestResourceApprovalCommand
  | SettleResourceUsageCommand
  | GetApprovalSessionCommand
  | ApplyApprovalResultCommand
  | ResumeApprovalSessionCommand
  | ResumeApprovedActionCommand;

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

export type AfalServiceResult =
  | PaymentApprovalRequestOutput
  | PaymentFlowOutput
  | ResourceApprovalRequestOutput
  | ResourceFlowOutput
  | ApprovalSession
  | ApplyApprovalResultOutput
  | ResumeApprovalSessionOutput
  | ResumeApprovedActionOutput;

export interface AfalModuleService {
  requestPaymentApproval(
    command: RequestPaymentApprovalCommand
  ): Promise<PaymentApprovalRequestOutput>;
  executePayment(command: ExecutePaymentCommand): Promise<PaymentFlowOutput>;
  requestResourceApproval(
    command: RequestResourceApprovalCommand
  ): Promise<ResourceApprovalRequestOutput>;
  settleResourceUsage(command: SettleResourceUsageCommand): Promise<ResourceFlowOutput>;
  getApprovalSession(command: GetApprovalSessionCommand): Promise<ApprovalSession>;
  applyApprovalResult(command: ApplyApprovalResultCommand): Promise<ApplyApprovalResultOutput>;
  resumeApprovalSession(
    command: ResumeApprovalSessionCommand
  ): Promise<ResumeApprovalSessionOutput>;
  resumeApprovedAction(
    command: ResumeApprovedActionCommand
  ): Promise<ResumeApprovedActionOutput>;
  invoke(command: AfalServiceCommand): Promise<AfalServiceResult>;
}
