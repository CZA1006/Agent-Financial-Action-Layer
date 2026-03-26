import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import { createSeededAtsRecords, createSeededInMemoryAtsService } from "./bootstrap";
import { InMemoryAtsService } from "./service";
import { InMemoryAtsStore } from "./store";

test("ATS service resolves seeded account state", async () => {
  const service = createSeededInMemoryAtsService();

  const account = await service.getAccountState(paymentFlowFixtures.operatingAccount.accountId);

  assert.equal(account.accountId, paymentFlowFixtures.operatingAccount.accountId);
  assert.equal(account.status, "active");
});

test("ATS service resolves seeded monetary budget state", async () => {
  const service = createSeededInMemoryAtsService();

  const budget = await service.getMonetaryBudgetState(paymentFlowFixtures.monetaryBudgetInitial.budgetId);

  assert.equal(budget.availableAmount, "1000.00");
});

test("ATS service freezes an account through the store", async () => {
  const store = new InMemoryAtsStore({
    accounts: [paymentFlowFixtures.operatingAccount],
  });
  const service = new InMemoryAtsService({ store });

  await service.freezeAccount({
    accountRef: paymentFlowFixtures.operatingAccount.accountId,
    reasonCode: "policy-review",
    frozenAt: "2026-03-25T11:00:00Z",
  });

  const account = await store.getAccount(paymentFlowFixtures.operatingAccount.accountId);

  assert.equal(account?.status, "frozen");
  assert.equal(account?.freezeState?.isFrozen, true);
  assert.equal(account?.freezeState?.reasonCode, "policy-review");
});

test("ATS service consumes monetary budget", async () => {
  const service = createSeededInMemoryAtsService();

  const updated = await service.consumeMonetaryBudget({
    budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    amount: "42.50",
    updatedAt: "2026-03-25T11:05:00Z",
  });

  assert.equal(updated.consumedAmount, "42.50");
  assert.equal(updated.availableAmount, "957.50");
  assert.equal(updated.updatedAt, "2026-03-25T11:05:00Z");
});

test("ATS service rejects monetary budget overspend", async () => {
  const service = createSeededInMemoryAtsService();

  await assert.rejects(
    () =>
      service.consumeMonetaryBudget({
        budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        amount: "1000.01",
      }),
    /Monetary budget exceeded/
  );
});

test("ATS service consumes resource budget and quota", async () => {
  const service = createSeededInMemoryAtsService();

  const budget = await service.consumeResourceBudget({
    budgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
    quantity: 2048,
    updatedAt: "2026-03-25T11:10:00Z",
  });
  const quota = await service.consumeResourceQuota({
    quotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    quantity: 2048,
    updatedAt: "2026-03-25T11:10:30Z",
  });

  assert.equal(budget.consumedQuantity, 2048);
  assert.equal(budget.availableQuantity, 997952);
  assert.equal(quota.usedQuantity, 2048);
  assert.equal(quota.updatedAt, "2026-03-25T11:10:30Z");
});

test("ATS bootstrap produces deduplicated seeded records", () => {
  const records = createSeededAtsRecords();

  assert.equal(records.accounts.length, new Set(records.accounts.map((account) => account.accountId)).size);
  assert.equal(
    records.resourceQuotas.length,
    new Set(records.resourceQuotas.map((quota) => quota.quotaId)).size
  );
  assert.ok(records.accounts.find((account) => account.accountId === paymentFlowFixtures.operatingAccount.accountId));
});
