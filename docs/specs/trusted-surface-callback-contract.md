# Trusted-Surface Callback Contract

## Purpose

This document defines the **current Phase 1 trusted-surface integration contract** for AFAL.

It is intentionally narrower than the general trusted-surface README.

This document answers:

- how AFAL exposes approval sessions to a trusted surface
- how a trusted surface submits approval results back to AFAL
- how AFAL resumes authorization and then resumes the underlying action
- how receiver-side agents can independently confirm final action state after settlement
- what is stable now versus what is deferred to a later production-grade callback layer

Receiver-facing settlement delivery is documented separately in:

- [docs/specs/receiver-settlement-callback-contract.md](docs/specs/receiver-settlement-callback-contract.md#L1)

This contract is aligned to the currently implemented AFAL HTTP routes and durable runtime behavior.

---

## Scope

This contract covers the Phase 1 approval lifecycle for actions that require human review:

- payment approval
- resource approval

It covers five integration operations:

1. request a top-level pending approval action
2. read the persisted approval session
3. apply the trusted-surface approval result
4. resume the action after approval
5. read final action status for receiver/provider-side confirmation

It does not define the outbound receiver settlement callback payloads in detail; those live in the receiver settlement callback contract.

It does **not** currently cover:

- production-grade callback authentication
- signed webhook envelopes
- delivery retries from external callback infrastructure
- multi-step or multi-approver workflows
- end-user UI behavior

---

## Contract Model

The trusted-surface contract is built around `ApprovalSession`.

Relevant objects:

- `ApprovalSession`
- `ChallengeRecord`
- `ApprovalContext`
- `ApprovalResult`
- final `AuthorizationDecision`

The approval session is the durable handoff object between AFAL and an external trusted surface.

Current session lifecycle:

```text
pending
  -> approved
  -> finalized
```

Alternative non-success states:

- `rejected`
- `expired`
- `cancelled`

---

## Phase 1 Integration Pattern

The current stable Phase 1 integration pattern is:

```text
AFAL request-payment-approval / request-resource-approval
  -> AFAL returns pending approval output with approvalSessionRef
  -> trusted surface reads approval session
  -> trusted surface collects human decision
  -> trusted surface applies approval result
  -> AFAL resumes authorization if needed
  -> AFAL resumes the approved action into settlement and receipt creation
```

This is not yet modeled as a separate signed webhook transport.

Instead, the stable contract today is an AFAL-hosted HTTP boundary with approval-session routes.

That means a trusted-surface integration should currently treat AFAL as the callback target and call these routes directly.

---

## Stable HTTP Routes

Current Phase 1 routes:

- `POST /capabilities/request-payment-approval`
- `POST /capabilities/request-resource-approval`
- `POST /actions/get`
- `POST /approval-sessions/get`
- `POST /approval-sessions/apply-result`
- `POST /approval-sessions/resume`
- `POST /approval-sessions/resume-action`

Recommended payment approval sequence:

1. `POST /capabilities/request-payment-approval`
2. `POST /approval-sessions/get`
3. `POST /approval-sessions/apply-result`
4. `POST /approval-sessions/resume-action`
5. `POST /actions/get`

Recommended resource approval sequence:

1. `POST /capabilities/request-resource-approval`
2. `POST /approval-sessions/get`
3. `POST /approval-sessions/apply-result`
4. `POST /approval-sessions/resume-action`
5. `POST /actions/get`

`POST /approval-sessions/resume` is also available when the caller wants the final AMN authorization state without resuming the full AFAL settlement flow.

---

## Responsibility Split

### AFAL Responsibilities

AFAL is responsible for:

- creating approval sessions
- persisting challenge, context, and approval result state
- validating approval session existence
- updating AMN challenge/session state
- resuming approved actions into settlement
- generating receipts and final capability responses

### Trusted-Surface Responsibilities

The trusted surface is responsible for:

- reading the pending approval session
- displaying the approval context to a human
- collecting the human decision
- mapping that decision into AFAL `ApprovalResult`
- submitting the approval result back to AFAL

The trusted surface does **not** directly:

- execute settlement
- mutate ATS balances
- generate AFAL receipts
- finalize the underlying action itself

---

## Canonical Payment Approval Flow

```text
POST /capabilities/request-payment-approval
  -> returns pending approval payload
  -> includes approvalSessionRef

POST /approval-sessions/get
  -> returns ApprovalSession + related state

trusted-surface review
  -> human approves / rejects / cancels

POST /approval-sessions/apply-result
  -> persists ApprovalResult against session

POST /approval-sessions/resume-action
  -> resumes approved action into settlement and receipt generation

POST /actions/get
  -> lets the payee-side agent independently confirm final settlement and receipt state
```

---

## Request And Response Shapes

### 1. Request Pending Approval

Path:

- `POST /capabilities/request-payment-approval`
- `POST /capabilities/request-resource-approval`

Purpose:

- create a pending approval execution and return `approvalSessionRef`

The output is a top-level AFAL success envelope whose `data` contains:

- the pending intent
- initial decision
- challenge
- approval context
- approval session
- pending capability response

Current canonical example:

- [request-payment-approval.request.json](docs/examples/http/request-payment-approval.request.json#L1)
- [request-payment-approval.response.sample.json](docs/examples/http/request-payment-approval.response.sample.json#L1)

### 2. Read Approval Session

Path:

- `POST /approval-sessions/get`

Body:

```json
{
  "requestRef": "req-approval-session-001",
  "input": {
    "approvalSessionRef": "aps-chall-0001"
  }
}
```

Purpose:

- retrieve the durable session that the trusted surface needs to review

The success payload resolves the persisted `ApprovalSession`.

In practice, a trusted surface will usually also need:

- `ChallengeRecord`
- `ApprovalContext`

Those are already discoverable from the original pending approval response and linked refs inside the session.

### 3. Apply Approval Result

Path:

- `POST /approval-sessions/apply-result`

Body shape:

```json
{
  "requestRef": "req-apply-approval-001",
  "input": {
    "approvalSessionRef": "aps-chall-0001",
    "result": {
      "approvalResultId": "apr-0001",
      "challengeRef": "chall-0001",
      "actionRef": "payint-0001",
      "result": "approved",
      "approvedBy": "did:afal:owner:alice-01",
      "approvalChannel": "trusted-surface:web",
      "stepUpAuthUsed": true,
      "comment": "First-time fraud provider is acceptable",
      "approvalReceiptRef": "rcpt-approval-0001",
      "decidedAt": "2026-03-24T12:07:00Z"
    }
  }
}
```

Allowed `result.result` values:

- `approved`
- `rejected`
- `expired`
- `cancelled`

Purpose:

- persist the trusted-surface decision against the approval session

This operation does **not** itself settle the payment or resource action.

### 4. Resume Authorization Only

Path:

- `POST /approval-sessions/resume`

Purpose:

- resume the AMN authorization state and produce the post-approval final decision

Use this when the caller needs final authorization status but does not want to resume the full AFAL action yet.

### 5. Resume Approved Action

Path:

- `POST /approval-sessions/resume-action`

Body:

```json
{
  "requestRef": "req-resume-action-0001",
  "input": {
    "approvalSessionRef": "aps-chall-0001"
  }
}
```

Purpose:

- resume the approved AFAL action into:
  - final decision
  - settlement
  - receipt generation
  - final capability response

Canonical examples:

- [resume-approved-action.request.json](docs/examples/http/resume-approved-action.request.json#L1)
- [resume-approved-action.response.sample.json](docs/examples/http/resume-approved-action.response.sample.json#L1)
- [resume-approved-action.authorization-expired.response.sample.json](docs/examples/http/resume-approved-action.authorization-expired.response.sample.json#L1)
- [resume-approved-action.authorization-rejected.response.sample.json](docs/examples/http/resume-approved-action.authorization-rejected.response.sample.json#L1)

### 6. Read Final Action Status

Path:

- `POST /actions/get`

Body:

```json
{
  "requestRef": "req-action-status-payment-001",
  "input": {
    "actionRef": "payint-0001"
  }
}
```

Purpose:

- let a payee-side or provider-side agent independently confirm final action state after settlement
- avoid coupling receiver-side confirmation flows to shared in-process state
- provide a stable read-side AFAL contract for bilateral runtime-agent harnesses

Canonical examples:

- [get-action-status.payment.request.json](docs/examples/http/get-action-status.payment.request.json#L1)
- [get-action-status.payment.response.sample.json](docs/examples/http/get-action-status.payment.response.sample.json#L1)
- [get-action-status.resource.request.json](docs/examples/http/get-action-status.resource.request.json#L1)
- [get-action-status.resource.response.sample.json](docs/examples/http/get-action-status.resource.response.sample.json#L1)

---

## Approval Result Semantics

The trusted surface must map the human action into AFAL `ApprovalResult`.

### Approved

Use when:

- the human explicitly approves the action

Expected AFAL outcome:

- session becomes approved
- authorization can be finalized
- action can resume into settlement

### Rejected

Use when:

- the human explicitly denies the action

Expected AFAL outcome:

- session becomes rejected
- final authorization is rejected
- action must not settle

### Expired

Use when:

- the approval window elapsed before human confirmation

Expected AFAL outcome:

- session becomes expired
- final authorization is expired
- action must not settle

### Cancelled

Use when:

- the approval was intentionally cancelled by operator or system flow

Expected AFAL outcome:

- session becomes cancelled
- action must not settle

---

## Idempotency And Replay Rules

Phase 1 current rule:

- `approvalSessionRef` is the durable target object

The trusted surface should treat approval submission as **effectively idempotent by session**, meaning:

- do not intentionally submit multiple conflicting approval results for the same session
- if a retry is required, resend the same semantic result for the same session

Current AFAL guarantees:

- the session is persisted durably
- replayed or invalid state transitions are surfaced as AFAL failures rather than silently settling twice

What AFAL does **not yet** provide as a formal stable contract:

- a dedicated `idempotencyKey` field
- signed callback replay protection
- transport-layer nonce validation

Those are expected in a later production callback contract revision.

---

## Error Semantics

Current approval-session routes use the standard AFAL error envelope.

Important error classes:

- `400 bad-request`
  - malformed body
  - missing `approvalSessionRef`
  - missing `result`
- `404 not-found`
  - unknown `approvalSessionRef`
- `409 authorization-expired`
  - action can no longer resume because approval or authorization expired
- `409 authorization-rejected`
  - session exists but the final authorization is rejected
- `409 authorization-cancelled`
  - session exists but was cancelled
- `500 internal-error`
  - unexpected runtime failure

Current error examples:

- [execute-payment.bad-request.response.sample.json](docs/examples/http/execute-payment.bad-request.response.sample.json#L1)
- [resume-approved-action.authorization-expired.response.sample.json](docs/examples/http/resume-approved-action.authorization-expired.response.sample.json#L1)
- [resume-approved-action.authorization-rejected.response.sample.json](docs/examples/http/resume-approved-action.authorization-rejected.response.sample.json#L1)

---

## Current Stability Boundary

### Stable Now

The following are stable enough to implement against in Phase 1:

- approval session routes
- read-side action status route
- `approvalSessionRef`-based callback flow
- `ApprovalResult` object shape
- `resume-action` semantics
- AFAL success/error envelopes

### Not Stable Yet

The following should be considered planned extensions, not current guarantees:

- webhook signature scheme
- callback auth headers
- external delivery retry contract
- dedicated idempotency token field
- multi-actor approval semantics
- cross-tenant approval routing

Integrators should therefore build Phase 1 trusted-surface integrations against the current AFAL HTTP routes, not against an assumed future webhook protocol.

---

## Recommended Integration Pattern

For current AFAL Phase 1 integration, the recommended trusted-surface pattern is:

1. AFAL caller requests payment/resource approval
2. AFAL returns `approvalSessionRef`
3. trusted surface stores that session ref
4. trusted surface reads the session and renders approval context
5. human decides
6. trusted surface calls `POST /approval-sessions/apply-result`
7. trusted surface or orchestration layer calls `POST /approval-sessions/resume-action`
8. AFAL returns final settlement/receipt response
9. payee/provider-side agent calls `POST /actions/get` to confirm final state independently

This pattern is the bridge from the current durable async execution skeleton to the next integration-ready runtime stage.

---

## Next Recommended Additions

The next concrete artifacts that should follow this document are:

- canonical `get-approval-session` request/response examples
- canonical `apply-approval-result` request/response examples
- trusted-surface callback acceptance tests
- a minimal trusted-surface stub process
- an auth/idempotency extension proposal for Phase 1.1 or Phase 2

These first four items are now in place.
