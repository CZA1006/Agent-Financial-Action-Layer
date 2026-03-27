import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import {
  HttpSettlementNotificationPort,
  SqliteSettlementNotificationOutboxStore,
  SettlementNotificationOutboxWorker,
} from "./notifications";
import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import { JsonFileSettlementNotificationOutboxStore } from "./notifications";

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 1_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting after ${timeoutMs}ms`);
}

test("HTTP settlement notification port retries with stable idempotency headers and records delivery", async () => {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const port = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
    },
    maxAttempts: 2,
    fetchImpl: async (input, init) => {
      calls.push({
        url: String(input),
        headers: new Headers(init?.headers),
      });

      if (calls.length === 1) {
        return new Response("retry", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 202,
        statusText: "Accepted",
      });
    },
  });

  await port.notifyPaymentSettlement({
    notificationId: "notif-payint-0001",
    eventType: "payment.settled",
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
    approvalSessionRef: paymentFlowFixtures.challengeRecord.challengeId.replace("chall", "aps-chall"),
    payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
    intentStatus: paymentFlowFixtures.paymentIntentFinal.status,
    settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
    receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
    asset: paymentFlowFixtures.paymentIntentFinal.asset,
    amount: paymentFlowFixtures.paymentIntentFinal.amount,
    chain: paymentFlowFixtures.paymentIntentFinal.chain,
    settledAt:
      paymentFlowFixtures.settlementRecord.settledAt ?? paymentFlowFixtures.paymentReceipt.issuedAt,
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url, "http://receiver.test/payment");
  assert.equal(calls[0]?.headers.get("x-afal-idempotency-key"), "notif-payint-0001");
  assert.equal(calls[0]?.headers.get("x-afal-delivery-attempt"), "1");
  assert.equal(calls[1]?.headers.get("x-afal-idempotency-key"), "notif-payint-0001");
  assert.equal(calls[1]?.headers.get("x-afal-delivery-attempt"), "2");

  const records = await port.listDeliveryRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, "delivered");
  assert.equal(records[0]?.attempts, 2);
  assert.equal(records[0]?.redeliveryCount, 0);
  assert.equal(records[0]?.responseStatus, 202);
});

test("HTTP settlement notification port records skipped delivery when no callback target exists", async () => {
  const port = new HttpSettlementNotificationPort();

  await port.notifyResourceSettlement({
    notificationId: "notif-resint-0001",
    eventType: "resource.settled",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    actionRef: resourceFlowFixtures.resourceIntentFinal.intentId,
    approvalSessionRef: resourceFlowFixtures.challengeRecord.challengeId.replace("chall", "aps-chall"),
    providerId: resourceFlowFixtures.resourceIntentFinal.provider.providerId,
    providerDid: resourceFlowFixtures.resourceIntentFinal.provider.providerDid,
    intentStatus: resourceFlowFixtures.resourceIntentFinal.status,
    usageReceiptRef: resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef,
    settlementRef: resourceFlowFixtures.settlementRecord.settlementId,
    receiptRef: resourceFlowFixtures.resourceReceipt.receiptId,
    asset: resourceFlowFixtures.settlementRecord.asset,
    amount: resourceFlowFixtures.settlementRecord.amount,
    resourceClass: resourceFlowFixtures.resourceIntentFinal.resource.resourceClass,
    resourceUnit: resourceFlowFixtures.resourceIntentFinal.resource.resourceUnit,
    quantity: resourceFlowFixtures.resourceIntentFinal.resource.quantity,
    settledAt:
      resourceFlowFixtures.settlementRecord.settledAt ?? resourceFlowFixtures.resourceReceipt.issuedAt,
  });

  const records = await port.listDeliveryRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, "skipped");
  assert.equal(records[0]?.attempts, 0);
  assert.equal(records[0]?.redeliveryCount, 0);
});

test("HTTP settlement notification port records failed delivery after exhausting retries", async () => {
  const port = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
    },
    maxAttempts: 2,
    fetchImpl: async () =>
      new Response("still failing", {
        status: 500,
        statusText: "Internal Server Error",
      }),
  });

  await assert.rejects(
    () =>
      port.notifyPaymentSettlement({
        notificationId: "notif-payint-0001",
        eventType: "payment.settled",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
        approvalSessionRef: paymentFlowFixtures.challengeRecord.challengeId.replace("chall", "aps-chall"),
        payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
        intentStatus: paymentFlowFixtures.paymentIntentFinal.status,
        settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
        receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
        asset: paymentFlowFixtures.paymentIntentFinal.asset,
        amount: paymentFlowFixtures.paymentIntentFinal.amount,
        chain: paymentFlowFixtures.paymentIntentFinal.chain,
        settledAt:
          paymentFlowFixtures.settlementRecord.settledAt ??
          paymentFlowFixtures.paymentReceipt.issuedAt,
      }),
    /Settlement callback failed/
  );

  const records = await port.listDeliveryRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, "failed");
  assert.equal(records[0]?.attempts, 2);
  assert.equal(records[0]?.redeliveryCount, 1);
  assert.ok(records[0]?.nextAttemptAt);
  assert.equal(records[0]?.responseStatus, 500);
});

test("HTTP settlement notification port persists failed outbox entries and can redeliver them", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-notification-outbox-"));
  const store = new JsonFileSettlementNotificationOutboxStore({
    filePath: join(dir, "notification-outbox.json"),
  });

  try {
    const failingPort = new HttpSettlementNotificationPort({
      paymentCallbackUrls: {
        [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
      },
      maxAttempts: 1,
      redeliveryBaseDelayMs: 0,
      fetchImpl: async () =>
        new Response("still failing", {
          status: 503,
          statusText: "Service Unavailable",
        }),
      outboxStore: store,
    });

    await assert.rejects(
      () =>
        failingPort.notifyPaymentSettlement({
          notificationId: "notif-payint-redeliver-0001",
          eventType: "payment.settled",
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
          approvalSessionRef: "aps-chall-0001",
          payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
          intentStatus: paymentFlowFixtures.paymentIntentFinal.status,
          settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
          receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
          asset: paymentFlowFixtures.paymentIntentFinal.asset,
          amount: paymentFlowFixtures.paymentIntentFinal.amount,
          chain: paymentFlowFixtures.paymentIntentFinal.chain,
          settledAt:
            paymentFlowFixtures.settlementRecord.settledAt ??
            paymentFlowFixtures.paymentReceipt.issuedAt,
        }),
      /Settlement callback failed/
    );

    const redeliveryCalls: Headers[] = [];
    const recoveryPort = new HttpSettlementNotificationPort({
      paymentCallbackUrls: {
        [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
      },
      maxAttempts: 1,
      fetchImpl: async (_input, init) => {
        redeliveryCalls.push(new Headers(init?.headers));
        return new Response(JSON.stringify({ ok: true }), {
          status: 202,
          statusText: "Accepted",
        });
      },
      outboxStore: store,
    });

    await recoveryPort.redeliverFailedNotifications();

    assert.equal(redeliveryCalls.length, 1);
    assert.equal(redeliveryCalls[0]?.get("x-afal-idempotency-key"), "notif-payint-redeliver-0001");
    assert.equal(redeliveryCalls[0]?.get("x-afal-delivery-attempt"), "2");

    const records = await recoveryPort.listDeliveryRecords();
    assert.equal(records.length, 1);
    assert.equal(records[0]?.status, "delivered");
    assert.equal(records[0]?.attempts, 2);
    assert.equal(records[0]?.redeliveryCount, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SQLite settlement notification outbox store persists entries across re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-notification-outbox-sqlite-"));
  const filePath = join(dir, "afal-integration.sqlite");
  const store = new SqliteSettlementNotificationOutboxStore({ filePath });

  try {
    await store.putOutboxEntry({
      notificationId: "notif-payint-sqlite-0001",
      eventType: "payment.settled",
      targetUrl: "http://receiver.test/payment",
      payload: {
        notificationId: "notif-payint-sqlite-0001",
        eventType: "payment.settled",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
        approvalSessionRef: "aps-chall-0001",
        payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
        intentStatus: "settled",
        settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
        receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
        asset: paymentFlowFixtures.paymentIntentFinal.asset,
        amount: paymentFlowFixtures.paymentIntentFinal.amount,
        chain: paymentFlowFixtures.paymentIntentFinal.chain,
        settledAt:
          paymentFlowFixtures.settlementRecord.settledAt ??
          paymentFlowFixtures.paymentReceipt.issuedAt,
      },
      idempotencyKey: "notif-payint-sqlite-0001",
      attempts: 2,
      status: "failed",
      redeliveryCount: 1,
      createdAt: "2026-03-24T12:08:10Z",
      updatedAt: "2026-03-24T12:08:12Z",
      lastAttemptAt: "2026-03-24T12:08:12Z",
      nextAttemptAt: "2026-03-24T12:09:12Z",
      responseStatus: 503,
      errorMessage: "temporary failure",
    });

    const reopened = new SqliteSettlementNotificationOutboxStore({ filePath });
    const entry = await reopened.getOutboxEntry("notif-payint-sqlite-0001");
    const listed = await reopened.listOutboxEntries();

    assert.equal(entry?.notificationId, "notif-payint-sqlite-0001");
    assert.equal(entry?.status, "failed");
    assert.equal(entry?.redeliveryCount, 1);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.responseStatus, 503);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("notification outbox worker automatically redelivers failed notifications", async () => {
  let calls = 0;
  const port = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
    },
    maxAttempts: 1,
    redeliveryBaseDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("fail once", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 202,
        statusText: "Accepted",
      });
    },
  });

  await assert.rejects(
    () =>
      port.notifyPaymentSettlement({
        notificationId: "notif-payint-worker-0001",
        eventType: "payment.settled",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
        approvalSessionRef: "aps-chall-worker-0001",
        payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
        intentStatus: paymentFlowFixtures.paymentIntentFinal.status,
        settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
        receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
        asset: paymentFlowFixtures.paymentIntentFinal.asset,
        amount: paymentFlowFixtures.paymentIntentFinal.amount,
        chain: paymentFlowFixtures.paymentIntentFinal.chain,
        settledAt:
          paymentFlowFixtures.settlementRecord.settledAt ??
          paymentFlowFixtures.paymentReceipt.issuedAt,
      }),
    /Settlement callback failed/
  );

  const worker = new SettlementNotificationOutboxWorker(port, {
    intervalMs: 20,
  });
  worker.start();

  try {
    await waitFor(async () => {
      const records = await port.listDeliveryRecords();
      return records[0]?.status === "delivered" && records[0]?.attempts === 2;
    });
  } finally {
    await worker.stop();
  }

  const records = await port.listDeliveryRecords();
  assert.equal(calls, 2);
  assert.equal(records[0]?.status, "delivered");
  assert.equal(records[0]?.attempts, 2);
  assert.equal(records[0]?.redeliveryCount, 1);
  assert.equal(worker.getStatus().running, false);
});

test("notification outbox worker skips failed entries until nextAttemptAt", async () => {
  const times = [
    new Date("2026-03-27T10:00:00Z"),
    new Date("2026-03-27T10:00:00Z"),
    new Date("2026-03-27T10:00:00Z"),
    new Date("2026-03-27T10:00:00.500Z"),
    new Date("2026-03-27T10:00:01.500Z"),
    new Date("2026-03-27T10:00:01.500Z"),
  ];
  const port = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
    },
    maxAttempts: 1,
    redeliveryBaseDelayMs: 1_000,
    fetchImpl: async () =>
      new Response("still failing", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    now: () => times.shift() ?? new Date("2026-03-27T10:00:01.500Z"),
  });

  await assert.rejects(
    () =>
      port.notifyPaymentSettlement({
        notificationId: "notif-payint-backoff-0001",
        eventType: "payment.settled",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
        approvalSessionRef: "aps-chall-backoff-0001",
        payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
        intentStatus: paymentFlowFixtures.paymentIntentFinal.status,
        settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
        receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
        asset: paymentFlowFixtures.paymentIntentFinal.asset,
        amount: paymentFlowFixtures.paymentIntentFinal.amount,
        chain: paymentFlowFixtures.paymentIntentFinal.chain,
        settledAt:
          paymentFlowFixtures.settlementRecord.settledAt ??
          paymentFlowFixtures.paymentReceipt.issuedAt,
      }),
    /Settlement callback failed/
  );

  const skipped = await port.redeliverFailedNotifications();
  await assert.rejects(
    () => port.redeliverFailedNotifications(),
    /Settlement callback failed/
  );
  const records = await port.listDeliveryRecords();

  assert.equal(skipped, 0);
  assert.equal(records[0]?.status, "failed");
  assert.equal(records[0]?.redeliveryCount, 2);
});

test("notification outbox dead-letters entries after exhausting redelivery cycles", async () => {
  const port = new HttpSettlementNotificationPort({
    paymentCallbackUrls: {
      [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: "http://receiver.test/payment",
    },
    maxAttempts: 1,
    maxRedeliveryCycles: 2,
    redeliveryBaseDelayMs: 0,
    fetchImpl: async () =>
      new Response("still failing", {
        status: 503,
        statusText: "Service Unavailable",
      }),
  });

  await assert.rejects(
    () =>
      port.notifyPaymentSettlement({
        notificationId: "notif-payint-dead-letter-0001",
        eventType: "payment.settled",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        actionRef: paymentFlowFixtures.paymentIntentFinal.intentId,
        approvalSessionRef: "aps-chall-dead-letter-0001",
        payeeDid: paymentFlowFixtures.paymentIntentFinal.payee.payeeDid,
        intentStatus: paymentFlowFixtures.paymentIntentFinal.status,
        settlementRef: paymentFlowFixtures.settlementRecord.settlementId,
        receiptRef: paymentFlowFixtures.paymentReceipt.receiptId,
        asset: paymentFlowFixtures.paymentIntentFinal.asset,
        amount: paymentFlowFixtures.paymentIntentFinal.amount,
        chain: paymentFlowFixtures.paymentIntentFinal.chain,
        settledAt:
          paymentFlowFixtures.settlementRecord.settledAt ??
          paymentFlowFixtures.paymentReceipt.issuedAt,
      }),
    /Settlement callback failed/
  );
  await assert.rejects(
    () => port.redeliverFailedNotifications(),
    /Settlement callback failed/
  );

  const records = await port.listDeliveryRecords();
  assert.equal(records[0]?.status, "dead-lettered");
  assert.equal(records[0]?.redeliveryCount, 2);
  assert.ok(records[0]?.deadLetteredAt);
  assert.equal(await port.redeliverFailedNotifications(), 0);
});
