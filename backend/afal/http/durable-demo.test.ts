import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { runSeededDurableHttpPaymentDemo } from "./durable-demo";

test("durable AFAL HTTP payment demo returns a compact summary for the canonical payment request", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-http-demo-"));

  try {
    const result = await runSeededDurableHttpPaymentDemo(dir);

    assert.deepEqual(result.summary, {
      dataDir: dir,
      request: {
        method: "POST",
        path: "/capabilities/execute-payment",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
      response: {
        statusCode: 200,
        ok: true,
        capability: "executePayment",
      },
      persisted: {
        budgetId: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        consumedAmount: paymentFlowFixtures.monetaryBudgetFinal.consumedAmount,
        receiptId: paymentFlowFixtures.paymentReceipt.receiptId,
      },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
