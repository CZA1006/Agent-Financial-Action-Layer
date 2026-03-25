import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  createMockAfalPorts,
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "../mock";
import { createAfalHttpRouter, AFAL_HTTP_ROUTES } from "./index";

describe("AFAL HTTP transport contract", () => {
  test("routes execute-payment POST requests to the payment capability", async () => {
    const router = createAfalHttpRouter();

    const response = await router.handle({
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
    if (
      response.body.ok &&
      response.body.capability === "executePayment" &&
      "paymentReceipt" in response.body.data
    ) {
      assert.equal(response.body.capability, "executePayment");
      assert.equal(response.body.data.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
    } else {
      assert.fail("expected executePayment success response");
    }
  });

  test("routes settle-resource-usage POST requests to the resource capability", async () => {
    const router = createAfalHttpRouter();

    const response = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.settleResourceUsage,
      body: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    if (
      response.body.ok &&
      response.body.capability === "settleResourceUsage" &&
      "resourceReceipt" in response.body.data
    ) {
      assert.equal(response.body.capability, "settleResourceUsage");
      assert.equal(response.body.data.resourceReceipt.receiptId, resourceFlowFixtures.resourceReceipt.receiptId);
    } else {
      assert.fail("expected settleResourceUsage success response");
    }
  });

  test("returns 400 for unsupported HTTP methods", async () => {
    const router = createAfalHttpRouter();

    const response = await router.handle({
      method: "GET",
      path: AFAL_HTTP_ROUTES.executePayment,
      body: undefined,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.ok, false);
    if (!response.body.ok) {
      assert.equal(response.body.error.code, "bad-request");
    }
  });

  test("returns 400 for requestRef mismatch between envelope and input", async () => {
    const router = createAfalHttpRouter();

    const response = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.executePayment,
      body: {
        requestRef: "req-envelope",
        input: {
          requestRef: "req-input",
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.ok, false);
    if (!response.body.ok) {
      assert.equal(response.body.error.code, "bad-request");
    }
  });

  test("returns 404 for unknown routes", async () => {
    const router = createAfalHttpRouter();

    const response = await router.handle({
      method: "POST",
      path: "/capabilities/unknown",
      body: {},
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.ok, false);
    if (!response.body.ok) {
      assert.equal(response.body.error.code, "not-found");
    }
  });

  test("preserves mapped API failures in the HTTP contract", async () => {
    const paymentOrchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        trustedSurface: {
          requestApproval: async (context) => ({
            ...paymentFlowFixtures.approvalResult,
            challengeRef: context.challengeRef,
            actionRef: context.actionRef,
            result: "expired",
            approvalReceiptRef: undefined,
          }),
        },
      })
    );

    const resourceOrchestrator = createMockResourceFlowOrchestrator();
    const router = createAfalHttpRouter({
      paymentOrchestrator,
      resourceOrchestrator,
    });

    const response = await router.handle({
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

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.ok, false);
    if (!response.body.ok) {
      assert.equal(response.body.error.code, "authorization-expired");
    }
  });
});
