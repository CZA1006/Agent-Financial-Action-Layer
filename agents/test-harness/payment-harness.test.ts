import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { createSeededSqliteAfalHttpServer, handleAfalNodeHttpRequest } from "../../backend/afal/http/sqlite-server";
import { createAfalNodeTransportClient } from "./http-client";
import { runAgentPaymentHarness } from "./payment-harness";

test("runtime-agent harness completes the canonical payment approval flow through the HTTP contract", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-agent-harness-"));

  try {
    const sqliteServer = createSeededSqliteAfalHttpServer(dir);
    const client = createAfalNodeTransportClient((request) =>
      handleAfalNodeHttpRequest(sqliteServer, request)
    );

    const result = await runAgentPaymentHarness(client);

    assert.equal(result.payer.summary.status, "pending-approval");
    assert.equal(result.approval.summary.result, "approved");
    assert.equal(result.approval.summary.finalIntentStatus, "settled");
    assert.equal(result.summary.settlementRef, "stl-0001");
    assert.equal(result.summary.receiptRef, "rcpt-pay-0001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
