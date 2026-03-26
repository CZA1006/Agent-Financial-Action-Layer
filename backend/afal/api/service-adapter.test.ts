import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
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
});
