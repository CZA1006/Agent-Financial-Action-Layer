import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { JsonFileAtsStore } from "../../ats";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { createSeededDurableAfalHttpRouter } from "./durable";
import { AFAL_HTTP_ROUTES } from "./types";

test("durable AFAL HTTP router executes payment flow and persists state to durable stores", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-http-"));

  try {
    const first = createSeededDurableAfalHttpRouter(dir);

    const response = await first.router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.executePayment,
      body: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);

    const second = createSeededDurableAfalHttpRouter(dir);
    const atsStore = new JsonFileAtsStore({ filePath: second.paths.ats });
    const outputStore = new JsonFileAfalOutputStore({ filePath: second.paths.afalOutputs });

    const budget = await atsStore.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const receipt = await outputStore.getReceipt(paymentFlowFixtures.paymentReceipt.receiptId);

    assert.equal(budget?.consumedAmount, paymentFlowFixtures.monetaryBudgetFinal.consumedAmount);
    assert.equal(receipt?.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
