import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import { createSeededAmnRecords } from "./bootstrap";
import { JsonFileAmnStore } from "./file-store";
import { InMemoryAmnService } from "./service";

test("AMN JSON file store persists seeded records across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-amn-store-"));

  try {
    const filePath = join(dir, "amn-store.json");
    const seeded = createSeededAmnRecords();
    const store = new JsonFileAmnStore({
      filePath,
      seed: {
        mandates: seeded.mandates,
        decisions: [],
        challenges: [],
        approvalContexts: [],
        approvalResults: [],
      },
    });

    const mandate = await store.getMandate(paymentFlowFixtures.paymentMandate.mandateId);
    assert.equal(mandate?.mandateId, paymentFlowFixtures.paymentMandate.mandateId);

    const reopenedStore = new JsonFileAmnStore({ filePath });
    const reopenedMandate = await reopenedStore.getMandate(
      paymentFlowFixtures.paymentMandate.mandateId
    );
    assert.equal(reopenedMandate?.mandateId, paymentFlowFixtures.paymentMandate.mandateId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("AMN service state survives re-instantiation when backed by the JSON file store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-amn-service-"));

  try {
    const filePath = join(dir, "amn-store.json");
    const seeded = createSeededAmnRecords();
    const store = new JsonFileAmnStore({
      filePath,
      seed: {
        mandates: seeded.mandates,
        decisions: [],
        challenges: [],
        approvalContexts: [],
        approvalResults: [],
      },
    });

    const firstService = new InMemoryAmnService({
      store,
      initialDecisionTemplates: seeded.initialDecisionTemplates,
      finalDecisionTemplates: seeded.finalDecisionTemplates,
      challengeTemplates: seeded.challengeTemplates,
      approvalContextTemplates: seeded.approvalContextTemplates,
      approvalResultTemplates: seeded.approvalResultTemplates,
    });

    const decision = await firstService.evaluateAuthorization({
      actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
      actionType: "resource",
      subjectDid: resourceFlowFixtures.resourceIntentCreated.requester.agentDid,
      mandateRef: resourceFlowFixtures.resourceMandate.mandateId,
      policyRef: resourceFlowFixtures.resourceIntentCreated.policyRef,
      accountRef: resourceFlowFixtures.resourceIntentCreated.requester.accountId,
    });
    const challenge = await firstService.createChallengeRecord(decision);
    const context = await firstService.buildApprovalContext(challenge);
    const result = await firstService.recordApprovalResult(resourceFlowFixtures.approvalResult);
    const finalDecision = await firstService.finalizeAuthorization({
      priorDecision: decision,
      approvalResult: result,
    });

    const secondService = new InMemoryAmnService({
      store: new JsonFileAmnStore({ filePath }),
      initialDecisionTemplates: seeded.initialDecisionTemplates,
      finalDecisionTemplates: seeded.finalDecisionTemplates,
      challengeTemplates: seeded.challengeTemplates,
      approvalContextTemplates: seeded.approvalContextTemplates,
      approvalResultTemplates: seeded.approvalResultTemplates,
    });

    const persistedDecision = await secondService.getDecision(finalDecision.decisionId);
    const persistedChallenge = await secondService.getChallenge(challenge.challengeId);
    const persistedContext = await secondService.getApprovalContext(context.approvalContextId);
    const persistedResult = await secondService.getApprovalResult(result.approvalResultId);

    assert.equal(persistedDecision.decisionId, finalDecision.decisionId);
    assert.equal(persistedDecision.result, "approved");
    assert.equal(persistedChallenge.challengeId, challenge.challengeId);
    assert.equal(persistedContext.approvalContextId, context.approvalContextId);
    assert.equal(persistedResult.approvalResultId, result.approvalResultId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
