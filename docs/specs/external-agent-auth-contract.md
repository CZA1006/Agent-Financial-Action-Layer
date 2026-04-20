# External Agent Auth Contract

## Purpose

This document defines the first sandbox-facing auth boundary for external agent systems calling into AFAL.

It is narrower than the external settlement service auth contract.

This document covers:

- how an external agent client is identified
- which headers are required on public AFAL requests
- the current signature placeholder
- the current replay protection rule
- current subject scoping behavior

It does not yet cover:

- production IAM
- tenant self-service onboarding
- certificate-based trust
- asymmetric signatures
- per-client callback registration APIs

---

## Current Stage

This contract reflects AFAL's current repository stage:

- late Phase 1 externally integrated runtime
- shared SQLite integration database
- real external-service stubs
- first sandbox-facing external agent client registry

It is intended for sandbox use, not production use.

---

## External Agent Client Model

Each sandbox integration is currently represented as an external client record with:

- `clientId`
- `tenantId`
- `agentId`
- `subjectDid`
- `mandateRefs`
- optional budget/quota references
- optional receiver callback registration
- signing key

The current model assumes:

- one client record maps to one sandbox-facing agent integration identity
- one client acts for one primary `subjectDid`
- request subject scoping is enforced against that registered `subjectDid`

---

## Current Public Headers

Sandbox-facing AFAL public routes currently require:

- `x-afal-client-id`
- `x-afal-request-timestamp`
- `x-afal-request-signature`

These headers are currently enforced on:

- `POST /capabilities/request-payment-approval`
- `POST /capabilities/execute-payment`
- `POST /capabilities/request-resource-approval`
- `POST /capabilities/settle-resource-usage`
- `POST /actions/get`

Trusted-surface and operator routes are separate concerns and are not currently protected by this external client contract.

---

## Signature Placeholder

The current sandbox signature formula is:

```text
sha256(`${clientId}:${requestRef}:${timestamp}:${signingKey}`)
```

This is intentionally a placeholder.

It is enough to create a real client-facing request boundary, but it is not production-grade cryptographic trust.

---

## Replay Protection

The current replay key is:

```text
requestRef + timestamp
```

AFAL stores the first seen tuple for a given `clientId`.

If the same `(clientId, requestRef, timestamp)` combination is submitted again, AFAL rejects it as replay.

---

## Subject Scope

For payment and resource action requests, AFAL currently derives the acting subject from the request body:

- payment: `input.intent.payer.agentDid`
- resource: `input.intent.requester.agentDid`

That subject must match the registered `subjectDid` of the authenticated client.

If it does not match, AFAL rejects the request as a subject scope violation.

---

## Current Failure Codes

Current sandbox-facing auth failures:

- `client-auth-required`
- `subject-scope-violation`
- `request-replay-detected`

Current intended behavior:

- missing or invalid auth metadata -> reject
- wrong subject scope -> reject
- replayed request tuple -> reject

---

## Provisioning

Current sandbox provisioning is script-driven.

The current bootstrap path is:

- `scripts/provision-external-agent-sandbox.ts`

That script registers a sandbox client into the shared SQLite integration database and emits a client bundle containing:

- endpoint reference
- client identifiers
- mandate and budget references
- callback registration values if present
- signing key and required header names

---

## Deferred

The following items are intentionally deferred:

- callback registration lifecycle APIs
- key rotation protocol
- client disable/revoke lifecycle APIs
- signed callback envelopes
- nonces independent of `requestRef`
- production-grade secrets handling
