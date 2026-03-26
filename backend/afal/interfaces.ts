import type {
  AccountRecord,
  ActionReceipt,
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  CapabilityResponse,
  ChallengeRecord,
  Did,
  IdentityRecord,
  IdRef,
  MonetaryBudget,
  PaymentIntent,
  ResourceBudget,
  ResourceIntent,
  ResourceQuota,
  SettlementRecord,
  Timestamp,
} from "../../sdk/types";

export interface ProviderUsageConfirmation {
  usageReceiptRef: IdRef;
  providerId: string;
  providerDid: Did;
  resourceClass: string;
  resourceUnit: string;
  quantity: number;
  workflowId?: IdRef;
  taskClass?: string;
  confirmedAt: Timestamp;
}

export interface PaymentFlowInput {
  requestRef: IdRef;
  intent: PaymentIntent;
  monetaryBudgetRef?: IdRef;
}

export interface ResourceFlowInput {
  requestRef: IdRef;
  intent: ResourceIntent;
  resourceBudgetRef: IdRef;
  resourceQuotaRef: IdRef;
}

export interface AipPort {
  resolveIdentity(subjectDid: Did): Promise<IdentityRecord>;
  verifyCredential(credentialId: IdRef): Promise<boolean>;
}

export interface AtsPort {
  getAccountState(accountRef: IdRef): Promise<AccountRecord>;
  getMonetaryBudgetState(budgetRef: IdRef): Promise<MonetaryBudget>;
  getResourceBudgetState(budgetRef: IdRef): Promise<ResourceBudget>;
  getResourceQuotaState(quotaRef: IdRef): Promise<ResourceQuota>;
}

export interface AmnPort {
  evaluateAuthorization(args: {
    actionRef: IdRef;
    actionType: "payment" | "resource";
    subjectDid: Did;
    mandateRef: IdRef;
    policyRef?: IdRef;
    accountRef: IdRef;
  }): Promise<AuthorizationDecision>;
  createChallengeRecord(decision: AuthorizationDecision): Promise<ChallengeRecord>;
  buildApprovalContext(challenge: ChallengeRecord): Promise<ApprovalContext>;
  recordApprovalResult(result: ApprovalResult): Promise<ApprovalResult>;
  finalizeAuthorization(args: {
    priorDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
  }): Promise<AuthorizationDecision>;
}

export interface TrustedSurfacePort {
  requestApproval(context: ApprovalContext): Promise<ApprovalResult>;
}

export interface PaymentSettlementPort {
  executePayment(intent: PaymentIntent, decision: AuthorizationDecision): Promise<SettlementRecord>;
}

export interface ResourceSettlementPort {
  confirmResourceUsage(intent: ResourceIntent): Promise<ProviderUsageConfirmation>;
  settleResourceUsage(args: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  }): Promise<SettlementRecord>;
}

export interface ReceiptPort {
  createApprovalReceipt(args: {
    actionRef: IdRef;
    decisionRef?: IdRef;
    approvalResult: ApprovalResult;
  }): Promise<ActionReceipt>;
  createActionReceipt(args: {
    receiptType: "payment" | "resource";
    actionRef: IdRef;
    decisionRef?: IdRef;
    settlementRef?: IdRef;
    evidence: Record<string, unknown>;
    issuedAt?: Timestamp;
  }): Promise<ActionReceipt>;
}

export interface CapabilityResponsePort {
  createCapabilityResponse(args: {
    capability: string;
    requestRef: IdRef;
    actionRef: IdRef;
    result: AuthorizationDecision["result"];
    decisionRef?: IdRef;
    challengeRef?: IdRef | null;
    settlementRef?: IdRef | null;
    receiptRef?: IdRef | null;
    message?: string;
  }): Promise<CapabilityResponse>;
}

export interface IntentStatePort {
  createPaymentIntent(intent: PaymentIntent): Promise<PaymentIntent>;
  createResourceIntent(intent: ResourceIntent): Promise<ResourceIntent>;
  markPaymentChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: PaymentIntent["challengeState"];
    status: PaymentIntent["status"];
  }): Promise<PaymentIntent>;
  markPaymentSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: PaymentIntent["challengeState"];
    settlementRef: IdRef;
    receiptRef: IdRef;
    status: PaymentIntent["status"];
  }): Promise<PaymentIntent>;
  markResourceChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ResourceIntent["challengeState"];
    status: ResourceIntent["status"];
  }): Promise<ResourceIntent>;
  markResourceSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ResourceIntent["challengeState"];
    usageReceiptRef: IdRef;
    settlementRef: IdRef;
    status: ResourceIntent["status"];
  }): Promise<ResourceIntent>;
}

export interface PaymentFlowOutput {
  intent: PaymentIntent;
  initialDecision: AuthorizationDecision;
  challenge?: ChallengeRecord;
  approvalContext?: ApprovalContext;
  approvalResult?: ApprovalResult;
  finalDecision: AuthorizationDecision;
  settlement: SettlementRecord;
  approvalReceipt?: ActionReceipt;
  paymentReceipt: ActionReceipt;
  capabilityResponse: CapabilityResponse;
  updatedBudget?: MonetaryBudget;
}

export interface ResourceFlowOutput {
  intent: ResourceIntent;
  initialDecision: AuthorizationDecision;
  challenge?: ChallengeRecord;
  approvalContext?: ApprovalContext;
  approvalResult?: ApprovalResult;
  finalDecision: AuthorizationDecision;
  usageConfirmation: ProviderUsageConfirmation;
  settlement: SettlementRecord;
  approvalReceipt?: ActionReceipt;
  resourceReceipt: ActionReceipt;
  capabilityResponse: CapabilityResponse;
  updatedBudget: ResourceBudget;
  updatedQuota: ResourceQuota;
}

export interface PaymentFlowOrchestrator {
  executePaymentFlow(input: PaymentFlowInput): Promise<PaymentFlowOutput>;
}

export interface ResourceFlowOrchestrator {
  executeResourceSettlementFlow(input: ResourceFlowInput): Promise<ResourceFlowOutput>;
}

export interface AfalOrchestrationPorts {
  aip: AipPort;
  ats: AtsPort;
  amn: AmnPort;
  intents: IntentStatePort;
  trustedSurface: TrustedSurfacePort;
  paymentSettlement: PaymentSettlementPort;
  resourceSettlement: ResourceSettlementPort;
  receipts: ReceiptPort;
  capabilityResponses: CapabilityResponsePort;
}
