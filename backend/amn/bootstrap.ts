import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import type {
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  ChallengeRecord,
  IdRef,
  Mandate,
} from "../../sdk/types";
import { InMemoryAmnService } from "./service";
import { InMemoryAmnStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SeededAmnRecords {
  mandates: Mandate[];
  initialDecisionTemplates: Record<IdRef, AuthorizationDecision>;
  finalDecisionTemplates: Record<IdRef, AuthorizationDecision>;
  challengeTemplates: Record<IdRef, ChallengeRecord>;
  approvalContextTemplates: Record<IdRef, ApprovalContext>;
  approvalResultTemplates: Record<IdRef, ApprovalResult>;
}

export function createSeededAmnRecords(): SeededAmnRecords {
  return {
    mandates: dedupeById([paymentFlowFixtures.paymentMandate, resourceFlowFixtures.resourceMandate], "mandateId"),
    initialDecisionTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.authorizationDecisionInitial),
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(resourceFlowFixtures.authorizationDecisionInitial),
    },
    finalDecisionTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.authorizationDecisionFinal),
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(resourceFlowFixtures.authorizationDecisionFinal),
    },
    challengeTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.challengeRecord),
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(resourceFlowFixtures.challengeRecord),
    },
    approvalContextTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.approvalContext),
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(resourceFlowFixtures.approvalContext),
    },
    approvalResultTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.approvalResult),
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(resourceFlowFixtures.approvalResult),
    },
  };
}

export function createSeededInMemoryAmnStore(): InMemoryAmnStore {
  const records = createSeededAmnRecords();
  return new InMemoryAmnStore({
    mandates: records.mandates,
  });
}

export function createSeededInMemoryAmnService(): InMemoryAmnService {
  const records = createSeededAmnRecords();
  return new InMemoryAmnService({
    store: createSeededInMemoryAmnStore(),
    initialDecisionTemplates: records.initialDecisionTemplates,
    finalDecisionTemplates: records.finalDecisionTemplates,
    challengeTemplates: records.challengeTemplates,
    approvalContextTemplates: records.approvalContextTemplates,
    approvalResultTemplates: records.approvalResultTemplates,
  });
}

function dedupeById<T, TKey extends keyof T>(records: T[], key: TKey): T[] {
  return Array.from(new Map(records.map((record) => [String(record[key]), record])).values()).map(clone);
}
