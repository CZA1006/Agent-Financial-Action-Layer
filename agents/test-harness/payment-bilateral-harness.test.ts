import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { runSpawnedBilateralPaymentHarness } from "./payment-bilateral-harness";

test("bilateral payment harness pushes a settlement callback to the payee-side agent", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-agent-payment-bilateral-"));

  try {
    const result = await runSpawnedBilateralPaymentHarness({
      dataDir: dir,
      port: 0,
    });

    assert.equal(result.payer.summary.status, "pending-approval");
    assert.equal(result.approval.summary.finalIntentStatus, "settled");
    assert.match(result.summary.trustedSurfaceUrl ?? "", /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(result.payee.summary.intentStatus, "settled");
    assert.equal(result.payee.notification.eventType, "payment.settled");
    assert.match(result.summary.trustedSurfaceUrl ?? "", /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(result.payee.delivery.headers.idempotencyKey, "notif-payint-0001");
    assert.equal(result.payee.delivery.headers.deliveryAttempt, "1");
    assert.equal(result.payee.delivery.duplicate, false);
    assert.equal(result.summary.settlementRef, "stl-0001");
    assert.equal(result.summary.receiptRef, "rcpt-pay-0001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bilateral payment harness automatically redelivers failed payee callbacks through the outbox worker", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-agent-payment-bilateral-worker-"));

  try {
    const result = await runSpawnedBilateralPaymentHarness({
      dataDir: dir,
      port: 0,
      payeeFailFirstAttempts: 1,
      notificationWorkerIntervalMs: 25,
    });

    assert.equal(result.payee.notification.eventType, "payment.settled");
    assert.equal(result.payee.delivery.headers.idempotencyKey, "notif-payint-0001");
    assert.equal(result.payee.delivery.headers.deliveryAttempt, "2");
    assert.equal(result.payee.delivery.duplicate, false);
    assert.equal(result.summary.settlementRef, "stl-0001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
