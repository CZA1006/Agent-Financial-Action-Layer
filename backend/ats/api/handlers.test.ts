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
  handleReleaseMonetaryReservation,
  handleReserveMonetaryBudget,
  handleReserveResourceCapacity,
  handleSettleMonetaryReservation,
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

  test("returns success envelopes for reserve and settle monetary reservation", async () => {
    const ats = createSeededInMemoryAtsService();

    const reserved = await handleReserveMonetaryBudget(
      {
        capability: "reserveMonetaryBudget",
        requestRef: "req-ats-reserve-money-001",
        input: {
          reservationId: "resv-money-001",
          budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
          accountRef: paymentFlowFixtures.operatingAccount.accountId,
          actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
          amount: "20.00",
          createdAt: "2026-03-25T11:31:00Z",
        },
      },
      ats
    );
    const settled = await handleSettleMonetaryReservation(
      {
        capability: "settleMonetaryReservation",
        requestRef: "req-ats-settle-money-001",
        input: {
          reservationRef: "resv-money-001",
          settledAt: "2026-03-25T11:32:00Z",
        },
      },
      ats
    );

    assert.equal(reserved.ok, true);
    assert.equal(settled.ok, true);
    if (reserved.ok && settled.ok) {
      assert.equal(reserved.data.reservation.status, "reserved");
      assert.equal(reserved.data.budget.availableAmount, "980.00");
      assert.equal(settled.data.reservation.status, "settled");
      assert.equal(settled.data.budget.consumedAmount, "20.00");
    }
  });

  test("returns success envelopes for reserve and release resource reservation", async () => {
    const ats = createSeededInMemoryAtsService();

    const reserved = await handleReserveResourceCapacity(
      {
        capability: "reserveResourceCapacity",
        requestRef: "req-ats-reserve-resource-001",
        input: {
          reservationId: "resv-resource-001",
          budgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          quotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
          accountRef: resourceFlowFixtures.operatingAccount.accountId,
          actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
          quantity: 5000,
          createdAt: "2026-03-25T11:33:00Z",
        },
      },
      ats
    );
    const released = await handleReleaseMonetaryReservation(
      {
        capability: "releaseMonetaryReservation",
        requestRef: "req-unused-release-001",
        input: {
          reservationRef: "resv-money-missing",
        },
      },
      ats
    );

    assert.equal(reserved.ok, true);
    assert.equal(released.ok, false);
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
    const reserveResponse = await handlers.invokeCapability({
      capability: "reserveMonetaryBudget",
      requestRef: "req-ats-dispatch-003",
      input: {
        reservationId: "resv-money-dispatch-001",
        budgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        accountRef: paymentFlowFixtures.operatingAccount.accountId,
        actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
        amount: "5.00",
      },
    });

    assert.equal(accountResponse.ok, true);
    assert.equal(quotaResponse.ok, true);
    assert.equal(reserveResponse.ok, true);
  });
});
