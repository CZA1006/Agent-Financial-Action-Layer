# Notification Operator Handbook

## Purpose

This handbook describes how to operate AFAL's current Phase 1 notification delivery surface.

It is for operators who need to:

- inspect failed receiver-side settlement callbacks
- understand worker state
- manually trigger redelivery
- confirm whether delivery has recovered
- read the admin audit trail for notification control actions

This handbook is the operational companion to:

- [docs/specs/receiver-settlement-callback-contract.md](docs/specs/receiver-settlement-callback-contract.md#L1)
- [docs/specs/afal-http-openapi-draft.yaml](docs/specs/afal-http-openapi-draft.yaml#L1)
- [docs/product/notification-operator-playbook.md](docs/product/notification-operator-playbook.md#L1)

---

## Current Stage

This handbook reflects the current repository stage:

- Phase 1 integration-ready runtime
- active receiver callback delivery
- persistent notification outbox
- background worker with bounded retry and dead-letter metadata
- operator-protected outbox, worker, and admin-audit HTTP routes

This is still a local or integration-mode operations surface.

It is not yet a production control plane.

---

## What Exists Today

The current operator surface covers three areas:

1. notification delivery records
2. notification worker control
3. admin audit reads

Current HTTP routes:

- `POST /notification-deliveries/list`
- `POST /notification-deliveries/get`
- `POST /notification-deliveries/redeliver`
- `POST /notification-worker/get`
- `POST /notification-worker/start`
- `POST /notification-worker/stop`
- `POST /notification-worker/run`
- `POST /admin-audit/list`
- `POST /admin-audit/get`

If operator auth is configured on the AFAL HTTP server, all of these routes require:

- header: `x-afal-operator-token`

---

## Operational Model

The current delivery model is:

1. AFAL settles the action and creates final receipts
2. AFAL attempts receiver-side callback delivery
3. the result is written into the notification outbox
4. failed entries become eligible for redelivery
5. a worker cycle or a manual redelivery action can retry them
6. every operator-facing read or control action is written into the admin audit log

Important behavior:

- callback failure does not roll back settlement
- read-side reconciliation still exists through `POST /actions/get`
- notification recovery is about delivery completion, not action replay

---

## Delivery Status Meanings

`SettlementNotificationDeliveryRecord.status` currently means:

- `delivered`
  - AFAL received a `2xx` callback response
- `failed`
  - the last delivery attempt failed but can still be retried
- `skipped`
  - no callback target was configured for that receiver identity
- `dead-lettered`
  - bounded retry and redelivery limits were exhausted

Other important fields:

- `attempts`
  - total HTTP delivery attempts so far
- `redeliveryCount`
  - how many redelivery cycles have been consumed
- `nextAttemptAt`
  - next eligible retry time for worker-driven redelivery
- `deadLetteredAt`
  - when the outbox entry moved to dead-lettered
- `responseStatus`
  - most recent HTTP status from the receiver
- `errorMessage`
  - most recent transport or application error

---

## Worker Status Meanings

`SettlementNotificationOutboxWorkerStatus` currently exposes:

- `running`
  - whether background polling is active
- `intervalMs`
  - polling interval
- `lastRunAt`
  - last worker cycle timestamp
- `lastResult`
  - number of records picked up by the last cycle
- `lastError`
  - last worker-level error, if any

Interpretation:

- `running: false` does not mean delivery is broken
  - it only means redelivery is not being polled automatically
- `lastResult: 0` can still be healthy
  - there may simply have been nothing eligible to retry
- `lastError` indicates worker execution trouble, not necessarily a receiver callback failure

---

## Admin Audit Meanings

`AfalAdminAuditEntry.action` currently records:

- `getNotificationDelivery`
- `listNotificationDeliveries`
- `redeliverNotification`
- `getNotificationWorkerStatus`
- `startNotificationWorker`
- `stopNotificationWorker`
- `runNotificationWorker`

Fields:

- `auditId`
  - stable audit record id, currently derived from `requestRef`
- `requestRef`
  - operator request correlation id
- `targetRef`
  - notification id when the action targets one specific delivery
- `details`
  - action-specific metadata such as `status`, `attempts`, `redelivered`, or `running`

This is an operator activity log, not a business settlement ledger.

---

## Local Operator Demo

The fastest end-to-end operator verification is:

```bash
npm run demo:notification-admin
```

What it does:

- runs the payment callback path
- forces the first payee callback attempt to fail
- reads the failed delivery through operator routes
- runs a manual worker cycle
- confirms the callback is delivered
- reads the corresponding admin audit entry

Expected high-signal result:

- `failedStatusBeforeWorker` is `failed`
- `finalStatusAfterWorker` is `delivered`
- `redelivered` is `1`

---

## Manual HTTP Runbook

### 1. List Delivery Records

```bash
curl -X POST http://127.0.0.1:3213/notification-deliveries/list \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/list-notification-deliveries.request.json
```

Use this first to find:

- failed entries
- dead-lettered entries
- exact `notificationId` values

---

### 2. Inspect One Delivery

```bash
curl -X POST http://127.0.0.1:3213/notification-deliveries/get \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/get-notification-delivery.request.json
```

Use this to confirm:

- current `status`
- `attempts`
- `redeliveryCount`
- `nextAttemptAt`
- `responseStatus`
- `errorMessage`

---

### 3. Inspect Worker State

```bash
curl -X POST http://127.0.0.1:3213/notification-worker/get \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/get-notification-worker-status.request.json
```

Use this to determine:

- whether background retry is running
- whether the worker is seeing eligible entries

---

### 4. Trigger One Worker Cycle

```bash
curl -X POST http://127.0.0.1:3213/notification-worker/run \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/run-notification-worker.request.json
```

Use this when:

- you want deterministic one-shot retry behavior
- you do not want to wait for the background poll interval

After running it, re-check the delivery record.

---

### 5. Manually Redeliver One Entry

```bash
curl -X POST http://127.0.0.1:3213/notification-deliveries/redeliver \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/redeliver-notification.request.json
```

Use this when:

- you want to target one specific failed entry
- you already know the `notificationId`

This acts on one notification, not the whole queue.

---

### 6. Read The Audit Trail

```bash
curl -X POST http://127.0.0.1:3213/admin-audit/list \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/list-admin-audit-entries.request.json
```

And then:

```bash
curl -X POST http://127.0.0.1:3213/admin-audit/get \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/get-admin-audit-entry.request.json
```

Use these to answer:

- who ran the worker or redelivery action
- which requestRef correlated to that action
- what result metadata AFAL captured at the time

---

## Recommended Recovery Sequence

When a receiver callback is not arriving:

1. list delivery records
2. inspect the specific failed notification
3. inspect worker status
4. if `nextAttemptAt` is due, run one worker cycle
5. if you need targeted intervention, manually redeliver that notification
6. re-read the delivery record
7. re-read the admin audit log
8. if needed, use `POST /actions/get` to confirm business state is already settled

This sequence keeps operational recovery separate from business-action replay.

---

## Troubleshooting

### Delivery Is `failed`

Likely causes:

- receiver returned non-`2xx`
- receiver process was down
- callback URL was reachable but unhealthy

Operator actions:

- inspect `responseStatus`
- inspect `errorMessage`
- compare `lastAttemptAt` and `nextAttemptAt`
- run one worker cycle or manual redelivery

### Delivery Is `dead-lettered`

Meaning:

- AFAL exhausted the configured redelivery ceiling

Operator actions:

- fix the receiver-side issue first
- then use manual redelivery if appropriate
- keep in mind the action is already settled; this is delivery repair only

### Delivery Is `skipped`

Meaning:

- no callback target was configured for that receiver identity

Operator actions:

- check runtime callback mapping configuration
- do not expect worker retries to fix missing target mapping

### Worker Shows `running: false`

Meaning:

- automatic polling is disabled or has been stopped

Operator actions:

- start the worker
- or run one manual cycle

### Receiver Claims Duplicate Delivery

Meaning:

- the receiver already saw the same `idempotencyKey`

Operator actions:

- treat this as expected duplicate-safe behavior
- use `x-afal-idempotency-key` as the receiver-side dedupe key

---

## Phase Boundaries

This handbook deliberately does not yet cover:

- multi-tenant operator roles
- signed operator requests
- external identity for operators
- persistent operator dashboard
- production alerting or dead-letter escalation workflows

Those belong to the next control-plane stage, not the current integration-ready runtime stage.
