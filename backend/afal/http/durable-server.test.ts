import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { JsonFileAtsStore } from "../../ats";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { createSeededDurableAfalHttpServer, handleAfalNodeHttpRequest } from "./durable-server";
import { AFAL_HTTP_ROUTES } from "./types";

test("durable AFAL HTTP server adapter executes payment flow and persists durable state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-http-server-"));

  try {
    const durable = createSeededDurableAfalHttpServer(dir);

    const response = await handleAfalNodeHttpRequest(durable, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.executePayment,
      bodyText: JSON.stringify({
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      }),
    });

    const parsed = JSON.parse(response.bodyText) as { ok: boolean };

    assert.equal(response.statusCode, 200);
    assert.equal(parsed.ok, true);

    const second = createSeededDurableAfalHttpServer(dir);
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

test("durable AFAL HTTP server adapter rejects invalid JSON request bodies", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-http-server-"));

  try {
    const durable = createSeededDurableAfalHttpServer(dir);
    const response = await handleAfalNodeHttpRequest(durable, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.executePayment,
      bodyText: "{not-json",
    });

    const parsed = JSON.parse(response.bodyText) as {
      ok: boolean;
      error?: {
        code?: string;
      };
    };

    assert.equal(response.statusCode, 400);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error?.code, "bad-request");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
