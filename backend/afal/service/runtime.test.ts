import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createMockAfalPorts } from "../mock";
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
