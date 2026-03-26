import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  createSeededAfalIntentStateRecords,
  createSeededAfalIntentStateService,
} from "./bootstrap";
import { AfalIntentStateService } from "./service";
import { InMemoryAfalIntentStore } from "./store";

test("AFAL intent state service creates and settles seeded payment intents", async () => {
  const service = createSeededAfalIntentStateService();

  await service.createPaymentIntent(paymentFlowFixtures.paymentIntentCreated);
  await service.markPaymentChallenge({
    intentId: paymentFlowFixtures.paymentIntentCreated.intentId,
    decisionRef: paymentFlowFixtures.authorizationDecisionInitial.decisionId,
    challengeRef: paymentFlowFixtures.challengeRecord.challengeId,
    challengeState: "pending-approval",
    status: "pending-approval",
  });
  const settled = await service.markPaymentSettlement({
    intentId: paymentFlowFixtures.paymentIntentCreated.intentId,
    decisionRef: paymentFlowFixtures.authorizationDecisionFinal.decisionId,
    challengeRef: paymentFlowFixtures.challengeRecord.challengeId,
    challengeState: "approved",
    settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
    receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
    status: "settled",
  });

  assert.equal(settled.status, "settled");
  assert.equal(settled.challengeRef, paymentFlowFixtures.challengeRecord.challengeId);
  assert.equal(settled.settlementRef, paymentFlowFixtures.settlementRecord.settlementId);
  assert.equal(settled.receiptRef, paymentFlowFixtures.paymentReceipt.receiptId);
});

test("AFAL intent state service creates and settles seeded resource intents", async () => {
  const service = createSeededAfalIntentStateService();

  await service.createResourceIntent(resourceFlowFixtures.resourceIntentCreated);
  await service.markResourceChallenge({
    intentId: resourceFlowFixtures.resourceIntentCreated.intentId,
    decisionRef: resourceFlowFixtures.authorizationDecisionInitial.decisionId,
    challengeRef: resourceFlowFixtures.challengeRecord.challengeId,
    challengeState: "pending-approval",
    status: "pending-approval",
  });
  const settled = await service.markResourceSettlement({
    intentId: resourceFlowFixtures.resourceIntentCreated.intentId,
    decisionRef: resourceFlowFixtures.authorizationDecisionFinal.decisionId,
    challengeRef: resourceFlowFixtures.challengeRecord.challengeId,
    challengeState: "approved",
    usageReceiptRef: resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef,
    settlementRef: resourceFlowFixtures.settlementRecord.settlementId,
    status: "settled",
  });

  assert.equal(settled.status, "settled");
  assert.equal(settled.usageReceiptRef, resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef);
  assert.equal(settled.settlementRef, resourceFlowFixtures.settlementRecord.settlementId);
});

test("AFAL intent state service persists records through the injected store", async () => {
  const store = new InMemoryAfalIntentStore();
  const service = new AfalIntentStateService({ store });

  await service.createPaymentIntent({
    ...paymentFlowFixtures.paymentIntentCreated,
    intentId: "payint-generated-001",
    nonce: "nonce-generated-001",
  });
  const stored = await store.getPaymentIntent("payint-generated-001");

  assert.equal(stored?.intentId, "payint-generated-001");
});

test("AFAL intent bootstrap exposes canonical templates", () => {
  const records = createSeededAfalIntentStateRecords();

  assert.ok(records.paymentIntentTemplates[paymentFlowFixtures.paymentIntentCreated.intentId]);
  assert.ok(records.resourceIntentTemplates[resourceFlowFixtures.resourceIntentCreated.intentId]);
});

test("AFAL intent state service persists pending approval executions", async () => {
  const service = createSeededAfalIntentStateService();

  await service.createPendingExecution({
    approvalSessionRef: "asess-payment-001",
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    actionType: "payment",
    requestRef: "req-payment-pending-001",
    reservationRef: "resv-pay-001",
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    status: "pending",
    createdAt: paymentFlowFixtures.paymentIntentCreated.createdAt,
    updatedAt: paymentFlowFixtures.paymentIntentCreated.createdAt,
  });
  const resumed = await service.markPendingExecution({
    approvalSessionRef: "asess-payment-001",
    status: "resumed",
    finalDecisionRef: paymentFlowFixtures.authorizationDecisionFinal.decisionId,
    settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
    receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
    updatedAt: paymentFlowFixtures.settlementRecord.settledAt,
  });

  assert.equal(resumed.status, "resumed");
  assert.equal(resumed.finalDecisionRef, paymentFlowFixtures.authorizationDecisionFinal.decisionId);
  assert.equal(resumed.receiptRef, paymentFlowFixtures.paymentReceipt.receiptId);
});
