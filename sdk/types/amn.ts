import type { AuthorizationResult, ChallengeState, Did, IdRef, Timestamp } from "./common";

export type MandateType = "payment" | "resource" | "trade" | "venue-access" | "settlement";
export type MandateStatus =
  | "draft"
  | "issued"
  | "active"
  | "challenged"
  | "suspended"
  | "expired"
  | "revoked";

export interface Mandate {
  mandateId: IdRef;
  schemaVersion: "0.1";
  mandateType: MandateType;
  issuer: Did;
  subject: Did;
  status: MandateStatus;
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  scope: Record<string, unknown>;
  policyRef?: IdRef;
  challengeRules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuthorizationDecision {
  decisionId: IdRef;
  schemaVersion: "0.1";
  actionRef: IdRef;
  actionType: string;
  subjectDid: Did;
  mandateRef: IdRef;
  policyRef?: IdRef;
  accountRef?: IdRef;
  result: AuthorizationResult;
  challengeState: ChallengeState;
  reasonCode?: string;
  evaluatedAt: Timestamp;
  expiresAt?: Timestamp;
  auditRef?: IdRef;
}

export interface ChallengeRecord {
  challengeId: IdRef;
  schemaVersion: "0.1";
  actionRef: IdRef;
  actionType: string;
  subjectDid: Did;
  mandateRef?: IdRef;
  policyRef?: IdRef;
  state: ChallengeState;
  reasonCode: string;
  riskSignals: string[];
  trustedSurfaceRef: string;
  approvalContextRef?: IdRef;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface ApprovalContext {
  approvalContextId: IdRef;
  challengeRef: IdRef;
  actionRef: IdRef;
  actionType: string;
  headline: string;
  summary: string;
  subjectDid: Did;
  humanVisibleFields: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface ApprovalResult {
  approvalResultId: IdRef;
  challengeRef: IdRef;
  actionRef: IdRef;
  result: "approved" | "rejected" | "expired" | "cancelled";
  approvedBy: Did;
  approvalChannel: string;
  stepUpAuthUsed: boolean;
  comment?: string;
  approvalReceiptRef?: IdRef;
  decidedAt: Timestamp;
}

export type ApprovalSessionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "finalized";

export interface ApprovalSession {
  approvalSessionId: IdRef;
  schemaVersion: "0.1";
  actionRef: IdRef;
  actionType: string;
  subjectDid: Did;
  mandateRef?: IdRef;
  policyRef?: IdRef;
  priorDecisionRef: IdRef;
  challengeRef: IdRef;
  approvalContextRef: IdRef;
  approvalResultRef?: IdRef;
  finalDecisionRef?: IdRef;
  trustedSurfaceRef: string;
  status: ApprovalSessionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}
