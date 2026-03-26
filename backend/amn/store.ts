import type {
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  ChallengeRecord,
  IdRef,
  Mandate,
} from "../../sdk/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AmnStore {
  getMandate(mandateRef: IdRef): Promise<Mandate | undefined>;
  putMandate(mandate: Mandate): Promise<void>;
  listMandates(): Promise<Mandate[]>;
  getDecision(decisionRef: IdRef): Promise<AuthorizationDecision | undefined>;
  putDecision(decision: AuthorizationDecision): Promise<void>;
  listDecisions(): Promise<AuthorizationDecision[]>;
  getChallenge(challengeRef: IdRef): Promise<ChallengeRecord | undefined>;
  putChallenge(challenge: ChallengeRecord): Promise<void>;
  listChallenges(): Promise<ChallengeRecord[]>;
  getApprovalContext(approvalContextRef: IdRef): Promise<ApprovalContext | undefined>;
  putApprovalContext(context: ApprovalContext): Promise<void>;
  listApprovalContexts(): Promise<ApprovalContext[]>;
  getApprovalResult(approvalResultRef: IdRef): Promise<ApprovalResult | undefined>;
  putApprovalResult(result: ApprovalResult): Promise<void>;
  listApprovalResults(): Promise<ApprovalResult[]>;
}

export interface InMemoryAmnStoreOptions {
  mandates?: Mandate[];
  decisions?: AuthorizationDecision[];
  challenges?: ChallengeRecord[];
  approvalContexts?: ApprovalContext[];
  approvalResults?: ApprovalResult[];
}

export class InMemoryAmnStore implements AmnStore {
  private readonly mandates = new Map<IdRef, Mandate>();
  private readonly decisions = new Map<IdRef, AuthorizationDecision>();
  private readonly challenges = new Map<IdRef, ChallengeRecord>();
  private readonly approvalContexts = new Map<IdRef, ApprovalContext>();
  private readonly approvalResults = new Map<IdRef, ApprovalResult>();

  constructor(options: InMemoryAmnStoreOptions = {}) {
    for (const mandate of options.mandates ?? []) this.mandates.set(mandate.mandateId, clone(mandate));
    for (const decision of options.decisions ?? []) this.decisions.set(decision.decisionId, clone(decision));
    for (const challenge of options.challenges ?? []) this.challenges.set(challenge.challengeId, clone(challenge));
    for (const context of options.approvalContexts ?? []) {
      this.approvalContexts.set(context.approvalContextId, clone(context));
    }
    for (const result of options.approvalResults ?? []) {
      this.approvalResults.set(result.approvalResultId, clone(result));
    }
  }

  async getMandate(mandateRef: IdRef) { const value = this.mandates.get(mandateRef); return value ? clone(value) : undefined; }
  async putMandate(mandate: Mandate) { this.mandates.set(mandate.mandateId, clone(mandate)); }
  async listMandates() { return Array.from(this.mandates.values()).map(clone); }
  async getDecision(decisionRef: IdRef) { const value = this.decisions.get(decisionRef); return value ? clone(value) : undefined; }
  async putDecision(decision: AuthorizationDecision) { this.decisions.set(decision.decisionId, clone(decision)); }
  async listDecisions() { return Array.from(this.decisions.values()).map(clone); }
  async getChallenge(challengeRef: IdRef) { const value = this.challenges.get(challengeRef); return value ? clone(value) : undefined; }
  async putChallenge(challenge: ChallengeRecord) { this.challenges.set(challenge.challengeId, clone(challenge)); }
  async listChallenges() { return Array.from(this.challenges.values()).map(clone); }
  async getApprovalContext(approvalContextRef: IdRef) { const value = this.approvalContexts.get(approvalContextRef); return value ? clone(value) : undefined; }
  async putApprovalContext(context: ApprovalContext) { this.approvalContexts.set(context.approvalContextId, clone(context)); }
  async listApprovalContexts() { return Array.from(this.approvalContexts.values()).map(clone); }
  async getApprovalResult(approvalResultRef: IdRef) { const value = this.approvalResults.get(approvalResultRef); return value ? clone(value) : undefined; }
  async putApprovalResult(result: ApprovalResult) { this.approvalResults.set(result.approvalResultId, clone(result)); }
  async listApprovalResults() { return Array.from(this.approvalResults.values()).map(clone); }
}
