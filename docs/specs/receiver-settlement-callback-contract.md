# Receiver Settlement Callback Contract

## Purpose

This document defines the current Phase 1 callback contract that AFAL uses to actively notify:

- a payment payee-side receiver
- a resource provider-side receiver

after an approved action has been resumed into settlement.

This is the receiver-side companion to:

- [docs/specs/trusted-surface-callback-contract.md](docs/specs/trusted-surface-callback-contract.md#L1)
- [docs/product/notification-operator-handbook.md](docs/product/notification-operator-handbook.md#L1)

That trusted-surface contract covers:

- approval session read
- approval result callback into AFAL
- action resume

This document covers what happens after that:

- AFAL pushes a settlement-complete notification outward to the receiver side

---

## Current Stage

This contract reflects the current repository stage:

- Phase 1 integration-ready runtime
- bilateral multi-flow runtime-agent harness
- active payee/provider-side callback delivery in the SQLite-backed HTTP integration slice

It is intentionally minimal.

---

## Scope

This contract currently covers two notification types:

1. `payment.settled`
2. `resource.settled`

It defines:

- the callback payload shapes
- the callback transport headers
- the expected HTTP receiver behavior
- the current delivery semantics
- what is stable now versus what remains deferred

It does not yet define:

- signed webhook envelopes
- callback registration APIs
- production authentication headers

---

## Integration Pattern

Current end-to-end pattern:

```text
request pending approval
  -> trusted surface reads approval session
  -> trusted surface applies approval result
  -> AFAL resumes action
  -> AFAL settles action and creates receipts
  -> AFAL POSTs settlement callback to receiver-side endpoint
  -> receiver-side agent accepts the callback and records the final result
```

The callback is receiver-facing.

It is separate from the trusted-surface callback into AFAL.

---

## Delivery Model

Current behavior is:

- AFAL attempts bounded in-process delivery for each callback invocation
- AFAL includes stable idempotency metadata on every delivery attempt
- AFAL can retry the same callback with the same idempotency key
- the HTTP dispatcher can persist callback deliveries into a notification outbox
- failed notification entries are scheduled for redelivery with exponential backoff metadata
- repeated failures eventually move an outbox entry to `dead-lettered`
- failed and dead-lettered entries keep the same `notificationId`
- the SQLite-backed HTTP integration slice can run a background outbox worker that automatically retries failed deliveries
- the callback is sent after settlement and receipt creation complete
- delivery is keyed by receiver identity mapping configured at runtime
- callback delivery failure does not roll back settlement
- AFAL still exposes `POST /actions/get` as the read-side reconciliation path
- AFAL exposes notification outbox admin routes for operator-driven inspection and redelivery:
  - `POST /notification-deliveries/list`
  - `POST /notification-deliveries/get`
  - `POST /notification-deliveries/redeliver`

This means receiver-side integrations should currently treat the callback as:

- the fast path for active delivery
- with `POST /actions/get` as the fallback read path

---

## Callback Transport Headers

Current callback deliveries include these headers:

- `content-type: application/json`
- `x-afal-notification-id`
- `x-afal-idempotency-key`
- `x-afal-delivery-attempt`
- `x-afal-event-type`

Current header semantics:

- `x-afal-notification-id`
  - stable notification identifier
- `x-afal-idempotency-key`
  - currently equal to `notificationId`
  - remains stable across retries for the same callback
- `x-afal-delivery-attempt`
  - starts at `1`
  - increments on each retry
- `x-afal-event-type`
  - matches the payload `eventType`

Receiver-side integrations should use `x-afal-idempotency-key` as the primary duplicate-suppression key.

---

## Receiver HTTP Expectations

The receiver endpoint is expected to:

- accept `POST`
- accept `application/json`
- return any `2xx` status on success

The minimal test harness receiver currently returns:

```json
{
  "ok": true
}
```

with HTTP `202`.

Any non-`2xx` response is treated as callback delivery failure by the current HTTP dispatcher.

The current integration slice also supports duplicate-safe receiver handling:

- the receiver may return `2xx` for a duplicate delivery with the same idempotency key
- AFAL treats that as successful completion of delivery

---

## Retry Semantics

Current retry behavior is intentionally minimal:

- retries are bounded
- retries keep the same `notificationId` and `idempotencyKey`
- retries increase `x-afal-delivery-attempt`
- failed entries record `redeliveryCount`
- failed entries record `nextAttemptAt` when another worker cycle should try again
- entries that exhaust the configured redelivery ceiling move to `dead-lettered`
- callback failure does not roll back settlement state
- failed deliveries can be retained in a persistent outbox store and retried later
- the current SQLite-backed runtime can poll failed outbox entries and redeliver them in the background

The runtime-agent receiver harness can already simulate this pattern by rejecting early attempts and then accepting a later retry.

---

## Payment Callback

### Event Type

- `payment.settled`

### Semantics

This event means:

- the payment action has reached final settled state
- the final payment receipt already exists
- the payee-side receiver can treat `settlementRef` and `receiptRef` as stable identifiers

### Payload

```json
{
  "notificationId": "notif-payint-0001",
  "eventType": "payment.settled",
  "requestRef": "req-0001",
  "actionRef": "payint-0001",
  "approvalSessionRef": "aps-chall-0001",
  "payeeDid": "did:afal:agent:fraud-service-01",
  "intentStatus": "settled",
  "settlementRef": "stl-0001",
  "receiptRef": "rcpt-pay-0001",
  "asset": "USDC",
  "amount": "45.00",
  "chain": "base",
  "settledAt": "2026-03-24T12:08:10Z"
}
```

Canonical example:

- [docs/examples/callback/payment-settled.notification.sample.json](docs/examples/callback/payment-settled.notification.sample.json#L1)

---

## Resource Callback

### Event Type

- `resource.settled`

### Semantics

This event means:

- provider usage has been confirmed
- the provider settlement has completed
- the final resource receipt already exists

### Payload

```json
{
  "notificationId": "notif-resint-0001",
  "eventType": "resource.settled",
  "requestRef": "req-1001",
  "actionRef": "resint-0001",
  "approvalSessionRef": "aps-chall-1001",
  "providerId": "provider-openai",
  "providerDid": "did:afal:institution:provider-openai",
  "intentStatus": "settled",
  "usageReceiptRef": "usage-1001",
  "settlementRef": "stl-1001",
  "receiptRef": "rcpt-res-1001",
  "asset": "USDC",
  "amount": "18.50",
  "resourceClass": "inference",
  "resourceUnit": "tokens",
  "quantity": 500000,
  "settledAt": "2026-03-24T12:23:10Z"
}
```

Canonical example:

- [docs/examples/callback/resource-settled.notification.sample.json](docs/examples/callback/resource-settled.notification.sample.json#L1)

---

## Stable Fields

Receiver-side consumers can currently treat these fields as stable:

- `notificationId`
- `eventType`
- `requestRef`
- `actionRef`
- `approvalSessionRef`
- receiver identity field:
  - `payeeDid`
  - `providerId`
  - `providerDid`
- `intentStatus`
- `settlementRef`
- `receiptRef`
- `usageReceiptRef` for resource notifications
- value fields such as `amount`, `asset`, `quantity`
- `settledAt`

---

## Receiver Responsibilities

The receiver-side integration is responsible for:

- exposing an HTTP endpoint AFAL can call
- accepting the callback payload
- recording the notification against local receiver-side state
- using `actionRef`, `settlementRef`, and `receiptRef` as stable reconciliation keys

The receiver-side integration does not currently:

- need to call back into AFAL to acknowledge success
- need to mutate AFAL state
- need to confirm settlement execution itself

---

## Reconciliation Path

If the receiver misses a callback or wants to re-check final state, the current fallback path is:

- `POST /actions/get`

That means the current delivery contract is:

- push first
- read-side reconciliation second

---

## Current Runtime-Agent Coverage

The current bilateral harnesses exercise this contract through active receiver-side callbacks:

- `npm run demo:agent-payment-bilateral`
- `npm run demo:agent-resource-bilateral`

Related implementation and harness docs:

- [agents/test-harness/README.md](agents/test-harness/README.md#L1)
- [docs/examples/callback/README.md](docs/examples/callback/README.md#L1)

---

## Deferred Production Features

The following are intentionally deferred to a later callback revision:

- callback registration lifecycle
- signed callback headers
- replay protection stronger than the current idempotency key
- multi-endpoint fanout
- callback acknowledgement schemas richer than a simple `2xx`
- operator authz boundaries for outbox and worker control
- dead-letter replay policy beyond the current manual/admin redelivery flow

Those are the natural next step after the current Phase 1 active receiver callback slice.
