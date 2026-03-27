import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { runNotificationAdminDemo } from "./notification-admin-demo";

test("notification admin demo recovers a failed settlement callback through operator routes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-notification-admin-demo-"));

  try {
    const result = await runNotificationAdminDemo({
      dataDir: dir,
      port: 0,
    });

    assert.equal(result.summary.notificationId, "notif-payint-0001");
    assert.equal(result.summary.failedStatusBeforeWorker, "failed");
    assert.equal(result.summary.finalStatusAfterWorker, "delivered");
    assert.equal(result.summary.redelivered, 1);
    assert.equal(result.summary.settlementRef, "stl-0001");
    assert.equal(result.summary.receiptRef, "rcpt-pay-0001");

    assert.equal(result.deliveryBeforeWorker.status, "failed");
    assert.equal(result.deliveryBeforeWorker.attempts, 1);
    assert.equal(result.deliveryBeforeWorker.redeliveryCount, 1);
    assert.equal(result.deliveryAfterWorker.status, "delivered");
    assert.equal(result.deliveryAfterWorker.attempts, 2);
    assert.equal(result.workerStatusBefore.running, false);
    assert.equal(result.workerRun.redelivered, 1);
    assert.equal(result.workerRun.status.running, false);

    assert.equal(result.payee.notification.eventType, "payment.settled");
    assert.equal(result.payee.delivery.headers.idempotencyKey, "notif-payint-0001");
    assert.equal(result.payee.delivery.headers.deliveryAttempt, "2");
    assert.equal(result.payee.delivery.duplicate, false);

    assert.ok(result.audit.listed.length >= 4);
    assert.equal(result.audit.workerRunEntry.action, "runNotificationWorker");
    assert.deepEqual(result.audit.workerRunEntry.details, {
      redelivered: 1,
      running: false,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
