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
import type { AmnPort } from "../afal/interfaces";
import type { AmnAdminPort } from "./interfaces";
import { InMemoryAmnStore, type AmnStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertFound<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function overlayDecision(
  template: AuthorizationDecision,
  args: {
    actionRef: IdRef;
    actionType: "payment" | "resource";
    subjectDid: Did;
    mandateRef: IdRef;
    policyRef?: IdRef;
    accountRef?: IdRef;
  }
): AuthorizationDecision {
  return {
    ...clone(template),
    actionRef: args.actionRef,
    actionType: args.actionType,
    subjectDid: args.subjectDid,
    mandateRef: args.mandateRef,
    policyRef: args.policyRef,
    accountRef: args.accountRef,
  };
}

function createApprovalSessionId(challengeRef: IdRef): IdRef {
  return `aps-${challengeRef}`;
}

function mapApprovalResultToSessionStatus(
  result: ApprovalResult["result"]
): ApprovalSession["status"] {
  if (result === "approved") return "approved";
  if (result === "rejected") return "rejected";
  if (result === "expired") return "expired";
  return "cancelled";
}

export interface InMemoryAmnServiceOptions {
  store?: AmnStore;
  mandates?: Mandate[];
  initialDecisionTemplates?: Record<IdRef, AuthorizationDecision>;
  finalDecisionTemplates?: Record<IdRef, AuthorizationDecision>;
  challengeTemplates?: Record<IdRef, ChallengeRecord>;
  approvalContextTemplates?: Record<IdRef, ApprovalContext>;
  approvalResultTemplates?: Record<IdRef, ApprovalResult>;
}

export class InMemoryAmnService implements AmnPort, AmnAdminPort {
  private readonly store: AmnStore;
  private readonly initialDecisionTemplates: Record<IdRef, AuthorizationDecision>;
  private readonly finalDecisionTemplates: Record<IdRef, AuthorizationDecision>;
  private readonly challengeTemplates: Record<IdRef, ChallengeRecord>;
  private readonly approvalContextTemplates: Record<IdRef, ApprovalContext>;
  private readonly approvalResultTemplates: Record<IdRef, ApprovalResult>;

  constructor(options: InMemoryAmnServiceOptions = {}) {
    this.store =
      options.store ??
      new InMemoryAmnStore({
        mandates: options.mandates,
      });
    this.initialDecisionTemplates = clone(options.initialDecisionTemplates ?? {});
    this.finalDecisionTemplates = clone(options.finalDecisionTemplates ?? {});
    this.challengeTemplates = clone(options.challengeTemplates ?? {});
    this.approvalContextTemplates = clone(options.approvalContextTemplates ?? {});
    this.approvalResultTemplates = clone(options.approvalResultTemplates ?? {});
  }

  async getMandate(mandateRef: IdRef): Promise<Mandate> {
    return clone(assertFound(await this.store.getMandate(mandateRef), `Unknown mandateRef "${mandateRef}"`));
  }

  async listMandates(): Promise<Mandate[]> {
    return this.store.listMandates();
  }

  async getDecision(decisionRef: IdRef): Promise<AuthorizationDecision> {
    return clone(assertFound(await this.store.getDecision(decisionRef), `Unknown decisionRef "${decisionRef}"`));
  }

  async listDecisions(): Promise<AuthorizationDecision[]> {
    return this.store.listDecisions();
  }

  async getChallenge(challengeRef: IdRef): Promise<ChallengeRecord> {
    return clone(assertFound(await this.store.getChallenge(challengeRef), `Unknown challengeRef "${challengeRef}"`));
  }

  async listChallenges(): Promise<ChallengeRecord[]> {
    return this.store.listChallenges();
  }

  async getApprovalContext(approvalContextRef: IdRef): Promise<ApprovalContext> {
    return clone(
      assertFound(await this.store.getApprovalContext(approvalContextRef), `Unknown approvalContextRef "${approvalContextRef}"`)
    );
  }

  async listApprovalContexts(): Promise<ApprovalContext[]> {
    return this.store.listApprovalContexts();
  }

  async getApprovalResult(approvalResultRef: IdRef): Promise<ApprovalResult> {
    return clone(
      assertFound(await this.store.getApprovalResult(approvalResultRef), `Unknown approvalResultRef "${approvalResultRef}"`)
    );
  }

  async listApprovalResults(): Promise<ApprovalResult[]> {
    return this.store.listApprovalResults();
  }

  async getApprovalSession(approvalSessionRef: IdRef): Promise<ApprovalSession> {
    return clone(
      assertFound(
        await this.store.getApprovalSession(approvalSessionRef),
        `Unknown approvalSessionRef "${approvalSessionRef}"`
      )
    );
  }

  async listApprovalSessions(): Promise<ApprovalSession[]> {
    return this.store.listApprovalSessions();
  }

  async evaluateAuthorization(args: {
    actionRef: IdRef;
    actionType: "payment" | "resource";
    subjectDid: Did;
    mandateRef: IdRef;
    policyRef?: IdRef;
    accountRef: IdRef;
  }): Promise<AuthorizationDecision> {
    await this.getMandate(args.mandateRef);
    const template = assertFound(
      this.initialDecisionTemplates[args.actionRef],
      `Unknown actionRef "${args.actionRef}" for AMN evaluation`
    );
    const decision = overlayDecision(template, args);
    await this.store.putDecision(decision);
    return decision;
  }

  async createChallengeRecord(decision: AuthorizationDecision): Promise<ChallengeRecord> {
    const template = assertFound(
      this.challengeTemplates[decision.actionRef],
      `Unknown actionRef "${decision.actionRef}" for AMN challenge creation`
    );
    const challenge: ChallengeRecord = {
      ...clone(template),
      actionRef: decision.actionRef,
      actionType: decision.actionType,
      subjectDid: decision.subjectDid,
      mandateRef: decision.mandateRef,
      policyRef: decision.policyRef,
      reasonCode: decision.reasonCode ?? template.reasonCode,
    };
    await this.store.putChallenge(challenge);
    return challenge;
  }

  async buildApprovalContext(
    challenge: ChallengeRecord,
    overrides?: Partial<Pick<ApprovalContext, "headline" | "summary" | "humanVisibleFields">>
  ): Promise<ApprovalContext> {
    const template = assertFound(
      this.approvalContextTemplates[challenge.actionRef],
      `Unknown actionRef "${challenge.actionRef}" for AMN approval context`
    );
    const context: ApprovalContext = {
      ...clone(template),
      ...clone(overrides ?? {}),
      challengeRef: challenge.challengeId,
      actionRef: challenge.actionRef,
    };
    await this.store.putApprovalContext(context);
    return context;
  }

  async recordApprovalResult(result: ApprovalResult): Promise<ApprovalResult> {
    const template = this.approvalResultTemplates[result.actionRef];
    const approvalResult: ApprovalResult = template
      ? {
          ...clone(template),
          ...clone(result),
        }
      : clone(result);
    await this.store.putApprovalResult(approvalResult);
    return approvalResult;
  }

  async createApprovalRequest(
    priorDecision: AuthorizationDecision,
    args?: {
      approvalContext?: Partial<
        Pick<ApprovalContext, "headline" | "summary" | "humanVisibleFields">
      >;
    }
  ): Promise<{
    challenge: ChallengeRecord;
    approvalContext: ApprovalContext;
    approvalSession: ApprovalSession;
  }> {
    const createdChallenge = await this.createChallengeRecord(priorDecision);
    const approvalContext = await this.buildApprovalContext(
      createdChallenge,
      args?.approvalContext
    );
    const challenge: ChallengeRecord = {
      ...createdChallenge,
      state: "pending-approval",
      approvalContextRef: approvalContext.approvalContextId,
      updatedAt: approvalContext.createdAt,
    };
    await this.store.putChallenge(challenge);

    const approvalSession: ApprovalSession = {
      approvalSessionId: createApprovalSessionId(challenge.challengeId),
      schemaVersion: "0.1",
      actionRef: priorDecision.actionRef,
      actionType: priorDecision.actionType,
      subjectDid: priorDecision.subjectDid,
      mandateRef: priorDecision.mandateRef,
      policyRef: priorDecision.policyRef,
      priorDecisionRef: priorDecision.decisionId,
      challengeRef: challenge.challengeId,
      approvalContextRef: approvalContext.approvalContextId,
      trustedSurfaceRef: challenge.trustedSurfaceRef,
      status: "pending",
      createdAt: challenge.createdAt,
      updatedAt: approvalContext.createdAt,
      expiresAt: challenge.expiresAt,
    };
    await this.store.putApprovalSession(approvalSession);

    return {
      challenge,
      approvalContext,
      approvalSession,
    };
  }

  async applyApprovalResult(args: {
    approvalSessionRef: IdRef;
    result: ApprovalResult;
  }): Promise<{
    approvalResult: ApprovalResult;
    approvalSession: ApprovalSession;
    challenge: ChallengeRecord;
  }> {
    const approvalSession = await this.getApprovalSession(args.approvalSessionRef);
    const existingChallenge = await this.getChallenge(approvalSession.challengeRef);
    const approvalResult = await this.recordApprovalResult({
      ...clone(args.result),
      challengeRef: approvalSession.challengeRef,
      actionRef: approvalSession.actionRef,
    });
    const challenge: ChallengeRecord = {
      ...existingChallenge,
      state: approvalResult.result,
      updatedAt: approvalResult.decidedAt,
    };
    const nextSession: ApprovalSession = {
      ...approvalSession,
      approvalResultRef: approvalResult.approvalResultId,
      status: mapApprovalResultToSessionStatus(approvalResult.result),
      updatedAt: approvalResult.decidedAt,
    };

    await this.store.putChallenge(challenge);
    await this.store.putApprovalSession(nextSession);

    return {
      approvalResult,
      approvalSession: nextSession,
      challenge,
    };
  }

  async resumeAuthorizationSession(approvalSessionRef: IdRef): Promise<{
    finalDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
    approvalSession: ApprovalSession;
    challenge: ChallengeRecord;
  }> {
    const approvalSession = await this.getApprovalSession(approvalSessionRef);
    const challenge = await this.getChallenge(approvalSession.challengeRef);
    const approvalResult = assertFound(
      approvalSession.approvalResultRef
        ? await this.store.getApprovalResult(approvalSession.approvalResultRef)
        : undefined,
      `Approval session "${approvalSessionRef}" has no persisted approval result`
    );

    if (approvalSession.finalDecisionRef) {
      return {
        finalDecision: await this.getDecision(approvalSession.finalDecisionRef),
        approvalResult: clone(approvalResult),
        approvalSession,
        challenge,
      };
    }

    const priorDecision = await this.getDecision(approvalSession.priorDecisionRef);
    const finalDecision = await this.finalizeAuthorization({
      priorDecision,
      approvalResult,
    });
    const nextSession: ApprovalSession = {
      ...approvalSession,
      finalDecisionRef: finalDecision.decisionId,
      status: "finalized",
      updatedAt: approvalResult.decidedAt,
    };
    await this.store.putApprovalSession(nextSession);

    return {
      finalDecision,
      approvalResult: clone(approvalResult),
      approvalSession: nextSession,
      challenge,
    };
  }

  async finalizeAuthorization(args: {
    priorDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
  }): Promise<AuthorizationDecision> {
    let decision: AuthorizationDecision;
    if (args.approvalResult.result !== "approved") {
      decision = {
        ...clone(args.priorDecision),
        result: args.approvalResult.result === "expired" ? "expired" : "rejected",
        challengeState: args.approvalResult.result,
        reasonCode: `approval-${args.approvalResult.result}`,
        evaluatedAt: args.approvalResult.decidedAt,
      };
    } else {
      const template = assertFound(
        this.finalDecisionTemplates[args.priorDecision.actionRef],
        `Unknown actionRef "${args.priorDecision.actionRef}" for AMN finalization`
      );
      decision = overlayDecision(template, {
        actionRef: args.priorDecision.actionRef,
        actionType: args.priorDecision.actionType as "payment" | "resource",
        subjectDid: args.priorDecision.subjectDid,
        mandateRef: args.priorDecision.mandateRef,
        policyRef: args.priorDecision.policyRef,
        accountRef: args.priorDecision.accountRef,
      });
    }

    await this.store.putDecision(decision);
    return decision;
  }
}
