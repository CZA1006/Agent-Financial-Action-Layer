# SDK Boundary Draft

## Purpose

This document defines the first draft of AFAL's future consumer-facing SDK or package boundary.

It does **not** mean AFAL is ready to publish that package today.

Its purpose is to ensure that when external pilot feedback arrives, AFAL already has a disciplined view of:

- what should be wrapped by a client SDK
- what should stay as raw HTTP
- what should explicitly stay out of a first package

---

## Current Stage

AFAL is currently at:

- **Late Phase 1 externally validated sandbox with wallet-confirmed testnet payment demo**

It also has:

- internal real-agent sandbox acceptance
- a standalone external-agent pilot kit
- a repo-external skeleton export path for that pilot kit
- a repo-contained validation command for that exported skeleton
- public external-client auth
- public callback registration routes
- a successful Round 003 external engineer run from an extracted handoff archive
- a prompt-driven MetaMask agent payment demo over the same AFAL external-client boundary

The remaining proof points are:

- repeatability with another external engineer or partner
- a stable SDK surface that does not import monorepo harness internals
- production-grade payment rail verification for wallet-backed settlements

So this draft is now the bridge from validated pilot surface to first SDK implementation.
It should guide the first package boundary, not overreach into custody or wallet management.

---

## SDK Goal

The first AFAL consumer SDK should make it easy for an external agent developer to:

1. authenticate requests
2. register callback URLs
3. submit payment and resource approval requests
4. read action status
5. interpret common AFAL success and failure responses
6. poll or read settlement/receipt state from the payee side

It should remove repetitive integration work without hiding the AFAL contract completely.

---

## SDK v1 Should Include

### 1. Client Construction

The SDK should provide an `AfalClient` or equivalent constructor that accepts:

- `baseUrl`
- `clientId`
- `signingKey`
- optional timeout settings
- optional logger hooks

### 2. Request Signing

The SDK should encapsulate:

- `x-afal-client-id`
- `x-afal-request-timestamp`
- `x-afal-request-signature`

The caller should not have to manually build those headers for normal usage.

### 3. Callback Registration

The SDK should wrap:

- `POST /integrations/callbacks/register`
- `POST /integrations/callbacks/get`
- `POST /integrations/callbacks/list`

Suggested methods:

- `registerCallbacks(...)`
- `getCallbackRegistration()`
- `listCallbackRegistrations()`

### 4. Payment Request Entry

The SDK should wrap:

- `POST /capabilities/request-payment-approval`

Suggested method:

- `requestPaymentApproval(...)`

### 5. Resource Request Entry

The SDK should wrap:

- `POST /capabilities/request-resource-approval`

Suggested method:

- `requestResourceApproval(...)`

### 6. Action Status Read

The SDK should wrap:

- `POST /actions/get`

Suggested method:

- `getActionStatus(actionRef)`

### 7. Common Error Mapping

The SDK should normalize common AFAL error classes into a smaller set of consumer-facing categories:

- auth error
- scope error
- replay error
- validation error
- authorization rejected / expired / cancelled
- external adapter unavailable
- external adapter rejected
- internal error

This should reduce the amount of repetitive branch logic in every consuming app.

---

## SDK v1 Should Not Include

The first SDK should **not** include:

### 1. Trusted-Surface Implementation

The SDK should not embed:

- approval UI
- trusted-surface workflow logic
- approval operator logic

### 2. Operator/Admin Surface

The SDK should not expose by default:

- notification delivery admin
- worker control
- admin audit access

Those routes belong to operator tooling, not ordinary agent-consumer usage.

### 3. Internal Harness Logic

The SDK should not carry:

- OpenRouter pilot logic
- monorepo test harness behavior
- mock payment/provider orchestration logic

### 4. Wallet / Real Funds Logic

The SDK should not imply:

- custody
- wallet management
- signing real blockchain transactions
- direct stablecoin rail execution

### 5. Monorepo Fixtures

The SDK should not depend on:

- `sdk/fixtures`
- internal demo-only canonical payloads

It may provide helper builders later, but not monorepo demo coupling.

---

## Raw HTTP Should Still Remain Viable

Even after an SDK exists, raw HTTP should still be a first-class supported path for:

- advanced integrators
- debugging
- protocol review
- language-agnostic integrations

The SDK should therefore be:

- additive
- thin
- contract-aligned

not:

- a replacement for the HTTP contract

---

## Candidate Package Shapes

The likely package progression is:

### Package 1: TypeScript Client SDK

Examples:

- `@afal/client`
- `@afal/sdk`

Contents:

- `AfalClient`
- auth/signing helper
- callback registration wrapper
- payment/resource request wrapper
- action status wrapper
- typed response helpers

### Package 2: Callback Receiver Starter

Examples:

- `@afal/callback-receiver`
- `@afal/receiver-starter`

Contents:

- minimal receiver server
- delivery header parsing
- idempotency hooks
- artifact/logging hooks

### Package 3: Hosted Sandbox Onboarding

This is not an npm package first.
This is more likely:

- a hosted onboarding surface
- a managed sandbox signup
- a generated client bundle flow

---

## Conditions Before Publishing SDK v1

Do not publish a consumer SDK until all of the following are true:

1. one repo-external engineer pilot has succeeded
2. the main onboarding friction points have been fixed
3. callback registration flow is stable enough to document simply
4. request/response examples no longer require monorepo context
5. there is a clear owner for versioning and backwards-compatibility

---

## Questions To Revisit After External Pilot Feedback

After the first external engineer pilot, revisit:

- which env vars should be hidden by defaults
- whether callback registration should be one method or two
- whether payment/resource requests need builder helpers
- whether `pending-approval` state should have a stronger typed abstraction
- which AFAL errors should be mapped or preserved verbatim

---

## Current Recommendation

The recommendation today is:

- do **not** publish an SDK yet
- use this document as the decision boundary
- wait for external pilot findings
- then cut the smallest useful SDK/package surface possible

That is the path that keeps AFAL aligned with its role as AI infrastructure rather than publishing a package too early.
