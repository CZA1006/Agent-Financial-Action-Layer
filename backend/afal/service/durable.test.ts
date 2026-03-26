import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { JsonFileAtsStore } from "../../ats";
import { JsonFileAfalIntentStore } from "../state/file-store";
import { JsonFileAfalSettlementStore } from "../settlement/file-store";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { createSeededDurableAfalBundle, getSeededDurableAfalPaths } from "./durable";

test("seeded durable AFAL runtime persists module and AFAL-owned state across restarts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-runtime-"));

  try {
    const first = createSeededDurableAfalBundle(dir);

    await first.runtime.executePayment({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    await first.runtime.settleResourceUsage({
      capability: "settleResourceUsage",
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intent: resourceFlowFixtures.resourceIntentCreated,
        resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
        resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    const second = createSeededDurableAfalBundle(dir);
    const paths = getSeededDurableAfalPaths(dir);

    const atsStore = new JsonFileAtsStore({ filePath: paths.ats });
    const intentStore = new JsonFileAfalIntentStore({ filePath: paths.afalIntents });
    const settlementStore = new JsonFileAfalSettlementStore({ filePath: paths.afalSettlement });
    const outputStore = new JsonFileAfalOutputStore({ filePath: paths.afalOutputs });

    const paymentBudget = await atsStore.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const paymentIntent = await intentStore.getPaymentIntent(
      paymentFlowFixtures.paymentIntentCreated.intentId
    );
    const resourceIntent = await intentStore.getResourceIntent(
      resourceFlowFixtures.resourceIntentCreated.intentId
    );
    const paymentSettlement = await settlementStore.getSettlement(
      paymentFlowFixtures.settlementRecord.settlementId
    );
    const resourceUsage = await settlementStore.getUsageConfirmation(
      resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
    );
    const paymentReceipt = await outputStore.getReceipt(
      paymentFlowFixtures.paymentReceipt.receiptId
    );
    const resourceResponse = await outputStore.getCapabilityResponse(
      resourceFlowFixtures.capabilityResponse.responseId
    );

    assert.equal(second.runtime.ports, second.ports);
    assert.equal(
      paymentBudget?.consumedAmount,
      paymentFlowFixtures.monetaryBudgetFinal.consumedAmount
    );
    assert.equal(paymentIntent?.status, "settled");
    assert.equal(paymentIntent?.receiptRef, paymentFlowFixtures.paymentReceipt.receiptId);
    assert.equal(resourceIntent?.status, "settled");
    assert.equal(
      resourceIntent?.usageReceiptRef,
      resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
    );
    assert.equal(
      paymentSettlement?.settlementId,
      paymentFlowFixtures.settlementRecord.settlementId
    );
    assert.equal(
      resourceUsage?.usageReceiptRef,
      resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
    );
    assert.equal(paymentReceipt?.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
    assert.equal(resourceResponse?.responseId, resourceFlowFixtures.capabilityResponse.responseId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
