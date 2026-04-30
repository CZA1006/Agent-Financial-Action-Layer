import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import type { AtsAdminPort } from "../../ats";
import { InMemoryAfalAdminAuditStore } from "../admin-audit";
import { createMockAfalPorts } from "../mock";
import {
  HttpSettlementNotificationPort,
  SettlementNotificationOutboxWorker,
} from "../notifications";
import { AfalSettlementService } from "../settlement";
import { AfalRuntimeService, createAfalRuntimeService } from "./runtime";

test("AFAL runtime service executes both canonical flows through default orchestrators", async () => {
  const service = createAfalRuntimeService();

  const paymentPending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-pending-payment-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resourcePending = await service.requestResourceApproval({
    capability: "requestResourceApproval",
    requestRef: "req-runtime-pending-resource-001",
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  const payment = await service.executePaymentFlow({
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    intent: paymentFlowFixtures.paymentIntentCreated,
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
  });
  const resource = await service.executeResourceSettlementFlow({
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    intent: resourceFlowFixtures.resourceIntentCreated,
    resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
    resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
  });

  assert.equal(payment.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  assert.equal(
    resource.resourceReceipt.receiptId,
    resourceFlowFixtures.resourceReceipt.receiptId
  );
  assert.equal(paymentPending.capabilityResponse.result, "pending-approval");
  assert.equal(paymentPending.intent.status, "pending-approval");
  assert.equal(resourcePending.capabilityResponse.result, "pending-approval");
  assert.equal(resourcePending.intent.status, "pending-approval");
});

test("AFAL runtime service keeps a shared seeded port bundle when one is provided", async () => {
  const ports = createMockAfalPorts();
  const service = new AfalRuntimeService({ ports });

  const payment = await service.executePaymentFlow({
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    intent: paymentFlowFixtures.paymentIntentCreated,
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
  });
  const resource = await service.executeResourceSettlementFlow({
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    intent: resourceFlowFixtures.resourceIntentCreated,
    resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
    resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
  });

  assert.equal(service.ports, ports);
  assert.equal(payment.finalDecision.result, "approved");
  assert.equal(resource.finalDecision.result, "approved");
});

test("AFAL runtime service builds payment approval context from the submitted intent", async () => {
  const service = createAfalRuntimeService();
  const intent = {
    ...paymentFlowFixtures.paymentIntentCreated,
    payee: {
      ...paymentFlowFixtures.paymentIntentCreated.payee,
      settlementAddress: "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94",
    },
    amount: "0.01",
    chain: "base-sepolia",
    purpose: {
      category: "service-payment",
      description:
        "Agent prompt payment: Pay 0.01 USDC to payee agent for fraud detection service",
      referenceId: "agent-prompt-payment-demo",
    },
  };

  const paymentPending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-dynamic-approval-context-001",
    input: {
      requestRef: "req-runtime-dynamic-approval-context-001",
      intent,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  assert.equal(
    paymentPending.approvalContext.summary,
    "0.01 USDC on base-sepolia for Agent prompt payment: Pay 0.01 USDC to payee agent for fraud detection service"
  );
  assert.equal(paymentPending.approvalContext.humanVisibleFields.amount, "0.01");
  assert.equal(paymentPending.approvalContext.humanVisibleFields.chain, "base-sepolia");
  assert.equal(
    paymentPending.approvalContext.humanVisibleFields.settlementAddress,
    "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94"
  );
});

test("AFAL runtime service exposes module-service command entrypoints", async () => {
  const service = createAfalRuntimeService();
  const paymentPending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-payment-approval-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  const session = await service.getApprovalSession({
    capability: "getApprovalSession",
    requestRef: "req-runtime-session-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
    },
  });
  const applied = await service.applyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-runtime-apply-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    },
  });
  const resumed = await service.invoke({
    capability: "resumeApprovalSession",
    requestRef: "req-runtime-resume-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
    },
  });
  const resumedExecution = await service.invoke({
    capability: "resumeApprovedAction",
    requestRef: "req-runtime-resume-execution-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
    },
  });
  const pendingExecution = await service.ports.intents.getPendingExecution(
    paymentPending.approvalSession.approvalSessionId
  );
  const payment = await service.executePayment({
    capability: "executePayment",
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resource = await service.invoke({
    capability: "settleResourceUsage",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  assert.equal(payment.finalDecision.result, "approved");
  if ("finalDecision" in resource) {
    assert.ok(resource.finalDecision);
    assert.equal(resource.finalDecision.result, "approved");
  } else {
    assert.fail("expected settleResourceUsage to return a flow output");
  }
  assert.equal(session.status, "pending");
  assert.equal(applied.approvalSession.status, "approved");
  if ("finalDecision" in resumed) {
    assert.ok(resumed.finalDecision);
    assert.equal(resumed.finalDecision.result, "approved");
  } else {
    assert.fail("expected resumeApprovalSession to return a final decision");
  }
  if ("paymentReceipt" in resumedExecution) {
    assert.ok(resumedExecution.paymentReceipt);
    assert.equal(resumedExecution.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  } else {
    assert.fail("expected resumeApprovedAction to return a settled payment flow");
  }
  assert.equal(pendingExecution.status, "resumed");
});

test("AFAL runtime service carries external wallet settlement evidence into payment receipts", async () => {
  const ports = createMockAfalPorts({
    paymentSettlement: new AfalSettlementService({
      paymentAdapter: {
        async executePayment() {
          return {
            settlementId: "stl-wallet-payint-0001",
            schemaVersion: "0.1",
            settlementType: "onchain-transfer",
            actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
            decisionRef: paymentFlowFixtures.authorizationDecisionFinal.decisionId,
            sourceAccountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
            destination: {
              payeeDid: paymentFlowFixtures.paymentIntentCreated.payee.payeeDid,
              settlementAddress: "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94",
            },
            asset: "USDC",
            amount: "0.01",
            chain: "base-sepolia",
            txHash: "0xbb053d513054da80442c04a5b63277d269a3a108633141bf2ca5f7a3d9fc7170",
            status: "settled",
            executedAt: "2026-04-27T09:12:34.038Z",
            settledAt: "2026-04-27T09:12:34.038Z",
          };
        },
      },
    }),
  });
  const service = new AfalRuntimeService({ ports });
  const paymentPending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-wallet-payment-approval-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  await service.applyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-runtime-wallet-payment-apply-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    },
  });
  const resumedExecution = await service.resumeApprovedAction({
    capability: "resumeApprovedAction",
    requestRef: "req-runtime-wallet-payment-resume-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
    },
  });

  if (!("paymentReceipt" in resumedExecution)) {
    assert.fail("expected resumeApprovedAction to return a settled payment flow");
  }

  assert.equal(resumedExecution.settlement.amount, "0.01");
  assert.equal(resumedExecution.settlement.chain, "base-sepolia");
  assert.equal(
    resumedExecution.settlement.txHash,
    "0xbb053d513054da80442c04a5b63277d269a3a108633141bf2ca5f7a3d9fc7170"
  );
  assert.equal(resumedExecution.paymentReceipt.evidence.amount, "0.01");
  assert.equal(resumedExecution.paymentReceipt.evidence.chain, "base-sepolia");
  assert.equal(
    resumedExecution.paymentReceipt.evidence.txHash,
    "0xbb053d513054da80442c04a5b63277d269a3a108633141bf2ca5f7a3d9fc7170"
  );
});

test("AFAL runtime service returns settled payment evidence when reservation settlement is already inactive", async () => {
  const ports = createMockAfalPorts();
  const ats = ports.ats as typeof ports.ats & Pick<AtsAdminPort, "settleMonetaryReservation">;
  const settleMonetaryReservation = ats.settleMonetaryReservation.bind(ats);
  ats.settleMonetaryReservation = async (args) => {
    if (args.reservationRef === `resv-${paymentFlowFixtures.paymentIntentCreated.intentId}`) {
      throw new Error(`Monetary reservation "${args.reservationRef}" is not active`);
    }
    return settleMonetaryReservation(args);
  };
  const service = new AfalRuntimeService({ ports });
  const paymentPending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-inactive-reservation-payment-approval-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  await service.applyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-runtime-inactive-reservation-payment-apply-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    },
  });
  const resumedExecution = await service.resumeApprovedAction({
    capability: "resumeApprovedAction",
    requestRef: "req-runtime-inactive-reservation-payment-resume-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
    },
  });
  const pendingExecution = await service.ports.intents.getPendingExecution(
    paymentPending.approvalSession.approvalSessionId
  );

  if (!("paymentReceipt" in resumedExecution)) {
    assert.fail("expected resumeApprovedAction to return a settled payment flow");
  }
  assert.equal(resumedExecution.intent.status, "settled");
  assert.equal(resumedExecution.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  assert.equal(pendingExecution.status, "resumed");
});

test("AFAL runtime service propagates rejected approval results into action status and releases reservations", async () => {
  const service = createAfalRuntimeService();
  const paymentPending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-payment-rejected-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  const applied = await service.applyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-runtime-payment-rejected-apply-001",
    input: {
      approvalSessionRef: paymentPending.approvalSession.approvalSessionId,
      result: {
        ...paymentFlowFixtures.approvalResult,
        result: "rejected",
        comment: "Rejected in runtime test",
      },
    },
  });

  const status = await service.getActionStatus({
    capability: "getActionStatus",
    requestRef: "req-runtime-payment-rejected-status-001",
    input: {
      actionRef: paymentPending.intent.intentId,
    },
  });
  const pendingExecution = await service.ports.intents.getPendingExecution(
    paymentPending.approvalSession.approvalSessionId
  );
  const budget = await service.ports.ats.getMonetaryBudgetState(
    paymentFlowFixtures.monetaryBudgetInitial.budgetId
  );

  assert.equal(applied.approvalSession.status, "rejected");
  assert.equal(status.actionType, "payment");
  assert.equal(status.intent.status, "rejected");
  assert.equal(status.intent.challengeState, "rejected");
  assert.equal(status.finalDecision?.result, "rejected");
  assert.equal(pendingExecution.status, "released");
  assert.equal(budget.availableAmount, "1000.00");
  assert.equal(budget.reservedAmount, "0.00");
});

test("AFAL runtime service exposes notification delivery admin entrypoints when configured", async () => {
  let deliveries = 0;
  const adminAuditStore = new InMemoryAfalAdminAuditStore();
  const notifications = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "https://receiver.example/payment",
    },
    fetchImpl: async () => {
      deliveries += 1;
      return new Response(null, { status: 202 });
    },
  });
  const service = createAfalRuntimeService({
    ports: createMockAfalPorts({ notifications }),
    adminAuditStore,
  });
  const pending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-runtime-notification-pending-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  await service.applyApprovalResult({
    capability: "applyApprovalResult",
    requestRef: "req-runtime-notification-apply-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    },
  });
  await service.resumeApprovedAction({
    capability: "resumeApprovedAction",
    requestRef: "req-runtime-notification-resume-001",
    input: {
      approvalSessionRef: pending.approvalSession.approvalSessionId,
    },
  });

  const listed = await service.listNotificationDeliveries({
    capability: "listNotificationDeliveries",
    requestRef: "req-runtime-notification-list-001",
    input: {},
  });
  const notificationId = `notif-${pending.intent.intentId}`;
  const delivery = await service.getNotificationDelivery({
    capability: "getNotificationDelivery",
    requestRef: "req-runtime-notification-get-001",
    input: {
      notificationId,
    },
  });
  const redelivered = await service.redeliverNotification({
    capability: "redeliverNotification",
    requestRef: "req-runtime-notification-redeliver-001",
    input: {
      notificationId,
    },
  });

  assert.equal(deliveries, 2);
  assert.equal(listed.length, 1);
  assert.equal(delivery.notificationId, notificationId);
  assert.equal(delivery.status, "delivered");
  assert.equal(redelivered.delivery.notificationId, notificationId);
  assert.equal(redelivered.delivery.attempts, 2);

  const audits = await service.listAdminAuditEntries({
    capability: "listAdminAuditEntries",
    requestRef: "req-runtime-audit-list-001",
    input: {},
  });
  const audit = await service.getAdminAuditEntry({
    capability: "getAdminAuditEntry",
    requestRef: "req-runtime-audit-get-001",
    input: {
      auditId: "admin-audit-req-runtime-notification-redeliver-001",
    },
  });

  assert.equal(audits.length, 3);
  assert.equal(audit.action, "redeliverNotification");
  assert.equal(audit.targetRef, notificationId);
  assert.equal(audit.requestRef, "req-runtime-notification-redeliver-001");
});

test("AFAL runtime service exposes notification worker control entrypoints when configured", async () => {
  let redelivered = 0;
  const worker = new SettlementNotificationOutboxWorker(
    {
      redeliverFailedNotifications: async () => {
        redelivered += 1;
        return 1;
      },
    },
    {
      intervalMs: 20,
    }
  );
  const service = createAfalRuntimeService({
    notificationWorker: worker,
  });

  const initial = await service.getNotificationWorkerStatus({
    capability: "getNotificationWorkerStatus",
    requestRef: "req-runtime-worker-status-001",
    input: {},
  });
  const started = await service.startNotificationWorker({
    capability: "startNotificationWorker",
    requestRef: "req-runtime-worker-start-001",
    input: {},
  });
  const ran = await service.runNotificationWorker({
    capability: "runNotificationWorker",
    requestRef: "req-runtime-worker-run-001",
    input: {},
  });
  const stopped = await service.stopNotificationWorker({
    capability: "stopNotificationWorker",
    requestRef: "req-runtime-worker-stop-001",
    input: {},
  });

  assert.equal(initial.running, false);
  assert.equal(started.running, true);
  assert.equal(ran.redelivered, 1);
  assert.equal(ran.status.lastResult, 1);
  assert.equal(redelivered, 1);
  assert.equal(stopped.running, false);
});
