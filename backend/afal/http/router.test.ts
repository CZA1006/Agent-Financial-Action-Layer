import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createAfalRuntimeService } from "../service";
import {
  createMockAfalPorts,
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "../mock";
import { createAfalApiHandlers } from "../api";
import { createAfalHttpRouter, AFAL_HTTP_ROUTES } from "./index";

describe("AFAL HTTP transport contract", () => {
  test("routes top-level pending approval capability requests", async () => {
    const router = createAfalHttpRouter();

    const paymentResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.requestPaymentApproval,
      body: {
        requestRef: "req-http-pending-payment-001",
        input: {
          requestRef: "req-http-pending-payment-001",
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
    });
    const resourceResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.requestResourceApproval,
      body: {
        requestRef: "req-http-pending-resource-001",
        input: {
          requestRef: "req-http-pending-resource-001",
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        },
      },
    });

    assert.equal(paymentResponse.statusCode, 200);
    assert.equal(resourceResponse.statusCode, 200);
    assert.equal(paymentResponse.body.ok, true);
    assert.equal(resourceResponse.body.ok, true);
    if (
      paymentResponse.body.ok &&
      "capabilityResponse" in paymentResponse.body.data &&
      paymentResponse.body.data.capabilityResponse
    ) {
      assert.equal(paymentResponse.body.capability, "requestPaymentApproval");
      assert.equal(paymentResponse.body.data.capabilityResponse.result, "pending-approval");
    } else {
      assert.fail("expected requestPaymentApproval success response");
    }
    if (
      resourceResponse.body.ok &&
      "capabilityResponse" in resourceResponse.body.data &&
      resourceResponse.body.data.capabilityResponse
    ) {
      assert.equal(resourceResponse.body.capability, "requestResourceApproval");
      assert.equal(resourceResponse.body.data.capabilityResponse.result, "pending-approval");
    } else {
      assert.fail("expected requestResourceApproval success response");
    }
  });

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
      "paymentReceipt" in response.body.data &&
      response.body.data.paymentReceipt
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
      "resourceReceipt" in response.body.data &&
      response.body.data.resourceReceipt
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

  test("routes approval session apply-result and resume POST requests", async () => {
    const runtime = createAfalRuntimeService();
    const router = createAfalHttpRouter({ handlers: createAfalApiHandlers({ service: runtime }) });
    const pending = await runtime.requestPaymentApproval({
      capability: "requestPaymentApproval",
      requestRef: "req-http-pending-router-001",
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    const applyResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.applyApprovalResult,
      body: {
        requestRef: "req-http-apply-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
          result: paymentFlowFixtures.approvalResult,
        },
      },
    });
    const resumeResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.resumeApprovalSession,
      body: {
        requestRef: "req-http-resume-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
        },
      },
    });
    const resumeActionResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.resumeApprovedAction,
      body: {
        requestRef: "req-http-resume-action-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
        },
      },
    });

    assert.equal(applyResponse.statusCode, 200);
    assert.equal(resumeResponse.statusCode, 200);
    assert.equal(resumeActionResponse.statusCode, 200);
    assert.equal(applyResponse.body.ok, true);
    assert.equal(resumeResponse.body.ok, true);
    assert.equal(resumeActionResponse.body.ok, true);
    if (
      resumeResponse.body.ok &&
      resumeResponse.body.capability === "resumeApprovalSession" &&
      "finalDecision" in resumeResponse.body.data
    ) {
      assert.ok(resumeResponse.body.data.finalDecision);
      assert.equal(resumeResponse.body.capability, "resumeApprovalSession");
      assert.equal(resumeResponse.body.data.finalDecision.result, "approved");
    } else {
      assert.fail("expected resumeApprovalSession success response");
    }
    if (
      resumeActionResponse.body.ok &&
      resumeActionResponse.body.capability === "resumeApprovedAction" &&
      "finalDecision" in resumeActionResponse.body.data
    ) {
      assert.ok(resumeActionResponse.body.data.finalDecision);
      assert.equal(resumeActionResponse.body.data.finalDecision.result, "approved");
    } else {
      assert.fail("expected resumeApprovedAction success response");
    }
  });

  test("routes action status POST requests after payment settlement", async () => {
    const runtime = createAfalRuntimeService();
    const router = createAfalHttpRouter({ handlers: createAfalApiHandlers({ service: runtime }) });
    const pending = await runtime.requestPaymentApproval({
      capability: "requestPaymentApproval",
      requestRef: "req-http-action-status-payment-001",
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    await runtime.applyApprovalResult({
      capability: "applyApprovalResult",
      requestRef: "req-http-action-status-apply-001",
      input: {
        approvalSessionRef: pending.approvalSession.approvalSessionId,
        result: paymentFlowFixtures.approvalResult,
      },
    });
    await runtime.resumeApprovedAction({
      capability: "resumeApprovedAction",
      requestRef: "req-http-action-status-resume-001",
      input: {
        approvalSessionRef: pending.approvalSession.approvalSessionId,
      },
    });

    const response = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.getActionStatus,
      body: {
        requestRef: "req-http-action-status-read-001",
        input: {
          actionRef: pending.intent.intentId,
        },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    if (
      response.body.ok &&
      response.body.capability === "getActionStatus" &&
      "actionType" in response.body.data &&
      "intent" in response.body.data
    ) {
      assert.equal(response.body.data.actionType, "payment");
      assert.equal(response.body.data.intent.status, "settled");
      if ("paymentReceipt" in response.body.data) {
        assert.equal(
          response.body.data.paymentReceipt?.receiptId,
          paymentFlowFixtures.paymentReceipt.receiptId
        );
      }
    } else {
      assert.fail("expected getActionStatus success response");
    }
  });
});
