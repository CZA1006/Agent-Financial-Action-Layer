import type {
  AgentActorRef,
  AuthorizationResult,
  ChallengeState,
  CommonActionStatus,
  CounterpartyRef,
  DecimalString,
  IdRef,
  ProviderRef,
  Timestamp,
} from "./common";

export interface PaymentIntent {
  intentId: IdRef;
  schemaVersion: "0.1";
  intentType: "payment";
  payer: AgentActorRef;
  payee: CounterpartyRef;
  asset: string;
  amount: DecimalString;
  chain: string;
  purpose: {
    category: string;
    description: string;
    referenceId?: IdRef;
  };
  mandateRef: IdRef;
  policyRef?: IdRef;
  executionMode: "human-in-the-loop" | "pre-authorized" | "fully-agent-native";
  challengeState: ChallengeState;
  status: CommonActionStatus;
  expiresAt?: Timestamp;
  nonce: string;
  createdAt: Timestamp;
  decisionRef?: IdRef;
  challengeRef?: IdRef;
  settlementRef?: IdRef;
  receiptRef?: IdRef;
}

export interface ResourceIntent {
  intentId: IdRef;
  schemaVersion: "0.1";
  intentType: "resource";
  requester: AgentActorRef;
  provider: ProviderRef;
  resource: {
    resourceClass: string;
    resourceUnit: string;
    quantity: number;
  };
  pricing: {
    maxSpend: DecimalString;
    asset: string;
  };
  budgetSource: {
    type: "ats-budget";
    reference: IdRef;
  };
  mandateRef: IdRef;
  policyRef?: IdRef;
  executionMode: "human-in-the-loop" | "pre-authorized" | "fully-agent-native";
  challengeState: ChallengeState;
  status: CommonActionStatus;
  expiresAt?: Timestamp;
  nonce: string;
  createdAt: Timestamp;
  decisionRef?: IdRef;
  challengeRef?: IdRef;
  settlementRef?: IdRef;
  usageReceiptRef?: IdRef;
}

export interface SettlementRecord {
  settlementId: IdRef;
  schemaVersion: "0.1";
  settlementType: "onchain-transfer" | "provider-settlement" | "internal-ledger";
  actionRef: IdRef;
  decisionRef?: IdRef;
  sourceAccountRef: IdRef;
  destination: CounterpartyRef | ProviderRef;
  asset: string;
  amount: DecimalString;
  chain?: string;
  txHash?: string;
  status: "pending" | "executing" | "settled" | "failed" | "reversed";
  executedAt?: Timestamp;
  settledAt?: Timestamp;
}

export interface ActionReceipt {
  receiptId: IdRef;
  schemaVersion: "0.1";
  receiptType: "payment" | "resource" | "approval";
  actionRef: IdRef;
  decisionRef?: IdRef;
  settlementRef?: IdRef;
  status: "provisional" | "final" | "void";
  issuedAt: Timestamp;
  evidence: Record<string, unknown>;
}

export interface CapabilityResponse {
  responseId: IdRef;
  schemaVersion: "0.1";
  capability: string;
  requestRef: IdRef;
  actionRef?: IdRef;
  result: AuthorizationResult;
  decisionRef?: IdRef | null;
  challengeRef?: IdRef | null;
  settlementRef?: IdRef | null;
  receiptRef?: IdRef | null;
  message?: string;
  respondedAt: Timestamp;
}
