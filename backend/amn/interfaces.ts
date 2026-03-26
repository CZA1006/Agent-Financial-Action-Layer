import type {
  ApprovalContext,
  ApprovalResult,
  ApprovalSession,
  AuthorizationDecision,
  ChallengeRecord,
  Did,
  IdRef,
  Mandate,
} from "../../sdk/types";

export interface AmnMandateReader {
  getMandate(mandateRef: IdRef): Promise<Mandate>;
  listMandates(): Promise<Mandate[]>;
}

export interface AmnDecisionReader {
  getDecision(decisionRef: IdRef): Promise<AuthorizationDecision>;
  listDecisions(): Promise<AuthorizationDecision[]>;
}

export interface AmnChallengeReader {
  getChallenge(challengeRef: IdRef): Promise<ChallengeRecord>;
  listChallenges(): Promise<ChallengeRecord[]>;
}

export interface AmnApprovalReader {
  getApprovalContext(approvalContextRef: IdRef): Promise<ApprovalContext>;
  getApprovalResult(approvalResultRef: IdRef): Promise<ApprovalResult>;
  getApprovalSession(approvalSessionRef: IdRef): Promise<ApprovalSession>;
  listApprovalContexts(): Promise<ApprovalContext[]>;
  listApprovalResults(): Promise<ApprovalResult[]>;
  listApprovalSessions(): Promise<ApprovalSession[]>;
}

export interface AmnAdminPort
  extends AmnMandateReader,
    AmnDecisionReader,
    AmnChallengeReader,
    AmnApprovalReader {
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
  createApprovalRequest(priorDecision: AuthorizationDecision): Promise<{
    challenge: ChallengeRecord;
    approvalContext: ApprovalContext;
    approvalSession: ApprovalSession;
  }>;
  applyApprovalResult(args: {
    approvalSessionRef: IdRef;
    result: ApprovalResult;
  }): Promise<{
    approvalResult: ApprovalResult;
    approvalSession: ApprovalSession;
    challenge: ChallengeRecord;
  }>;
  resumeAuthorizationSession(approvalSessionRef: IdRef): Promise<{
    finalDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
    approvalSession: ApprovalSession;
    challenge: ChallengeRecord;
  }>;
  finalizeAuthorization(args: {
    priorDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
  }): Promise<AuthorizationDecision>;
}
