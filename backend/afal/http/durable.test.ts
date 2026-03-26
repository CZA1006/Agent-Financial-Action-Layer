import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { JsonFileAmnStore } from "../../amn";
import { JsonFileAtsStore } from "../../ats";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { createSeededDurableAfalBundle } from "../service";
import { createSeededDurableAfalHttpRouter } from "./durable";
import { AFAL_HTTP_ROUTES } from "./types";

test("durable AFAL HTTP router executes payment flow and persists state to durable stores", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-http-"));

  try {
    const first = createSeededDurableAfalHttpRouter(dir);

    const response = await first.router.handle({
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

    const second = createSeededDurableAfalHttpRouter(dir);
    const atsStore = new JsonFileAtsStore({ filePath: second.paths.ats });
    const outputStore = new JsonFileAfalOutputStore({ filePath: second.paths.afalOutputs });

    const budget = await atsStore.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const receipt = await outputStore.getReceipt(paymentFlowFixtures.paymentReceipt.receiptId);

    assert.equal(budget?.consumedAmount, paymentFlowFixtures.monetaryBudgetFinal.consumedAmount);
    assert.equal(receipt?.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("durable AFAL HTTP router applies and resumes approval sessions across restarts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-durable-http-approval-"));

  try {
    const bundle = createSeededDurableAfalBundle(dir);
    const priorDecision = await bundle.ports.amn.evaluateAuthorization({
      actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
      actionType: "payment",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
      policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
      accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
    });
    const approvalRequest = await bundle.ports.amn.createApprovalRequest(priorDecision);

    const first = createSeededDurableAfalHttpRouter(dir);
    const applyResponse = await first.router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.applyApprovalResult,
      body: {
        requestRef: "req-durable-approval-apply-001",
        input: {
          approvalSessionRef: approvalRequest.approvalSession.approvalSessionId,
          result: paymentFlowFixtures.approvalResult,
        },
      },
    });

    assert.equal(applyResponse.statusCode, 200);
    assert.equal(applyResponse.body.ok, true);

    const second = createSeededDurableAfalHttpRouter(dir);
    const resumeResponse = await second.router.handle({
      method: "POST",
      path: AFAL_HTTP_ROUTES.resumeApprovalSession,
      body: {
        requestRef: "req-durable-approval-resume-001",
        input: {
          approvalSessionRef: approvalRequest.approvalSession.approvalSessionId,
        },
      },
    });
    const amnStore = new JsonFileAmnStore({ filePath: second.paths.amn });
    const approvalSession = await amnStore.getApprovalSession(
      approvalRequest.approvalSession.approvalSessionId
    );

    assert.equal(resumeResponse.statusCode, 200);
    assert.equal(resumeResponse.body.ok, true);
    if (
      resumeResponse.body.ok &&
      resumeResponse.body.capability === "resumeApprovalSession" &&
      "finalDecision" in resumeResponse.body.data
    ) {
      assert.equal(resumeResponse.body.data.finalDecision.result, "approved");
    } else {
      assert.fail("expected resumeApprovalSession success response");
    }
    assert.equal(approvalSession?.status, "finalized");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
