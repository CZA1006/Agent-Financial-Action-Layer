import type {
  CommonActionStatus,
  IdRef,
  PaymentIntent,
  ResourceIntent,
  ChallengeState,
  Timestamp,
} from "../../../sdk/types";

export type PendingApprovalExecutionStatus =
  | "pending"
  | "resumed"
  | "released"
  | "failed";

export interface PendingApprovalExecution {
  approvalSessionRef: IdRef;
  actionRef: IdRef;
  actionType: "payment" | "resource";
  requestRef: IdRef;
  reservationRef?: IdRef;
  monetaryBudgetRef?: IdRef;
  resourceBudgetRef?: IdRef;
  resourceQuotaRef?: IdRef;
  status: PendingApprovalExecutionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  finalDecisionRef?: IdRef;
  settlementRef?: IdRef;
  receiptRef?: IdRef;
  usageReceiptRef?: IdRef;
}

export interface PaymentIntentReader {
  getPaymentIntent(intentId: IdRef): Promise<PaymentIntent>;
  listPaymentIntents(): Promise<PaymentIntent[]>;
}

export interface ResourceIntentReader {
  getResourceIntent(intentId: IdRef): Promise<ResourceIntent>;
  listResourceIntents(): Promise<ResourceIntent[]>;
}

export interface PendingApprovalExecutionReader {
  getPendingExecution(approvalSessionRef: IdRef): Promise<PendingApprovalExecution>;
  listPendingExecutions(): Promise<PendingApprovalExecution[]>;
}

export interface IntentStateAdminPort
  extends PaymentIntentReader,
    ResourceIntentReader,
    PendingApprovalExecutionReader {
  createPaymentIntent(intent: PaymentIntent): Promise<PaymentIntent>;
  createResourceIntent(intent: ResourceIntent): Promise<ResourceIntent>;
  createPendingExecution(
    execution: PendingApprovalExecution
  ): Promise<PendingApprovalExecution>;
  markPendingExecution(args: {
    approvalSessionRef: IdRef;
    status: PendingApprovalExecutionStatus;
    updatedAt?: Timestamp;
    finalDecisionRef?: IdRef;
    settlementRef?: IdRef;
    receiptRef?: IdRef;
    usageReceiptRef?: IdRef;
  }): Promise<PendingApprovalExecution>;
  markPaymentChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    status: CommonActionStatus;
  }): Promise<PaymentIntent>;
  markPaymentSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    settlementRef: IdRef;
    receiptRef: IdRef;
    status: CommonActionStatus;
  }): Promise<PaymentIntent>;
  markResourceChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    status: CommonActionStatus;
  }): Promise<ResourceIntent>;
  markResourceSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    usageReceiptRef: IdRef;
    settlementRef: IdRef;
    status: CommonActionStatus;
  }): Promise<ResourceIntent>;
}

export interface PaymentIntentTemplateResolver {
  resolvePaymentIntentTemplate(intentId: IdRef): PaymentIntent | undefined;
}

export interface ResourceIntentTemplateResolver {
  resolveResourceIntentTemplate(intentId: IdRef): ResourceIntent | undefined;
}
