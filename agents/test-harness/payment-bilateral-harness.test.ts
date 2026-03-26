import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import {
  createSeededSqliteAfalHttpServer,
  handleAfalNodeHttpRequest,
} from "../../backend/afal/http/sqlite-server";
import { createAfalNodeTransportClient } from "./http-client";
import { runBilateralPaymentHarness } from "./payment-bilateral-harness";

test("bilateral payment harness lets the payee agent confirm the settled payment over HTTP", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-agent-payment-bilateral-"));

  try {
    const sqliteServer = createSeededSqliteAfalHttpServer(dir);
    const client = createAfalNodeTransportClient((request) =>
      handleAfalNodeHttpRequest(sqliteServer, request)
    );

    const result = await runBilateralPaymentHarness(client);

    assert.equal(result.payer.summary.status, "pending-approval");
    assert.equal(result.approval.summary.finalIntentStatus, "settled");
    assert.equal(result.payee.summary.intentStatus, "settled");
    assert.equal(result.summary.settlementRef, "stl-0001");
    assert.equal(result.summary.receiptRef, "rcpt-pay-0001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
