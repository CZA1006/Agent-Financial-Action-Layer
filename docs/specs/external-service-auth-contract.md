# External Service Auth Contract

## Purpose

This document defines the current Phase 1 auth and request-metadata contract between AFAL and the independent external settlement stubs:

- payment rail service
- provider usage / settlement service

This is the external-service companion to:

- [docs/specs/trusted-surface-callback-contract.md](docs/specs/trusted-surface-callback-contract.md#L1)
- [docs/specs/receiver-settlement-callback-contract.md](docs/specs/receiver-settlement-callback-contract.md#L1)

Those documents cover:

- trusted-surface review into AFAL
- receiver-side callback delivery out of AFAL

This document covers the service-to-service boundary that AFAL uses when it calls outward to:

- a payment execution dependency
- a provider usage / settlement dependency

---

## Current Stage

This contract reflects the current repository stage:

- late Phase 1 externally integrated runtime
- shared SQLite integration database
- independent trusted-surface review service
- network-shaped payment rail and provider service stubs
- bounded retry and failure classification on the external adapter path

It is intentionally minimal and still local-development oriented.

---

## Scope

This contract currently applies to three externally invoked operations:

1. `POST /payments/execute`
2. `POST /resource-usage/confirm`
3. `POST /resource-settlements/settle`

It defines:

- the current auth headers
- the signed request metadata placeholder
- the current signature formula
- which failures are retryable vs terminal

It does not yet define:

- asymmetric signatures
- nonce tracking
- timestamp freshness windows
- service registration
- certificate-based trust
- production secret rotation

---

## Integration Pattern

Current end-to-end pattern:

```text
AFAL runtime
  -> HTTP adapter
  -> external payment rail / provider service
  -> canonical settlement or usage response
  -> AFAL records settlement / usage in its own store
```

This means the external dependency is responsible for:

- executing payment rail behavior
- confirming provider usage
- returning settlement-shaped output

AFAL remains responsible for:

- intent state
- authorization and approval state
- ATS state transitions
- AFAL-owned settlement persistence
- receipts and callbacks

---

## Current Auth Model

The current auth model is a minimal service-to-service placeholder.

AFAL sends:

- a shared service token
- a service identifier
- a request timestamp
- a deterministic signature placeholder

Current required headers:

- `x-afal-service-token`
- `x-afal-service-id`
- `x-afal-request-timestamp`
- `x-afal-request-signature`

Current service behavior:

- missing metadata returns `403`
- wrong token returns `403`
- invalid signature returns `403`

Current error codes used by the external stubs:

- `service-auth-required`
- `service-signature-invalid`

These are external-service errors, not AFAL HTTP API errors.

---

## Signature Placeholder

The current signature is intentionally simple and deterministic.

Current input:

```text
serviceId : requestRef : timestamp : signingKey
```

Current signature formula:

```text
sha256(`${serviceId}:${requestRef}:${timestamp}:${signingKey}`)
```

This is a placeholder for a stronger future service auth model.

It should currently be treated as:

- enough to prove an explicit service-auth boundary exists
- not enough for production trust

---

## Header Semantics

### `x-afal-service-token`

- shared secret token for the target external service
- used as the first auth gate

### `x-afal-service-id`

- logical caller identifier
- currently a stable AFAL runtime identifier such as `afal-runtime`

### `x-afal-request-timestamp`

- ISO timestamp generated per outbound request
- currently included in signature construction

### `x-afal-request-signature`

- deterministic sha256 placeholder signature
- derived from:
  - service id
  - request ref
  - request timestamp
  - signing key

---

## Current External Routes

### Payment Rail

- `GET /health`
- `POST /payments/execute`

### Provider Service

- `GET /health`
- `POST /resource-usage/confirm`
- `POST /resource-settlements/settle`

The health routes are intentionally unauthenticated.

The mutating POST routes are where the current auth contract applies.

---

## Retry And Failure Classification

Current adapter behavior is:

- `502`, `503`, and `504` are treated as retryable
- `409` and `422` are treated as terminal rejection
- `403` auth/signature failures are terminal

Current AFAL-side mapping:

- retryable external dependency failures map to:
  - AFAL error code `external-adapter-unavailable`
  - HTTP `503`
- terminal external business rejection maps to:
  - AFAL error code `external-adapter-rejected`
  - HTTP `409`

This means auth failures on the external stub path are currently expected to fail fast and not be retried.

---

## Canonical Metadata Samples

Current canonical examples:

- [docs/examples/external/payment-rail.execute-payment.request.sample.json](docs/examples/external/payment-rail.execute-payment.request.sample.json#L1)
- [docs/examples/external/provider-service.confirm-usage.request.sample.json](docs/examples/external/provider-service.confirm-usage.request.sample.json#L1)

These examples show:

- the HTTP path
- the required headers
- the body shape AFAL currently sends

---

## Stable Now vs Deferred

Stable now:

- explicit external HTTP adapter boundary
- token + signed-metadata placeholder headers
- deterministic signature formula
- retryable vs terminal failure distinction
- shared examples for payment rail and provider usage calls

Deferred:

- key rotation
- clock-skew handling
- signature versioning
- asymmetric request signing
- per-service trust registry
- production mTLS or equivalent transport trust

---

## Current Recommendation

For the current repository stage, any new external settlement/provider integration should:

1. preserve these four auth headers
2. preserve the current retry classification boundary
3. preserve the distinction between AFAL-owned persistence and external execution
4. document any stronger auth model as an additive evolution of this contract rather than an implicit rewrite
