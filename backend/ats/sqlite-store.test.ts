import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import { createSeededAtsRecords } from "./bootstrap";
import { InMemoryAtsService } from "./service";
import { SqliteAtsStore } from "./sqlite-store";

test("ATS SQLite store persists seeded records across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-ats-sqlite-"));

  try {
    const filePath = join(dir, "ats-store.sqlite");
    const seeded = createSeededAtsRecords();
    const store = new SqliteAtsStore({
      filePath,
      seed: seeded,
    });

    const account = await store.getAccount(paymentFlowFixtures.operatingAccount.accountId);
    const moneyBudget = await store.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const resourceBudget = await store.getResourceBudget(
      resourceFlowFixtures.resourceBudgetInitial.budgetId
    );
    const quota = await store.getResourceQuota(resourceFlowFixtures.resourceQuotaInitial.quotaId);

    assert.equal(account?.accountId, paymentFlowFixtures.operatingAccount.accountId);
    assert.equal(moneyBudget?.budgetId, paymentFlowFixtures.monetaryBudgetInitial.budgetId);
    assert.equal(resourceBudget?.budgetId, resourceFlowFixtures.resourceBudgetInitial.budgetId);
    assert.equal(quota?.quotaId, resourceFlowFixtures.resourceQuotaInitial.quotaId);

    const reopenedStore = new SqliteAtsStore({ filePath });
    const reopenedAccount = await reopenedStore.getAccount(
      paymentFlowFixtures.operatingAccount.accountId
    );
    const reopenedBudget = await reopenedStore.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );

    assert.equal(reopenedAccount?.accountId, paymentFlowFixtures.operatingAccount.accountId);
    assert.equal(reopenedBudget?.budgetId, paymentFlowFixtures.monetaryBudgetInitial.budgetId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ATS service state survives re-instantiation when backed by the SQLite store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-ats-sqlite-service-"));

  try {
    const filePath = join(dir, "ats-store.sqlite");
    const firstService = new InMemoryAtsService({
      store: new SqliteAtsStore({
        filePath,
        seed: createSeededAtsRecords(),
      }),
    });

    await firstService.freezeAccount({
      accountRef: paymentFlowFixtures.operatingAccount.accountId,
      reasonCode: "sqlite-policy-review",
      frozenAt: "2026-03-25T11:30:00Z",
    });
    await firstService.reserveMonetaryBudget({
      reservationId: "resv-money-sqlite-001",
      budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      accountRef: paymentFlowFixtures.operatingAccount.accountId,
      actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
      amount: "10.00",
      createdAt: "2026-03-25T11:45:00Z",
    });
    await firstService.reserveResourceCapacity({
      reservationId: "resv-resource-sqlite-001",
      budgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      quotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      accountRef: resourceFlowFixtures.operatingAccount.accountId,
      actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
      quantity: 2048,
      createdAt: "2026-03-25T11:46:00Z",
    });

    const secondService = new InMemoryAtsService({
      store: new SqliteAtsStore({ filePath }),
    });

    const account = await secondService.getAccountState(paymentFlowFixtures.operatingAccount.accountId);
    const budget = await secondService.getMonetaryBudgetState(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const moneyReservation = await secondService.getMonetaryReservationState("resv-money-sqlite-001");
    const resourceReservation = await secondService.getResourceReservationState(
      "resv-resource-sqlite-001"
    );

    assert.equal(account.status, "frozen");
    assert.equal(account.freezeState?.reasonCode, "sqlite-policy-review");
    assert.equal(budget.reservedAmount, "10.00");
    assert.equal(moneyReservation.status, "reserved");
    assert.equal(resourceReservation.status, "reserved");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
