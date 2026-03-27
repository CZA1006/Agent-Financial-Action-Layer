import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { runSpawnedBilateralResourceHarness } from "./resource-bilateral-harness";

test("bilateral resource harness pushes a settlement callback to the provider-side agent", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-agent-resource-bilateral-"));

  try {
    const result = await runSpawnedBilateralResourceHarness({
      dataDir: dir,
      port: 0,
    });

    assert.equal(result.requester.summary.status, "pending-approval");
    assert.equal(result.approval.summary.finalIntentStatus, "settled");
    assert.match(result.summary.trustedSurfaceUrl ?? "", /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(result.provider.summary.intentStatus, "settled");
    assert.equal(result.provider.notification.eventType, "resource.settled");
    assert.equal(result.provider.delivery.headers.idempotencyKey, "notif-resint-0001");
    assert.equal(result.provider.delivery.headers.deliveryAttempt, "1");
    assert.equal(result.provider.delivery.duplicate, false);
    assert.equal(result.summary.usageReceiptRef, "usage-1001");
    assert.equal(result.summary.settlementRef, "stl-1001");
    assert.equal(result.summary.receiptRef, "rcpt-res-1001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
