import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../sdk/fixtures";
import { createSeededAmnRecords } from "./bootstrap";
import { InMemoryAmnService } from "./service";
import { SqliteAmnStore } from "./sqlite-store";

test("AMN SQLite store persists seeded records across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "amn-sqlite-store-"));
  const filePath = join(dir, "amn-store.sqlite");
  const seed = createSeededAmnRecords();

  try {
    const first = new SqliteAmnStore({
      filePath,
      seed: {
        mandates: seed.mandates,
        decisions: [],
        challenges: [],
        approvalContexts: [],
        approvalResults: [],
        approvalSessions: [],
      },
    });

    const mandate = await first.getMandate(paymentFlowFixtures.paymentMandate.mandateId);
    assert.equal(mandate?.mandateId, paymentFlowFixtures.paymentMandate.mandateId);

    const second = new SqliteAmnStore({ filePath });
    const mandates = await second.listMandates();

    assert.equal(mandates.length, 2);
    assert.ok(mandates.some((entry) => entry.mandateId === paymentFlowFixtures.paymentMandate.mandateId));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("AMN service state survives re-instantiation when backed by the SQLite store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "amn-sqlite-service-"));
  const filePath = join(dir, "amn-store.sqlite");
  const seed = createSeededAmnRecords();

  try {
    const first = new InMemoryAmnService({
      store: new SqliteAmnStore({
        filePath,
        seed: {
          mandates: seed.mandates,
          decisions: [],
          challenges: [],
          approvalContexts: [],
          approvalResults: [],
          approvalSessions: [],
        },
      }),
      initialDecisionTemplates: seed.initialDecisionTemplates,
      finalDecisionTemplates: seed.finalDecisionTemplates,
      challengeTemplates: seed.challengeTemplates,
      approvalContextTemplates: seed.approvalContextTemplates,
      approvalResultTemplates: seed.approvalResultTemplates,
    });

    const initial = await first.evaluateAuthorization({
      actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
      actionType: "payment",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRef: paymentFlowFixtures.paymentMandate.mandateId,
      policyRef: paymentFlowFixtures.paymentIntentCreated.policyRef,
      accountRef: paymentFlowFixtures.paymentIntentCreated.payer.accountId,
    });
    const request = await first.createApprovalRequest(initial);
    await first.applyApprovalResult({
      approvalSessionRef: request.approvalSession.approvalSessionId,
      result: paymentFlowFixtures.approvalResult,
    });
    await first.resumeAuthorizationSession(request.approvalSession.approvalSessionId);

    const second = new InMemoryAmnService({
      store: new SqliteAmnStore({ filePath }),
      initialDecisionTemplates: seed.initialDecisionTemplates,
      finalDecisionTemplates: seed.finalDecisionTemplates,
      challengeTemplates: seed.challengeTemplates,
      approvalContextTemplates: seed.approvalContextTemplates,
      approvalResultTemplates: seed.approvalResultTemplates,
    });

    const session = await second.getApprovalSession(request.approvalSession.approvalSessionId);
    const finalDecision = session?.finalDecisionRef
      ? await second.getDecision(session.finalDecisionRef)
      : undefined;

    assert.equal(session?.status, "finalized");
    assert.equal(session?.approvalResultRef, paymentFlowFixtures.approvalResult.approvalResultId);
    assert.equal(finalDecision?.result, "approved");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
