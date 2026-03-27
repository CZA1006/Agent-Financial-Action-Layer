import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { InMemoryAfalAdminAuditStore } from "../admin-audit";
import { createAfalRuntimeService } from "../service";
import {
  createMockAfalPorts,
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "../mock";
import {
  HttpSettlementNotificationPort,
  SettlementNotificationOutboxWorker,
} from "../notifications";
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

  test("routes notification delivery admin POST requests after settlement", async () => {
    const adminAuditStore = new InMemoryAfalAdminAuditStore();
    const runtime = createAfalRuntimeService({
      ports: createMockAfalPorts({
        notifications: new HttpSettlementNotificationPort({
          paymentCallbackUrls: {
            [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]:
              "https://receiver.example/payment",
          },
          fetchImpl: async () => new Response(null, { status: 202 }),
        }),
      }),
      adminAuditStore,
    });
    const router = createAfalHttpRouter({ handlers: createAfalApiHandlers({ service: runtime }) });
    const pending = await runtime.requestPaymentApproval({
      capability: "requestPaymentApproval",
      requestRef: "req-http-notification-payment-001",
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    await runtime.applyApprovalResult({
      capability: "applyApprovalResult",
      requestRef: "req-http-notification-apply-001",
      input: {
        approvalSessionRef: pending.approvalSession.approvalSessionId,
        result: paymentFlowFixtures.approvalResult,
      },
    });
    await runtime.resumeApprovedAction({
      capability: "resumeApprovedAction",
      requestRef: "req-http-notification-resume-001",
      input: {
        approvalSessionRef: pending.approvalSession.approvalSessionId,
      },
    });
    const notificationId = `notif-${pending.intent.intentId}`;

    const listResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.listNotificationDeliveries,
      body: {
        requestRef: "req-http-notification-list-001",
        input: {},
      },
    });
    const getResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.getNotificationDelivery,
      body: {
        requestRef: "req-http-notification-get-001",
        input: {
          notificationId,
        },
      },
    });
    const redeliverResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.redeliverNotification,
      body: {
        requestRef: "req-http-notification-redeliver-001",
        input: {
          notificationId,
        },
      },
    });
    const auditListResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.listAdminAuditEntries,
      body: {
        requestRef: "req-http-admin-audit-list-001",
        input: {},
      },
    });
    const auditGetResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.getAdminAuditEntry,
      body: {
        requestRef: "req-http-admin-audit-get-001",
        input: {
          auditId: "admin-audit-req-http-notification-redeliver-001",
        },
      },
    });

    assert.equal(listResponse.statusCode, 200);
    assert.equal(getResponse.statusCode, 200);
    assert.equal(redeliverResponse.statusCode, 200);
    assert.equal(auditListResponse.statusCode, 200);
    assert.equal(auditGetResponse.statusCode, 200);
    assert.equal(listResponse.body.ok, true);
    assert.equal(getResponse.body.ok, true);
    assert.equal(redeliverResponse.body.ok, true);
    assert.equal(auditListResponse.body.ok, true);
    assert.equal(auditGetResponse.body.ok, true);
    if (
      listResponse.body.ok &&
      listResponse.body.capability === "listNotificationDeliveries" &&
      Array.isArray(listResponse.body.data)
    ) {
      assert.equal(listResponse.body.data.length, 1);
    } else {
      assert.fail("expected listNotificationDeliveries success response");
    }
    if (
      getResponse.body.ok &&
      getResponse.body.capability === "getNotificationDelivery" &&
      "notificationId" in getResponse.body.data
    ) {
      assert.equal(getResponse.body.data.notificationId, notificationId);
    } else {
      assert.fail("expected getNotificationDelivery success response");
    }
    if (
      redeliverResponse.body.ok &&
      redeliverResponse.body.capability === "redeliverNotification" &&
      "delivery" in redeliverResponse.body.data
    ) {
      assert.equal(redeliverResponse.body.data.delivery.notificationId, notificationId);
      assert.equal(redeliverResponse.body.data.delivery.attempts, 2);
    } else {
      assert.fail("expected redeliverNotification success response");
    }
    if (
      auditListResponse.body.ok &&
      auditListResponse.body.capability === "listAdminAuditEntries" &&
      Array.isArray(auditListResponse.body.data)
    ) {
      assert.equal(auditListResponse.body.data.length, 3);
    } else {
      assert.fail("expected listAdminAuditEntries success response");
    }
    if (
      auditGetResponse.body.ok &&
      auditGetResponse.body.capability === "getAdminAuditEntry" &&
      "auditId" in auditGetResponse.body.data
    ) {
      assert.equal(
        auditGetResponse.body.data.auditId,
        "admin-audit-req-http-notification-redeliver-001"
      );
      assert.equal(auditGetResponse.body.data.action, "redeliverNotification");
    } else {
      assert.fail("expected getAdminAuditEntry success response");
    }
  });

  test("rejects notification admin routes without the configured operator token", async () => {
    const runtime = createAfalRuntimeService({
      ports: createMockAfalPorts({
        notifications: new HttpSettlementNotificationPort({
          paymentCallbackUrls: {
            [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]:
              "https://receiver.example/payment",
          },
          fetchImpl: async () => new Response(null, { status: 202 }),
        }),
      }),
      notificationWorker: new SettlementNotificationOutboxWorker(
        {
          redeliverFailedNotifications: async () => 1,
        },
        { intervalMs: 20 }
      ),
    });
    const router = createAfalHttpRouter({
      handlers: createAfalApiHandlers({ service: runtime }),
      operatorAuth: {
        token: "operator-secret",
      },
    });

    const deliveryResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.listNotificationDeliveries,
      body: {
        requestRef: "req-http-notification-list-auth-001",
        input: {},
      },
    });
    const workerResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.getNotificationWorkerStatus,
      body: {
        requestRef: "req-http-worker-status-auth-001",
        input: {},
      },
    });
    const auditResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.listAdminAuditEntries,
      body: {
        requestRef: "req-http-admin-audit-list-auth-001",
        input: {},
      },
    });

    assert.equal(deliveryResponse.statusCode, 403);
    assert.equal(workerResponse.statusCode, 403);
    assert.equal(auditResponse.statusCode, 403);
    assert.equal(deliveryResponse.body.ok, false);
    assert.equal(workerResponse.body.ok, false);
    assert.equal(auditResponse.body.ok, false);
    if (!deliveryResponse.body.ok) {
      assert.equal(deliveryResponse.body.error.code, "operator-auth-required");
    }
    if (!workerResponse.body.ok) {
      assert.equal(workerResponse.body.error.code, "operator-auth-required");
    }
    if (!auditResponse.body.ok) {
      assert.equal(auditResponse.body.error.code, "operator-auth-required");
    }
  });

  test("accepts notification admin routes with the configured operator token", async () => {
    const runtime = createAfalRuntimeService({
      notificationWorker: new SettlementNotificationOutboxWorker(
        {
          redeliverFailedNotifications: async () => 1,
        },
        { intervalMs: 20 }
      ),
    });
    const router = createAfalHttpRouter({
      handlers: createAfalApiHandlers({ service: runtime }),
      operatorAuth: {
        token: "operator-secret",
      },
    });

    const response = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.getNotificationWorkerStatus,
      headers: {
        "x-afal-operator-token": "operator-secret",
      },
      body: {
        requestRef: "req-http-worker-status-auth-002",
        input: {},
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    if (response.body.ok) {
      assert.equal(response.body.capability, "getNotificationWorkerStatus");
    }
  });

  test("routes notification worker control POST requests", async () => {
    const runtime = createAfalRuntimeService({
      notificationWorker: new SettlementNotificationOutboxWorker(
        {
          redeliverFailedNotifications: async () => 1,
        },
        { intervalMs: 20 }
      ),
    });
    const router = createAfalHttpRouter({ handlers: createAfalApiHandlers({ service: runtime }) });

    const statusResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.getNotificationWorkerStatus,
      body: {
        requestRef: "req-http-worker-status-001",
        input: {},
      },
    });
    const startResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.startNotificationWorker,
      body: {
        requestRef: "req-http-worker-start-001",
        input: {},
      },
    });
    const runResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.runNotificationWorker,
      body: {
        requestRef: "req-http-worker-run-001",
        input: {},
      },
    });
    const stopResponse = await router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.stopNotificationWorker,
      body: {
        requestRef: "req-http-worker-stop-001",
        input: {},
      },
    });

    assert.equal(statusResponse.statusCode, 200);
    assert.equal(startResponse.statusCode, 200);
    assert.equal(runResponse.statusCode, 200);
    assert.equal(stopResponse.statusCode, 200);
    assert.equal(statusResponse.body.ok, true);
    assert.equal(startResponse.body.ok, true);
    assert.equal(runResponse.body.ok, true);
    assert.equal(stopResponse.body.ok, true);
    if (
      statusResponse.body.ok &&
      statusResponse.body.capability === "getNotificationWorkerStatus" &&
      "running" in statusResponse.body.data
    ) {
      assert.equal(statusResponse.body.data.running, false);
    } else {
      assert.fail("expected getNotificationWorkerStatus success response");
    }
    if (
      startResponse.body.ok &&
      startResponse.body.capability === "startNotificationWorker" &&
      "running" in startResponse.body.data
    ) {
      assert.equal(startResponse.body.data.running, true);
    } else {
      assert.fail("expected startNotificationWorker success response");
    }
    if (
      runResponse.body.ok &&
      runResponse.body.capability === "runNotificationWorker" &&
      "redelivered" in runResponse.body.data
    ) {
      assert.equal(runResponse.body.data.redelivered, 1);
    } else {
      assert.fail("expected runNotificationWorker success response");
    }
    if (
      stopResponse.body.ok &&
      stopResponse.body.capability === "stopNotificationWorker" &&
      "running" in stopResponse.body.data
    ) {
      assert.equal(stopResponse.body.data.running, false);
    } else {
      assert.fail("expected stopNotificationWorker success response");
    }
  });
});
