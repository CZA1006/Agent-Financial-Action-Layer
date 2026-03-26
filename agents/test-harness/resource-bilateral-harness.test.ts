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
import { runBilateralResourceHarness } from "./resource-bilateral-harness";

test("bilateral resource harness lets the provider agent confirm settled usage over HTTP", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-agent-resource-bilateral-"));

  try {
    const sqliteServer = createSeededSqliteAfalHttpServer(dir);
    const client = createAfalNodeTransportClient((request) =>
      handleAfalNodeHttpRequest(sqliteServer, request)
    );

    const result = await runBilateralResourceHarness(client);

    assert.equal(result.requester.summary.status, "pending-approval");
    assert.equal(result.approval.summary.finalIntentStatus, "settled");
    assert.equal(result.provider.summary.intentStatus, "settled");
    assert.equal(result.summary.usageReceiptRef, "usage-1001");
    assert.equal(result.summary.settlementRef, "stl-1001");
    assert.equal(result.summary.receiptRef, "rcpt-res-1001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
