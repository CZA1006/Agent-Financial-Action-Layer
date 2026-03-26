import type {
  ApprovalContext,
  ApprovalResult,
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

  async buildApprovalContext(challenge: ChallengeRecord): Promise<ApprovalContext> {
    const template = assertFound(
      this.approvalContextTemplates[challenge.actionRef],
      `Unknown actionRef "${challenge.actionRef}" for AMN approval context`
    );
    const context: ApprovalContext = {
      ...clone(template),
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
