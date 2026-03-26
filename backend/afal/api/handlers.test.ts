import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createMockAfalPorts, createMockPaymentFlowOrchestrator, createMockResourceFlowOrchestrator } from "../mock";
import { createAfalRuntimeService } from "../service";
import {
  createAfalApiHandlers,
  handleApplyApprovalResult,
  handleExecutePayment,
  handleGetActionStatus,
  handleGetApprovalSession,
  handleRequestPaymentApproval,
  handleRequestResourceApproval,
  handleResumeApprovedAction,
  handleResumeApprovalSession,
  handleSettleResourceUsage,
} from "./handlers";

describe("AFAL API adapter", () => {
  test("returns a success envelope for executePayment", async () => {
    const response = await handleExecutePayment({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.statusCode, 200);
      assert.equal(response.data.finalDecision.result, "approved");
      assert.equal(response.data.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
    }
  });

  test("returns success envelopes for top-level pending approval capability handlers", async () => {
    const paymentPending = await handleRequestPaymentApproval({
      capability: "requestPaymentApproval",
      requestRef: "req-handler-pending-payment-001",
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    const resourcePending = await handleRequestResourceApproval({
      capability: "requestResourceApproval",
      requestRef: "req-handler-pending-resource-001",
      input: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intent: resourceFlowFixtures.resourceIntentCreated,
        resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
        resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    assert.equal(paymentPending.ok, true);
    assert.equal(resourcePending.ok, true);
    if (paymentPending.ok) {
      assert.equal(paymentPending.data.capabilityResponse.result, "pending-approval");
    }
    if (resourcePending.ok) {
      assert.equal(resourcePending.data.capabilityResponse.result, "pending-approval");
    }
  });

  test("maps credential verification failure to a 403 response", async () => {
    const basePorts = createMockAfalPorts();
    const orchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        aip: {
          resolveIdentity: (subjectDid) => basePorts.aip.resolveIdentity(subjectDid),
          verifyCredential: async (credentialId) =>
            credentialId === paymentFlowFixtures.policyCredential.id
              ? false
              : basePorts.aip.verifyCredential(credentialId),
        },
      })
    );

    const response = await handleExecutePayment(
      {
        capability: "executePayment",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
      orchestrator
    );

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 403);
      assert.equal(response.error.code, "credential-verification-failed");
    }
  });

  test("maps payment approval expiry to a 409 response", async () => {
    const orchestrator = createMockPaymentFlowOrchestrator(
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

    const response = await handleExecutePayment(
      {
        capability: "executePayment",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
      orchestrator
    );

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 409);
      assert.equal(response.error.code, "authorization-expired");
    }
  });

  test("maps provider usage confirmation failure to a 502 response", async () => {
    const orchestrator = createMockResourceFlowOrchestrator(
      createMockAfalPorts({
        resourceSettlement: {
          confirmResourceUsage: async () => {
            throw new Error("Provider usage confirmation failed");
          },
          settleResourceUsage: async () => {
            throw new Error("resource settlement should not run");
          },
        },
      })
    );

    const response = await handleSettleResourceUsage(
      {
        capability: "settleResourceUsage",
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        },
      },
      orchestrator
    );

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 502);
      assert.equal(response.error.code, "provider-failure");
    }
  });

  test("supports generic capability dispatch", async () => {
    const handlers = createAfalApiHandlers();

    const paymentResponse = await handlers.invokeCapability({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    const resourceResponse = await handlers.invokeCapability({
      capability: "settleResourceUsage",
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intent: resourceFlowFixtures.resourceIntentCreated,
        resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
        resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    assert.equal(paymentResponse.ok, true);
    assert.equal(resourceResponse.ok, true);
  });

  test("returns success envelopes for approval session handlers", async () => {
    const runtime = createAfalRuntimeService();
    const pending = await runtime.requestPaymentApproval({
      capability: "requestPaymentApproval",
      requestRef: "req-afal-request-payment-approval-001",
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    const sessionResponse = await handleGetApprovalSession(
      {
        capability: "getApprovalSession",
        requestRef: "req-afal-session-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
        },
      },
      runtime
    );
    const appliedResponse = await handleApplyApprovalResult(
      {
        capability: "applyApprovalResult",
        requestRef: "req-afal-apply-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
          result: paymentFlowFixtures.approvalResult,
        },
      },
      runtime
    );
    const resumedResponse = await handleResumeApprovalSession(
      {
        capability: "resumeApprovalSession",
        requestRef: "req-afal-resume-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
        },
      },
      runtime
    );
    const resumedActionResponse = await handleResumeApprovedAction(
      {
        capability: "resumeApprovedAction",
        requestRef: "req-afal-resume-action-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
        },
      },
      runtime
    );

    assert.equal(sessionResponse.ok, true);
    assert.equal(appliedResponse.ok, true);
    assert.equal(resumedResponse.ok, true);
    assert.equal(resumedActionResponse.ok, true);
    if (resumedResponse.ok) {
      assert.equal(resumedResponse.data.finalDecision.result, "approved");
    }
    if (resumedActionResponse.ok) {
      assert.equal(resumedActionResponse.data.finalDecision.result, "approved");
    }
  });

  test("returns a success envelope for getActionStatus after resuming a payment action", async () => {
    const runtime = createAfalRuntimeService();
    const pending = await runtime.requestPaymentApproval({
      capability: "requestPaymentApproval",
      requestRef: "req-afal-action-status-payment-001",
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    await runtime.applyApprovalResult({
      capability: "applyApprovalResult",
      requestRef: "req-afal-action-status-apply-001",
      input: {
        approvalSessionRef: pending.approvalSession.approvalSessionId,
        result: paymentFlowFixtures.approvalResult,
      },
    });
    await runtime.resumeApprovedAction({
      capability: "resumeApprovedAction",
      requestRef: "req-afal-action-status-resume-001",
      input: {
        approvalSessionRef: pending.approvalSession.approvalSessionId,
      },
    });

    const response = await handleGetActionStatus(
      {
        capability: "getActionStatus",
        requestRef: "req-afal-action-status-read-001",
        input: {
          actionRef: pending.intent.intentId,
        },
      },
      runtime
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.actionType, "payment");
      assert.equal(response.data.intent.status, "settled");
      assert.equal(
        response.data.settlement?.settlementId,
        paymentFlowFixtures.settlementRecord.settlementId
      );
      assert.equal(
        response.data.paymentReceipt?.receiptId,
        paymentFlowFixtures.paymentReceipt.receiptId
      );
    }
  });
});
