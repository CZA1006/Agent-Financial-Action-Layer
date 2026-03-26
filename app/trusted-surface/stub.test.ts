import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../sdk/fixtures";
import { createAfalRuntimeService } from "../../backend/afal/service";
import {
  buildTrustedSurfaceApprovalResult,
  createTrustedSurfaceServiceClient,
  runTrustedSurfaceStub,
} from "./stub";

test("trusted-surface stub builds a deterministic approval result from an approval session", () => {
  const result = buildTrustedSurfaceApprovalResult(
    {
      approvalSessionId: "aps-chall-0001",
      schemaVersion: "0.1",
      actionRef: "payint-0001",
      actionType: "payment",
      subjectDid: "did:afal:agent:payment-agent-01",
      mandateRef: "mnd-0001",
      policyRef: "cred-policy-0001",
      priorDecisionRef: "dec-0001",
      challengeRef: "chall-0001",
      approvalContextRef: "ctx-0001",
      trustedSurfaceRef: "trusted-surface:web",
      status: "pending",
      createdAt: "2026-03-24T12:05:06Z",
      updatedAt: "2026-03-24T12:05:06Z",
      expiresAt: "2026-03-24T12:15:00Z",
    },
    {
      decidedAt: paymentFlowFixtures.approvalResult.decidedAt,
      comment: paymentFlowFixtures.approvalResult.comment,
    }
  );

  assert.deepEqual(result, paymentFlowFixtures.approvalResult);
});

test("trusted-surface stub can apply approval and resume a pending payment action through the module service", async () => {
  const service = createAfalRuntimeService();
  const pending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-trusted-surface-pending-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  const result = await runTrustedSurfaceStub(createTrustedSurfaceServiceClient(service), {
    approvalSessionRef: pending.approvalSession.approvalSessionId,
    requestRefPrefix: "req-trusted-surface-stub-001",
    decidedAt: paymentFlowFixtures.approvalResult.decidedAt,
    comment: paymentFlowFixtures.approvalResult.comment,
  });

  assert.equal(result.summary.result, "approved");
  assert.equal(result.summary.resumedAction, true);
  assert.equal(result.summary.finalIntentStatus, "settled");
  assert.equal(result.summary.settlementRef, paymentFlowFixtures.settlementRecord.settlementId);
  assert.equal(result.summary.receiptRef, paymentFlowFixtures.paymentReceipt.receiptId);
  assert.equal(result.applied.approvalSession.status, "approved");
  assert.ok(result.resumed);
});
