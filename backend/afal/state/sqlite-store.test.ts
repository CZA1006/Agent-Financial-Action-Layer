import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createSeededAfalIntentTemplateResolver } from "./bootstrap";
import { AfalIntentStateService } from "./service";
import { SqliteAfalIntentStore } from "./sqlite-store";

test("AFAL SQLite intent store persists records across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-intents-sqlite-"));

  try {
    const filePath = join(dir, "afal-intents.sqlite");
    const store = new SqliteAfalIntentStore({
      filePath,
      seed: {
        paymentIntents: [paymentFlowFixtures.paymentIntentCreated],
        resourceIntents: [resourceFlowFixtures.resourceIntentCreated],
        pendingExecutions: [
          {
            approvalSessionRef: "aps-payment-sqlite-001",
            actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
            actionType: "payment",
            requestRef: "req-payment-sqlite-001",
            reservationRef: "resv-pay-sqlite-001",
            monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
            status: "pending",
            createdAt: paymentFlowFixtures.paymentIntentCreated.createdAt,
            updatedAt: paymentFlowFixtures.paymentIntentCreated.createdAt,
          },
        ],
      },
    });

    const paymentIntent = await store.getPaymentIntent(paymentFlowFixtures.paymentIntentCreated.intentId);
    const resourceIntent = await store.getResourceIntent(resourceFlowFixtures.resourceIntentCreated.intentId);
    const pendingExecution = await store.getPendingExecution("aps-payment-sqlite-001");

    assert.equal(paymentIntent?.intentId, paymentFlowFixtures.paymentIntentCreated.intentId);
    assert.equal(resourceIntent?.intentId, resourceFlowFixtures.resourceIntentCreated.intentId);
    assert.equal(pendingExecution?.approvalSessionRef, "aps-payment-sqlite-001");

    const reopenedStore = new SqliteAfalIntentStore({ filePath });
    const reopenedPaymentIntent = await reopenedStore.getPaymentIntent(
      paymentFlowFixtures.paymentIntentCreated.intentId
    );

    assert.equal(reopenedPaymentIntent?.intentId, paymentFlowFixtures.paymentIntentCreated.intentId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("AFAL intent state service survives re-instantiation when backed by the SQLite store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-intents-sqlite-service-"));

  try {
    const filePath = join(dir, "afal-intents.sqlite");
    const firstService = new AfalIntentStateService({
      store: new SqliteAfalIntentStore({
        filePath,
        seed: {
          paymentIntents: [],
          resourceIntents: [],
          pendingExecutions: [],
        },
      }),
      templateResolver: createSeededAfalIntentTemplateResolver(),
    });

    await firstService.createPaymentIntent(paymentFlowFixtures.paymentIntentCreated);
    await firstService.markPaymentChallenge({
      intentId: paymentFlowFixtures.paymentIntentCreated.intentId,
      decisionRef: paymentFlowFixtures.authorizationDecisionInitial.decisionId,
      challengeRef: paymentFlowFixtures.challengeRecord.challengeId,
      challengeState: "pending-approval",
      status: "pending-approval",
    });
    await firstService.createPendingExecution({
      approvalSessionRef: "aps-payment-sqlite-002",
      actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
      actionType: "payment",
      requestRef: "req-payment-sqlite-002",
      reservationRef: "resv-pay-sqlite-002",
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      status: "pending",
      createdAt: paymentFlowFixtures.paymentIntentCreated.createdAt,
      updatedAt: paymentFlowFixtures.paymentIntentCreated.createdAt,
    });

    const secondService = new AfalIntentStateService({
      store: new SqliteAfalIntentStore({ filePath }),
      templateResolver: createSeededAfalIntentTemplateResolver(),
    });

    const paymentIntent = await secondService.getPaymentIntent(paymentFlowFixtures.paymentIntentCreated.intentId);
    const pendingExecution = await secondService.getPendingExecution("aps-payment-sqlite-002");

    assert.equal(paymentIntent.status, "pending-approval");
    assert.equal(paymentIntent.challengeRef, paymentFlowFixtures.challengeRecord.challengeId);
    assert.equal(pendingExecution.status, "pending");
    assert.equal(pendingExecution.monetaryBudgetRef, paymentFlowFixtures.monetaryBudgetInitial.budgetId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
