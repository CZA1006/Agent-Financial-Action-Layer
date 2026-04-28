# Notification Operator Playbook

## Purpose

This playbook is the incident and recovery companion to:

- [docs/product/notification-operator-handbook.md](docs/product/notification-operator-handbook.md#L1)

The handbook explains the surface.

This playbook explains what an operator should actually do when:

- receiver callbacks are failing
- the worker is not recovering them
- entries move toward `dead-lettered`
- another operator needs a clean handoff

This is still a Phase 1 integration-mode playbook.

It assumes:

- operator token access exists
- AFAL HTTP routes are reachable
- the business action is already settled

---

## When To Use This

Use this playbook when any of the following is true:

- a receiver-side integration reports missing settlement callbacks
- a notification delivery record is `failed`
- a delivery record is `dead-lettered`
- the worker shows unhealthy or confusing status
- manual redelivery is needed
- an operator is handing the issue to another operator

Do not use this playbook to debug:

- approval-session issues before settlement
- AMN authorization policy behavior
- ATS budget state before settlement

This playbook starts after AFAL has already reached settled action state.

---

## High-Level Rule

Treat notification recovery as:

- delivery repair

not:

- business-action replay

The action is already settled.

Your job is to restore or confirm receiver-side delivery, preserve auditability, and decide whether to escalate.

---

## Primary Signals

For every incident, gather these first:

1. `notificationId`
2. `status`
3. `attempts`
4. `redeliveryCount`
5. `nextAttemptAt`
6. `responseStatus`
7. `errorMessage`
8. worker `running`
9. worker `lastRunAt`
10. worker `lastResult`

Then capture:

11. latest related admin audit entries
12. final business state from `POST /actions/get`, if needed

---

## Fast Triage Checklist

Run this sequence in order:

1. `POST /notification-deliveries/list`
2. `POST /notification-deliveries/get`
3. `POST /notification-worker/get`
4. decide whether the problem is:
   - receiver failure
   - worker disabled
   - target mapping missing
   - retry ceiling exhausted

Decision hints:

- `status: failed`
  - usually means a retryable delivery problem
- `status: dead-lettered`
  - retry ceiling has been exhausted
- `status: skipped`
  - callback target mapping is missing
- `running: false`
  - background retry is not active
- `responseStatus: 503`
  - receiver is reachable but unhealthy
- no `responseStatus` plus transport error
  - network path or process availability problem is more likely

---

## Standard Recovery Flow For `failed`

Use this for entries that are still retryable.

1. Read the specific delivery record.
2. Confirm the receiver issue is likely temporary.
3. Check whether `nextAttemptAt` is already due.
4. Read worker status.
5. If you want deterministic control, call `POST /notification-worker/run`.
6. Re-read the delivery record.
7. If still failed, decide whether to:
   - wait for the next worker cycle
   - manually redeliver one entry
   - escalate the receiver-side issue
8. Read admin audit entries to confirm your control actions were recorded.

Success criteria:

- `status` moves to `delivered`
- `attempts` increments
- `responseStatus` becomes `2xx`

---

## Standard Recovery Flow For `dead-lettered`

Use this when redelivery has already exhausted its configured ceiling.

1. Read the delivery record.
2. Capture:
   - `notificationId`
   - `deadLetteredAt`
   - `attempts`
   - `redeliveryCount`
   - `responseStatus`
   - `errorMessage`
3. Confirm receiver-side issue has actually been fixed.
4. If fixed, perform a targeted manual redelivery.
5. Re-read the delivery record.
6. Read admin audit entries.
7. If manual redelivery still fails, escalate as a receiver-side incident.

Important:

- do not try to recreate the action
- do not treat dead-letter as settlement corruption
- this is still a delivery problem unless action reconciliation says otherwise

---

## Standard Recovery Flow For `skipped`

Use this when AFAL had no callback target.

1. Confirm the record is `skipped`.
2. Confirm `errorMessage` indicates missing callback target.
3. Check runtime callback mapping configuration.
4. Fix the mapping.
5. Use targeted redelivery if appropriate.
6. Re-read the delivery record.

Worker cycles will not fix missing target configuration by themselves.

---

## Worker-Side Playbook

### Worker Not Running

Use this sequence:

1. `POST /notification-worker/get`
2. `POST /notification-worker/start`
3. `POST /notification-worker/get`
4. confirm `running: true`

If you only want one controlled retry pass, prefer:

- `POST /notification-worker/run`

instead of starting continuous polling.

### Worker Running But Not Recovering Entries

Check:

- is `nextAttemptAt` still in the future?
- is the receiver still failing?
- is the entry already `dead-lettered`?
- is `lastResult` always `0`?

Interpretation:

- `lastResult: 0` with future `nextAttemptAt`
  - not yet eligible
- `lastResult > 0` but record remains `failed`
  - worker is attempting recovery, receiver is still unhealthy
- `dead-lettered`
  - worker has no more retries to consume

---

## Manual Redelivery Playbook

Use manual redelivery when:

- one specific entry needs targeted recovery
- the worker is stopped by design
- you do not want to wait for polling
- the receiver fix is already known to be complete

Sequence:

1. read delivery record
2. perform `POST /notification-deliveries/redeliver`
3. re-read delivery record
4. confirm `attempts` increased
5. confirm `status` changed appropriately
6. read admin audit entry

Do not spam repeated manual redeliveries without first checking:

- receiver health
- status transition
- audit trail

---

## Reconciliation Check

If receiver-side confusion remains, use `POST /actions/get`.

Use this only to answer:

- did AFAL actually settle the action?
- what is the authoritative `settlementRef`?
- what is the authoritative `receiptRef`?

Use it to confirm business state, not to replace callback repair steps.

---

## Incident Handoff Template

When handing off to another operator, include:

- action type: payment or resource
- `notificationId`
- `actionRef`
- current delivery `status`
- `attempts`
- `redeliveryCount`
- `nextAttemptAt`
- `responseStatus`
- `errorMessage`
- worker `running`
- worker `lastRunAt`
- worker `lastResult`
- last operator action taken
- related admin `auditId`
- whether `POST /actions/get` confirmed settled state

Minimum handoff sentence:

`notif-payint-0001` is `failed`, worker is stopped, last receiver status was `503`, manual redelivery not yet attempted, action state already reconciled as settled.

---

## Escalation Guidance

Escalate to receiver-side owners when:

- repeated `503` or `5xx` responses continue after recovery attempts
- transport path is reachable but application stays unhealthy
- the callback endpoint behavior is inconsistent across retries

Escalate to AFAL runtime owners when:

- worker status is inconsistent with actual retry behavior
- admin audit is missing control actions
- outbox records are malformed or not updating
- `POST /actions/get` disagrees with callback-related state in a suspicious way

Escalate immediately when:

- multiple unrelated notifications dead-letter in a short window
- worker control routes behave unexpectedly
- operator auth behavior is inconsistent

---

## What Good Looks Like

A clean recovery should leave behind:

- one or more delivery records showing the status transition
- a clear worker or redelivery action in admin audit
- a settled business action that did not need replay
- a receiver-side confirmation or at least a successful `2xx` callback receipt

That is the Phase 1 standard of operational correctness.
