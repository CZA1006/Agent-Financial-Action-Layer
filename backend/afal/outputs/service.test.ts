import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  createSeededAfalOutputRecords,
  createSeededAfalOutputService,
} from "./bootstrap";
import { AfalOutputService } from "./service";
import { InMemoryAfalOutputStore } from "./store";

test("AFAL output service creates seeded approval and action receipts", async () => {
  const service = createSeededAfalOutputService();

  const approvalReceipt = await service.createApprovalReceipt({
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    decisionRef: paymentFlowFixtures.authorizationDecisionFinal.decisionId,
    approvalResult: paymentFlowFixtures.approvalResult,
  });
  const actionReceipt = await service.createActionReceipt({
    receiptType: "payment",
    actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
    decisionRef: paymentFlowFixtures.authorizationDecisionFinal.decisionId,
    settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
    evidence: paymentFlowFixtures.paymentReceipt.evidence,
    issuedAt: paymentFlowFixtures.paymentReceipt.issuedAt,
  });

  assert.equal(approvalReceipt.receiptId, paymentFlowFixtures.approvalReceipt.receiptId);
  assert.equal(actionReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
});

test("AFAL output service creates seeded capability responses", async () => {
  const service = createSeededAfalOutputService();

  const response = await service.createCapabilityResponse({
    capability: "settleResourceUsage",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
    result: resourceFlowFixtures.authorizationDecisionFinal.result,
    decisionRef: resourceFlowFixtures.authorizationDecisionFinal.decisionId,
    challengeRef: resourceFlowFixtures.challengeRecord.challengeId,
    settlementRef: resourceFlowFixtures.settlementRecord.settlementId,
    receiptRef: resourceFlowFixtures.resourceReceipt.receiptId,
    message: resourceFlowFixtures.capabilityResponse.message,
  });

  assert.equal(response.responseId, resourceFlowFixtures.capabilityResponse.responseId);
  assert.equal(response.capability, "settleResourceUsage");
});

test("AFAL output service persists records through the injected store", async () => {
  const store = new InMemoryAfalOutputStore();
  const service = new AfalOutputService({ store });

  const receipt = await service.createActionReceipt({
    receiptType: "resource",
    actionRef: "resint-generated-001",
    evidence: { status: "ok" },
  });
  const response = await service.createCapabilityResponse({
    capability: "executePayment",
    requestRef: "req-generated-001",
    actionRef: "payint-generated-001",
    result: "approved",
  });

  const persistedReceipt = await store.getReceipt(receipt.receiptId);
  const persistedResponse = await store.getCapabilityResponse(response.responseId);

  assert.equal(persistedReceipt?.receiptId, receipt.receiptId);
  assert.equal(persistedResponse?.responseId, response.responseId);
});

test("AFAL output bootstrap exposes canonical templates", () => {
  const records = createSeededAfalOutputRecords();

  assert.ok(records.receiptTemplates[`approval:${paymentFlowFixtures.paymentIntentCreated.intentId}`]);
  assert.ok(
    records.capabilityResponseTemplates[
      `settleResourceUsage:${resourceFlowFixtures.resourceIntentCreated.intentId}`
    ]
  );
});
