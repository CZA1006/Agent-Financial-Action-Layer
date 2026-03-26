import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import { createSeededAmnRecords, createSeededInMemoryAmnService } from "./bootstrap";
import { InMemoryAmnService } from "./service";
import { InMemoryAmnStore } from "./store";

test("AMN service resolves seeded mandates", async () => {
  const service = createSeededInMemoryAmnService();
  const mandate = await service.getMandate(paymentFlowFixtures.paymentMandate.mandateId);

  assert.equal(mandate.mandateId, paymentFlowFixtures.paymentMandate.mandateId);
  assert.equal(mandate.status, "active");
});

test("AMN service evaluates seeded payment authorization", async () => {
  const service = createSeededInMemoryAmnService();
  const decision = await service.evaluateAuthorization({
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    actionType: "payment",
    subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
    mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
    policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
    accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
  });

  assert.equal(decision.result, "challenge-required");
  assert.equal(decision.reasonCode, "new-counterparty");
});

test("AMN service creates challenge and approval context", async () => {
  const service = createSeededInMemoryAmnService();
  const decision = await service.evaluateAuthorization({
    actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
    actionType: "resource",
    subjectDid: resourceFlowFixtures.resourceIntentCreated.requester.agentDid,
    mandateRef: resourceFlowFixtures.resourceMandate.mandateId,
    policyRef: resourceFlowFixtures.resourceIntentCreated.policyRef,
    accountRef: resourceFlowFixtures.resourceIntentCreated.requester.accountId,
  });
  const challenge = await service.createChallengeRecord(decision);
  const context = await service.buildApprovalContext(challenge);

  assert.equal(challenge.challengeId, resourceFlowFixtures.challengeRecord.challengeId);
  assert.equal(context.approvalContextId, resourceFlowFixtures.approvalContext.approvalContextId);
});

test("AMN service records approval result and finalizes approved authorization", async () => {
  const service = createSeededInMemoryAmnService();
  const priorDecision = await service.evaluateAuthorization({
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    actionType: "payment",
    subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
    mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
    policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
    accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
  });
  const approval = await service.recordApprovalResult(paymentFlowFixtures.approvalResult);
  const finalDecision = await service.finalizeAuthorization({
    priorDecision,
    approvalResult: approval,
  });

  assert.equal(finalDecision.result, "approved");
  assert.equal(finalDecision.challengeState, "approved");
});

test("AMN service finalizes expired approval without approved template", async () => {
  const service = createSeededInMemoryAmnService();
  const priorDecision = await service.evaluateAuthorization({
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    actionType: "payment",
    subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
    mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
    policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
    accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
  });
  const finalDecision = await service.finalizeAuthorization({
    priorDecision,
    approvalResult: {
      ...paymentFlowFixtures.approvalResult,
      result: "expired",
      approvalReceiptRef: undefined,
    },
  });

  assert.equal(finalDecision.result, "expired");
  assert.equal(finalDecision.challengeState, "expired");
});

test("AMN service persists decisions through injected store", async () => {
  const records = createSeededAmnRecords();
  const store = new InMemoryAmnStore({ mandates: records.mandates });
  const service = new InMemoryAmnService({
    store,
    initialDecisionTemplates: records.initialDecisionTemplates,
    finalDecisionTemplates: records.finalDecisionTemplates,
    challengeTemplates: records.challengeTemplates,
    approvalContextTemplates: records.approvalContextTemplates,
    approvalResultTemplates: records.approvalResultTemplates,
  });

  const decision = await service.evaluateAuthorization({
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    actionType: "payment",
    subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
    mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
    policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
    accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
  });
  const persisted = await store.getDecision(decision.decisionId);

  assert.equal(persisted?.decisionId, decision.decisionId);
});

test("AMN bootstrap produces seeded templates for both canonical flows", () => {
  const records = createSeededAmnRecords();

  assert.equal(records.mandates.length, 2);
  assert.ok(records.initialDecisionTemplates[paymentFlowFixtures.paymentIntentCreated.intentId]);
  assert.ok(records.initialDecisionTemplates[resourceFlowFixtures.resourceIntentCreated.intentId]);
});
