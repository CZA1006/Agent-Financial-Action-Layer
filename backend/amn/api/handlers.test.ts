import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createSeededInMemoryAmnService } from "../bootstrap";
import {
  handleApplyApprovalResult,
  createAmnApiHandlers,
  handleBuildApprovalContext,
  handleCreateApprovalRequest,
  handleCreateChallengeRecord,
  handleEvaluateAuthorization,
  handleFinalizeAuthorization,
  handleGetApprovalSession,
  handleGetMandate,
  handleRecordApprovalResult,
  handleResumeAuthorizationSession,
} from "./handlers";

describe("AMN API adapter", () => {
  test("returns a success envelope for getMandate", async () => {
    const response = await handleGetMandate({
      capability: "getMandate",
      requestRef: "req-amn-mandate-001",
      input: {
        mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.mandateId, paymentFlowFixtures.paymentMandate.mandateId);
    }
  });

  test("returns a success envelope for evaluateAuthorization", async () => {
    const response = await handleEvaluateAuthorization({
      capability: "evaluateAuthorization",
      requestRef: "req-amn-eval-001",
      input: {
        actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
        actionType: "payment",
        subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
        mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
        policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
        accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.result, "challenge-required");
    }
  });

  test("returns success envelopes for challenge and approval handlers", async () => {
    const amn = createSeededInMemoryAmnService();
    const decisionResponse = await handleEvaluateAuthorization(
      {
        capability: "evaluateAuthorization",
        requestRef: "req-amn-eval-002",
        input: {
          actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
          actionType: "resource",
          subjectDid: resourceFlowFixtures.resourceIntentCreated.requester.agentDid,
          mandateRef: resourceFlowFixtures.resourceMandate.mandateId,
          policyRef: resourceFlowFixtures.resourceIntentCreated.policyRef,
          accountRef: resourceFlowFixtures.resourceIntentCreated.requester.accountId,
        },
      },
      amn
    );

    assert.equal(decisionResponse.ok, true);
    if (!decisionResponse.ok) return;

    const challengeResponse = await handleCreateChallengeRecord(
      {
        capability: "createChallengeRecord",
        requestRef: "req-amn-challenge-001",
        input: {
          decision: decisionResponse.data,
        },
      },
      amn
    );
    const contextResponse = await handleBuildApprovalContext(
      {
        capability: "buildApprovalContext",
        requestRef: "req-amn-context-001",
        input: {
          challenge: challengeResponse.ok ? challengeResponse.data : resourceFlowFixtures.challengeRecord,
        },
      },
      amn
    );
    const approvalResponse = await handleRecordApprovalResult(
      {
        capability: "recordApprovalResult",
        requestRef: "req-amn-approval-001",
        input: {
          result: resourceFlowFixtures.approvalResult,
        },
      },
      amn
    );

    assert.equal(challengeResponse.ok, true);
    assert.equal(contextResponse.ok, true);
    assert.equal(approvalResponse.ok, true);
  });

  test("returns success envelopes for approval session lifecycle handlers", async () => {
    const amn = createSeededInMemoryAmnService();
    const decision = await amn.evaluateAuthorization({
      actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
      actionType: "payment",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
      policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
      accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
    });

    const approvalRequestResponse = await handleCreateApprovalRequest(
      {
        capability: "createApprovalRequest",
        requestRef: "req-amn-approval-request-001",
        input: {
          priorDecision: decision,
        },
      },
      amn
    );

    assert.equal(approvalRequestResponse.ok, true);
    if (!approvalRequestResponse.ok) return;

    const sessionResponse = await handleGetApprovalSession(
      {
        capability: "getApprovalSession",
        requestRef: "req-amn-approval-session-001",
        input: {
          approvalSessionRef: approvalRequestResponse.data.approvalSession.approvalSessionId,
        },
      },
      amn
    );
    const appliedResponse = await handleApplyApprovalResult(
      {
        capability: "applyApprovalResult",
        requestRef: "req-amn-approval-apply-001",
        input: {
          approvalSessionRef: approvalRequestResponse.data.approvalSession.approvalSessionId,
          result: paymentFlowFixtures.approvalResult,
        },
      },
      amn
    );
    const resumedResponse = await handleResumeAuthorizationSession(
      {
        capability: "resumeAuthorizationSession",
        requestRef: "req-amn-approval-resume-001",
        input: {
          approvalSessionRef: approvalRequestResponse.data.approvalSession.approvalSessionId,
        },
      },
      amn
    );

    assert.equal(sessionResponse.ok, true);
    assert.equal(appliedResponse.ok, true);
    assert.equal(resumedResponse.ok, true);
    if (resumedResponse.ok) {
      assert.equal(resumedResponse.data.finalDecision.result, "approved");
      assert.equal(resumedResponse.data.approvalSession.status, "finalized");
    }
  });

  test("returns a success envelope for finalizeAuthorization", async () => {
    const amn = createSeededInMemoryAmnService();
    const prior = await amn.evaluateAuthorization({
      actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
      actionType: "payment",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
      policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
      accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
    });

    const response = await handleFinalizeAuthorization(
      {
        capability: "finalizeAuthorization",
        requestRef: "req-amn-finalize-001",
        input: {
          priorDecision: prior,
          approvalResult: paymentFlowFixtures.approvalResult,
        },
      },
      amn
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.result, "approved");
    }
  });

  test("maps unknown mandate to a 404 response", async () => {
    const response = await handleGetMandate({
      capability: "getMandate",
      requestRef: "req-amn-mandate-404",
      input: {
        mandateRef: "mnd-missing-404",
      },
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 404);
      assert.equal(response.error.code, "not-found");
    }
  });

  test("maps unknown actionRef to a 404 response", async () => {
    const response = await handleEvaluateAuthorization({
      capability: "evaluateAuthorization",
      requestRef: "req-amn-eval-404",
      input: {
        actionRef: "unknown-action-404",
        actionType: "payment",
        subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
        mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
        policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
        accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
      },
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 404);
      assert.equal(response.error.code, "not-found");
    }
  });

  test("supports generic capability dispatch", async () => {
    const handlers = createAmnApiHandlers();

    const mandateResponse = await handlers.invokeCapability({
      capability: "getMandate",
      requestRef: "req-amn-dispatch-001",
      input: {
        mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
      },
    });

    const evalResponse = await handlers.invokeCapability({
      capability: "evaluateAuthorization",
      requestRef: "req-amn-dispatch-002",
      input: {
        actionRef: resourceFlowFixtures.resourceIntentCreated.intentId,
        actionType: "resource",
        subjectDid: resourceFlowFixtures.resourceIntentCreated.requester.agentDid,
        mandateRef: resourceFlowFixtures.resourceMandate.mandateId,
        policyRef: resourceFlowFixtures.resourceIntentCreated.policyRef,
        accountRef: resourceFlowFixtures.resourceIntentCreated.requester.accountId,
      },
    });

    const approvalRequestResponse = await handlers.invokeCapability({
      capability: "createApprovalRequest",
      requestRef: "req-amn-dispatch-003",
      input: {
        priorDecision: paymentFlowFixtures.authorizationDecisionInitial,
      },
    });

    assert.equal(mandateResponse.ok, true);
    assert.equal(evalResponse.ok, true);
    assert.equal(approvalRequestResponse.ok, true);
  });
});
