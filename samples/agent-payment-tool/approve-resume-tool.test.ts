import test from "node:test";
import assert from "node:assert/strict";

import type { TrustedSurfaceStubRunResult } from "../../app/trusted-surface/stub";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { summarizeApproveResume } from "./approve-resume-tool";

test("summarizeApproveResume exposes settlement evidence and provider-gate hint", () => {
  const run: TrustedSurfaceStubRunResult = {
    summary: {
      approvalSessionRef: "aps-chall-0001",
      actionRef: "payint-0001",
      actionType: "payment",
      result: "approved",
      resumedAction: true,
      finalIntentStatus: "settled",
      settlementRef: "stl-wallet-payint-0001",
      receiptRef: "rcpt-pay-0001",
    },
    session: {
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
      status: "approved",
      createdAt: "2026-03-24T12:05:06Z",
      updatedAt: "2026-03-24T12:07:00Z",
    },
    approvalResult: paymentFlowFixtures.approvalResult,
    applied: {
      approvalResult: paymentFlowFixtures.approvalResult,
      approvalSession: {
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
        status: "approved",
        createdAt: "2026-03-24T12:05:06Z",
        updatedAt: "2026-03-24T12:07:00Z",
      },
      challenge: paymentFlowFixtures.challengeRecord,
    },
    resumed: {
      intent: {
        ...paymentFlowFixtures.paymentIntentFinal,
        status: "settled",
      },
      initialDecision: paymentFlowFixtures.authorizationDecisionInitial,
      finalDecision: paymentFlowFixtures.authorizationDecisionFinal,
      settlement: {
        ...paymentFlowFixtures.settlementRecord,
        settlementId: "stl-wallet-payint-0001",
        txHash: "0xabc",
      },
      paymentReceipt: {
        ...paymentFlowFixtures.paymentReceipt,
        receiptId: "rcpt-pay-0001",
        settlementRef: "stl-wallet-payint-0001",
        evidence: {
          ...paymentFlowFixtures.paymentReceipt.evidence,
          txHash: "0xabc",
        },
      },
      capabilityResponse: paymentFlowFixtures.capabilityResponse,
    },
  };

  const summary = summarizeApproveResume(run);

  assert.equal(summary.finalIntentStatus, "settled");
  assert.equal(summary.deliverableHint, "run_provider_gate");
  assert.equal(summary.txHash, "0xabc");
});
