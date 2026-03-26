import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createSeededInMemoryAtsService } from "../bootstrap";
import {
  createAtsApiHandlers,
  handleConsumeMonetaryBudget,
  handleFreezeAccount,
  handleGetAccountState,
  handleGetMonetaryBudgetState,
  handleGetResourceBudgetState,
  handleGetResourceQuotaState,
} from "./handlers";

describe("ATS API adapter", () => {
  test("returns a success envelope for getAccountState", async () => {
    const response = await handleGetAccountState({
      capability: "getAccountState",
      requestRef: "req-ats-account-001",
      input: {
        accountRef: paymentFlowFixtures.operatingAccount.accountId,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.statusCode, 200);
      assert.equal(response.data.accountId, paymentFlowFixtures.operatingAccount.accountId);
    }
  });

  test("returns a success envelope for monetary/resource state reads", async () => {
    const monetary = await handleGetMonetaryBudgetState({
      capability: "getMonetaryBudgetState",
      requestRef: "req-ats-money-001",
      input: {
        budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    const resourceBudget = await handleGetResourceBudgetState({
      capability: "getResourceBudgetState",
      requestRef: "req-ats-resource-budget-001",
      input: {
        budgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      },
    });
    const resourceQuota = await handleGetResourceQuotaState({
      capability: "getResourceQuotaState",
      requestRef: "req-ats-resource-quota-001",
      input: {
        quotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    assert.equal(monetary.ok, true);
    assert.equal(resourceBudget.ok, true);
    assert.equal(resourceQuota.ok, true);
  });

  test("returns a success envelope for freezeAccount", async () => {
    const ats = createSeededInMemoryAtsService();
    const response = await handleFreezeAccount(
      {
        capability: "freezeAccount",
        requestRef: "req-ats-freeze-001",
        input: {
          accountRef: paymentFlowFixtures.operatingAccount.accountId,
          reasonCode: "manual-review",
          frozenAt: "2026-03-25T11:30:00Z",
        },
      },
      ats
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.status, "frozen");
      assert.equal(response.data.freezeState?.reasonCode, "manual-review");
    }
  });

  test("returns a success envelope for consumeMonetaryBudget", async () => {
    const ats = createSeededInMemoryAtsService();
    const response = await handleConsumeMonetaryBudget(
      {
        capability: "consumeMonetaryBudget",
        requestRef: "req-ats-consume-money-001",
        input: {
          budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
          amount: "12.25",
          updatedAt: "2026-03-25T11:35:00Z",
        },
      },
      ats
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.consumedAmount, "12.25");
      assert.equal(response.data.availableAmount, "987.75");
    }
  });

  test("maps unknown refs to a 404 response", async () => {
    const response = await handleGetAccountState({
      capability: "getAccountState",
      requestRef: "req-ats-account-404",
      input: {
        accountRef: "acct-missing-404",
      },
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 404);
      assert.equal(response.error.code, "not-found");
    }
  });

  test("maps budget overspend to a 409 response", async () => {
    const response = await handleConsumeMonetaryBudget({
      capability: "consumeMonetaryBudget",
      requestRef: "req-ats-consume-money-409",
      input: {
        budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        amount: "5000.00",
      },
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 409);
      assert.equal(response.error.code, "budget-exceeded");
    }
  });

  test("supports generic capability dispatch", async () => {
    const handlers = createAtsApiHandlers();

    const accountResponse = await handlers.invokeCapability({
      capability: "getAccountState",
      requestRef: "req-ats-dispatch-001",
      input: {
        accountRef: paymentFlowFixtures.operatingAccount.accountId,
      },
    });

    const quotaResponse = await handlers.invokeCapability({
      capability: "getResourceQuotaState",
      requestRef: "req-ats-dispatch-002",
      input: {
        quotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    assert.equal(accountResponse.ok, true);
    assert.equal(quotaResponse.ok, true);
  });
});
