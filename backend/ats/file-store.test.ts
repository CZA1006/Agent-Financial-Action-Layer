import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import { createSeededAtsRecords } from "./bootstrap";
import { JsonFileAtsStore } from "./file-store";
import { InMemoryAtsService } from "./service";

test("ATS JSON file store persists seeded records across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-ats-store-"));

  try {
    const filePath = join(dir, "ats-store.json");
    const seeded = createSeededAtsRecords();
    const store = new JsonFileAtsStore({
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

    const reopenedStore = new JsonFileAtsStore({ filePath });
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

test("ATS service state survives re-instantiation when backed by the JSON file store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-ats-service-"));

  try {
    const filePath = join(dir, "ats-store.json");
    const seed = createSeededAtsRecords();
    const firstService = new InMemoryAtsService({
      store: new JsonFileAtsStore({
        filePath,
        seed,
      }),
    });

    await firstService.freezeAccount({
      accountRef: paymentFlowFixtures.operatingAccount.accountId,
      reasonCode: "persistent-policy-review",
      frozenAt: "2026-03-25T11:30:00Z",
    });
    await firstService.consumeMonetaryBudget({
      budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      amount: "45.00",
      updatedAt: "2026-03-25T11:35:00Z",
    });
    await firstService.consumeResourceQuota({
      quotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      quantity: 4096,
      updatedAt: "2026-03-25T11:40:00Z",
    });

    const secondService = new InMemoryAtsService({
      store: new JsonFileAtsStore({ filePath }),
    });

    const account = await secondService.getAccountState(paymentFlowFixtures.operatingAccount.accountId);
    const budget = await secondService.getMonetaryBudgetState(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const quota = await secondService.getResourceQuotaState(
      resourceFlowFixtures.resourceQuotaInitial.quotaId
    );

    assert.equal(account.status, "frozen");
    assert.equal(account.freezeState?.reasonCode, "persistent-policy-review");
    assert.equal(budget.consumedAmount, "45.00");
    assert.equal(quota.usedQuantity, 4096);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
