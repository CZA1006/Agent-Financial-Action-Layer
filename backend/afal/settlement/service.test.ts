import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  createSeededAfalSettlementRecords,
  createSeededAfalSettlementService,
} from "./bootstrap";
import { AfalSettlementService } from "./service";
import { InMemoryAfalSettlementStore } from "./store";

test("AFAL settlement service creates seeded payment and resource settlement records", async () => {
  const service = createSeededAfalSettlementService();

  const paymentSettlement = await service.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );
  const resourceUsage = await service.confirmResourceUsage(resourceFlowFixtures.resourceIntentCreated);
  const resourceSettlement = await service.settleResourceUsage({
    intent: resourceFlowFixtures.resourceIntentCreated,
    decision: resourceFlowFixtures.authorizationDecisionFinal,
    usage: resourceUsage,
  });

  assert.equal(paymentSettlement.settlementId, paymentFlowFixtures.settlementRecord.settlementId);
  assert.equal(resourceUsage.usageReceiptRef, resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef);
  assert.equal(resourceSettlement.settlementId, resourceFlowFixtures.settlementRecord.settlementId);
});

test("AFAL settlement service persists settlement and usage records through the injected store", async () => {
  const store = new InMemoryAfalSettlementStore();
  const service = new AfalSettlementService({ store });

  const usage = await service.confirmResourceUsage({
    intentId: "resint-generated-001",
    schemaVersion: "0.1",
    intentType: "resource",
    requester: {
      agentDid: "did:afal:agent:generated-001",
      accountId: "acct-generated-001",
    },
    provider: {
      providerId: "provider-generated-001",
      providerDid: "did:afal:institution:provider-generated-001",
    },
    resource: {
      resourceClass: "inference",
      resourceUnit: "tokens",
      quantity: 1000,
    },
    pricing: {
      maxSpend: "1.25",
      asset: "USDC",
    },
    budgetSource: {
      type: "ats-budget",
      reference: "budg-generated-001",
    },
    mandateRef: "mnd-generated-001",
    executionMode: "pre-authorized",
    challengeState: "not-required",
    status: "created",
    nonce: "nonce-generated-001",
    createdAt: "2026-03-24T12:00:00Z",
  });

  const settlement = await service.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );

  const persistedUsage = await store.getUsageConfirmation(usage.usageReceiptRef);
  const persistedSettlement = await store.getSettlement(settlement.settlementId);

  assert.equal(persistedUsage?.usageReceiptRef, usage.usageReceiptRef);
  assert.equal(persistedSettlement?.settlementId, settlement.settlementId);
});

test("AFAL settlement bootstrap exposes canonical templates", () => {
  const records = createSeededAfalSettlementRecords();

  assert.ok(records.paymentSettlementTemplates[paymentFlowFixtures.paymentIntentCreated.intentId]);
  assert.ok(records.resourceUsageTemplates[resourceFlowFixtures.resourceIntentCreated.intentId]);
  assert.ok(records.resourceSettlementTemplates[resourceFlowFixtures.resourceIntentCreated.intentId]);
});
