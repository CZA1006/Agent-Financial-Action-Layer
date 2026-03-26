import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { runSeededDurableAfalDemo } from "./durable-demo";

test("durable AFAL demo returns a compact summary for the seeded local durable mode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-demo-"));

  try {
    const result = await runSeededDurableAfalDemo(dir);

    assert.deepEqual(result.summary.payment, {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intentId: paymentFlowFixtures.paymentIntentCreated.intentId,
      result: "approved",
      settlementId: paymentFlowFixtures.settlementRecord.settlementId,
      receiptId: paymentFlowFixtures.paymentReceipt.receiptId,
      consumedAmount: paymentFlowFixtures.monetaryBudgetFinal.consumedAmount,
    });
    assert.deepEqual(result.summary.resource, {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intentId: resourceFlowFixtures.resourceIntentCreated.intentId,
      result: "approved",
      usageReceiptRef: resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef,
      settlementId: resourceFlowFixtures.settlementRecord.settlementId,
      receiptId: resourceFlowFixtures.resourceReceipt.receiptId,
      usedQuantity: resourceFlowFixtures.resourceQuotaFinal.usedQuantity,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
