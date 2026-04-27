import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  createSeededPaymentRailAdapter,
  createSeededResourceProviderAdapter,
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

test("seeded external settlement adapters return canonical payment and provider records", async () => {
  const paymentAdapter = createSeededPaymentRailAdapter();
  const resourceAdapter = createSeededResourceProviderAdapter();

  const paymentSettlement = await paymentAdapter.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );
  const resourceUsage = await resourceAdapter.confirmResourceUsage(
    resourceFlowFixtures.resourceIntentCreated
  );
  const resourceSettlement = await resourceAdapter.settleResourceUsage({
    intent: resourceFlowFixtures.resourceIntentCreated,
    decision: resourceFlowFixtures.authorizationDecisionFinal,
    usage: resourceUsage,
  });

  assert.equal(paymentSettlement.settlementId, paymentFlowFixtures.settlementRecord.settlementId);
  assert.equal(resourceUsage.usageReceiptRef, resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef);
  assert.equal(resourceSettlement.settlementId, resourceFlowFixtures.settlementRecord.settlementId);
});

test("AFAL settlement service preserves external payment rail economic fields", async () => {
  const service = new AfalSettlementService({
    paymentAdapter: {
      async executePayment() {
        return {
          settlementId: "stl-wallet-payint-0001",
          schemaVersion: "0.1",
          settlementType: "onchain-transfer",
          actionRef: "adapter-action-ref",
          decisionRef: "adapter-decision-ref",
          sourceAccountRef: "adapter-source-account",
          destination: {
            payeeDid: paymentFlowFixtures.paymentIntentCreated.payee.payeeDid,
            settlementAddress: "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94",
          },
          asset: "USDC",
          amount: "0.01",
          chain: "base-sepolia",
          txHash: "0xbb053d513054da80442c04a5b63277d269a3a108633141bf2ca5f7a3d9fc7170",
          status: "settled",
          executedAt: "2026-04-27T09:12:34.038Z",
          settledAt: "2026-04-27T09:12:34.038Z",
        };
      },
    },
  });

  const settlement = await service.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );

  assert.equal(settlement.actionRef, paymentFlowFixtures.paymentIntentCreated.intentId);
  assert.equal(settlement.decisionRef, paymentFlowFixtures.authorizationDecisionFinal.decisionId);
  assert.equal(settlement.sourceAccountRef, paymentFlowFixtures.paymentIntentCreated.payer.accountId);
  assert.equal(settlement.amount, "0.01");
  assert.equal(settlement.chain, "base-sepolia");
  assert.equal(settlement.txHash, "0xbb053d513054da80442c04a5b63277d269a3a108633141bf2ca5f7a3d9fc7170");
  assert.deepEqual(settlement.destination, {
    payeeDid: paymentFlowFixtures.paymentIntentCreated.payee.payeeDid,
    settlementAddress: "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94",
  });
});

test("AFAL settlement service persists settlement and usage records through the injected store", async () => {
  const store = new InMemoryAfalSettlementStore();
  let paymentCalls = 0;
  let usageCalls = 0;
  let resourceSettlementCalls = 0;
  const service = new AfalSettlementService({
    store,
    paymentAdapter: {
      async executePayment(intent, decision) {
        paymentCalls += 1;
        return {
          ...paymentFlowFixtures.settlementRecord,
          actionRef: intent.intentId,
          decisionRef: decision.decisionId,
        };
      },
    },
    resourceAdapter: {
      async confirmResourceUsage(intent) {
        usageCalls += 1;
        return {
          ...resourceFlowFixtures.providerUsageConfirmation,
          providerId: intent.provider.providerId,
          providerDid: intent.provider.providerDid,
          resourceClass: intent.resource.resourceClass,
          resourceUnit: intent.resource.resourceUnit,
          quantity: intent.resource.quantity,
        };
      },
      async settleResourceUsage(args) {
        resourceSettlementCalls += 1;
        return {
          ...resourceFlowFixtures.settlementRecord,
          actionRef: args.intent.intentId,
          decisionRef: args.decision.decisionId,
        };
      },
    },
  });

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

  assert.equal(paymentCalls, 1);
  assert.equal(usageCalls, 1);
  assert.equal(resourceSettlementCalls, 0);
  assert.equal(persistedUsage?.usageReceiptRef, usage.usageReceiptRef);
  assert.equal(persistedSettlement?.settlementId, settlement.settlementId);
});

test("AFAL settlement bootstrap exposes canonical templates", () => {
  const records = createSeededAfalSettlementRecords();

  assert.ok(records.paymentSettlementTemplates[paymentFlowFixtures.paymentIntentCreated.intentId]);
  assert.ok(records.resourceUsageTemplates[resourceFlowFixtures.resourceIntentCreated.intentId]);
  assert.ok(records.resourceSettlementTemplates[resourceFlowFixtures.resourceIntentCreated.intentId]);
});
