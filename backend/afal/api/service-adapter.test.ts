import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { InMemoryAfalAdminAuditStore } from "../admin-audit";
import { createMockAfalPorts } from "../mock";
import {
  HttpSettlementNotificationPort,
  SettlementNotificationOutboxWorker,
} from "../notifications";
import { createAfalRuntimeService } from "../service";
import { createAfalApiServiceAdapter } from "./service-adapter";

test("AFAL API service adapter delegates payment and resource requests through the module service", async () => {
  const adapter = createAfalApiServiceAdapter(createAfalRuntimeService());

  const payment = await adapter.handleExecutePayment({
    capability: "executePayment",
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resource = await adapter.handleSettleResourceUsage({
    capability: "settleResourceUsage",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  assert.equal(payment.ok, true);
  assert.equal(resource.ok, true);

  const paymentPending = await adapter.handleRequestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-adapter-pending-payment-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resourcePending = await adapter.handleRequestResourceApproval({
    capability: "requestResourceApproval",
    requestRef: "req-adapter-pending-resource-001",
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  assert.equal(paymentPending.ok, true);
  assert.equal(resourcePending.ok, true);
});

test("AFAL API service adapter delegates approval session lifecycle through the module service", async () => {
  const runtime = createAfalRuntimeService();
  const adapter = createAfalApiServiceAdapter(runtime);
  const pending = await runtime.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-afal-approval-request-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  const session = await adapter.handleGetApprovalSession({
    capability: "getApprovalSession",
    requestRef: "req-afal-approval-session-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
    },
  });
  const applied = await adapter.handleApplyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-afal-approval-apply-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    },
  });
  const resumed = await adapter.handleResumeApprovalSession({
    capability: "resumeApprovalSession",
    requestRef: "req-afal-approval-resume-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
    },
  });
  const resumedAction = await adapter.handleResumeApprovedAction({
    capability: "resumeApprovedAction",
    requestRef: "req-afal-approval-resume-action-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
    },
  });

  assert.equal(session.ok, true);
  assert.equal(applied.ok, true);
  assert.equal(resumed.ok, true);
  assert.equal(resumedAction.ok, true);
  if (resumed.ok) {
    assert.equal(resumed.data.finalDecision.result, "approved");
  }
  if (resumedAction.ok) {
    assert.equal(resumedAction.data.finalDecision.result, "approved");
  }

  const actionStatus = await adapter.handleGetActionStatus({
    capability: "getActionStatus",
    requestRef: "req-afal-action-status-001",
    input: {
      actionRef: pending.intent.intentId,
    },
  });

  assert.equal(actionStatus.ok, true);
  if (actionStatus.ok) {
    assert.equal(actionStatus.data.actionType, "payment");
    assert.equal(actionStatus.data.intent.status, "settled");
  }
});

test("AFAL API service adapter delegates notification delivery admin requests", async () => {
  const adminAuditStore = new InMemoryAfalAdminAuditStore();
  const notifications = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "https://receiver.example/payment",
    },
    fetchImpl: async () => new Response(null, { status: 202 }),
  });
  const runtime = createAfalRuntimeService({
    ports: createMockAfalPorts({ notifications }),
    adminAuditStore,
  });
  const adapter = createAfalApiServiceAdapter(runtime);
  const pending = await runtime.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-afal-notification-request-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  await runtime.applyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-afal-notification-apply-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    },
  });
  await runtime.resumeApprovedAction({
    capability: "resumeApprovedAction",
    requestRef: "req-afal-notification-resume-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
    },
  });

  const notificationId = `notif-${pending.intent.intentId}`;
  const listed = await adapter.handleListNotificationDeliveries({
    capability: "listNotificationDeliveries",
    requestRef: "req-afal-notification-list-001",
    input: {},
  });
  const delivery = await adapter.handleGetNotificationDelivery({
    capability: "getNotificationDelivery",
    requestRef: "req-afal-notification-get-001",
    input: {
      notificationId,
    },
  });
  const redelivered = await adapter.handleRedeliverNotification({
    capability: "redeliverNotification",
    requestRef: "req-afal-notification-redeliver-001",
    input: {
      notificationId,
    },
  });
  const audits = await adapter.handleListAdminAuditEntries({
    capability: "listAdminAuditEntries",
    requestRef: "req-afal-admin-audit-list-001",
    input: {},
  });
  const audit = await adapter.handleGetAdminAuditEntry({
    capability: "getAdminAuditEntry",
    requestRef: "req-afal-admin-audit-get-001",
    input: {
      auditId: "admin-audit-req-afal-notification-redeliver-001",
    },
  });

  assert.equal(listed.ok, true);
  assert.equal(delivery.ok, true);
  assert.equal(redelivered.ok, true);
  assert.equal(audits.ok, true);
  assert.equal(audit.ok, true);
  if (listed.ok) {
    assert.equal(listed.data.length, 1);
  }
  if (delivery.ok) {
    assert.equal(delivery.data.notificationId, notificationId);
  }
  if (redelivered.ok) {
    assert.equal(redelivered.data.delivery.notificationId, notificationId);
    assert.equal(redelivered.data.delivery.attempts, 2);
  }
  if (audits.ok) {
    assert.equal(audits.data.length, 3);
  }
  if (audit.ok) {
    assert.equal(audit.data.action, "redeliverNotification");
    assert.equal(audit.data.targetRef, notificationId);
  }
});

test("AFAL API service adapter delegates notification worker control requests", async () => {
  const worker = new SettlementNotificationOutboxWorker(
    {
      redeliverFailedNotifications: async () => 1,
    },
    { intervalMs: 20 }
  );
  const adapter = createAfalApiServiceAdapter(
    createAfalRuntimeService({
      notificationWorker: worker,
    })
  );

  const status = await adapter.handleGetNotificationWorkerStatus({
    capability: "getNotificationWorkerStatus",
    requestRef: "req-afal-worker-status-001",
    input: {},
  });
  const started = await adapter.handleStartNotificationWorker({
    capability: "startNotificationWorker",
    requestRef: "req-afal-worker-start-001",
    input: {},
  });
  const ran = await adapter.handleRunNotificationWorker({
    capability: "runNotificationWorker",
    requestRef: "req-afal-worker-run-001",
    input: {},
  });
  const stopped = await adapter.handleStopNotificationWorker({
    capability: "stopNotificationWorker",
    requestRef: "req-afal-worker-stop-001",
    input: {},
  });

  assert.equal(status.ok, true);
  assert.equal(started.ok, true);
  assert.equal(ran.ok, true);
  assert.equal(stopped.ok, true);
  if (status.ok) {
    assert.equal(status.data.running, false);
  }
  if (started.ok) {
    assert.equal(started.data.running, true);
  }
  if (ran.ok) {
    assert.equal(ran.data.redelivered, 1);
  }
  if (stopped.ok) {
    assert.equal(stopped.data.running, false);
  }
});
