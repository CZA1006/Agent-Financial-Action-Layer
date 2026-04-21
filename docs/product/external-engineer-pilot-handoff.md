# External Engineer Pilot Handoff

## Purpose

This document defines how a second engineer, outside the main AFAL implementation loop,
should validate the current sandbox integration surface.

The goal is not to test AFAL from inside the monorepo again.
The goal is to answer a stricter question:

- can an engineer who did not build the AFAL runtime consume it as an external integration surface

That is the current gap between:

- **internally validated external-agent sandbox**

and:

- **externally validated external-agent sandbox**

---

## Current Stage

AFAL has already reached:

- **Late Phase 1 externally integrated runtime, locally accepted**
- **repeatable real external-agent sandbox acceptance inside the main repo**
- **standalone external-agent pilot kit inside `samples/standalone-external-agent-pilot/`**

What is still missing is one controlled validation step:

- an engineer should use the standalone kit from a separate repo or separate workspace
- the engineer should rely only on public HTTP routes, onboarding docs, and the standalone sample code

---

## What The External Engineer Should Use

The external engineer should receive only these inputs:

1. one running AFAL sandbox instance
2. one provisioned sandbox client bundle
3. the standalone pilot kit:
   - `samples/standalone-external-agent-pilot/`
4. these docs:
   - `README.md`
   - `docs/product/external-agent-sandbox-onboarding.md`
   - `docs/product/external-agent-sandbox-acceptance-checklist.md`
   - `docs/specs/external-agent-auth-contract.md`
   - `docs/specs/receiver-settlement-callback-contract.md`

The engineer should **not** need:

- direct access to AFAL internal runtime modules
- `agents/test-harness/`
- internal OpenRouter pilot scripts
- internal test fixtures

If the engineer needs those, the external integration surface is still too implicit.

---

## Required Setup

### AFAL Team Provides

- AFAL base URL
- trusted-surface sandbox availability
- one client bundle containing:
  - `clientId`
  - `signingKey`
  - `subjectDid`
  - mandate refs
  - budget / quota refs
  - expected callback URLs or callback registration instructions

### External Engineer Provides

- a cloned standalone pilot repo or copied standalone pilot directory
- a local `.env`
- a local callback receiver process

---

## Validation Sequence

The external engineer should run the following sequence in order.

### 1. Standalone Client Setup

- copy `.env.example` to `.env`
- fill in:
  - `AFAL_BASE_URL`
  - `AFAL_CLIENT_ID`
  - `AFAL_SIGNING_KEY`
  - budget / quota refs
  - callback URLs

Success criteria:

- the standalone scripts run without importing AFAL internal modules

### 2. Callback Registration

The engineer should call:

- `POST /integrations/callbacks/register`
- `POST /integrations/callbacks/get`
- `POST /integrations/callbacks/list`

Success criteria:

- callback registration succeeds using only external-client signed headers
- readback matches the registered URLs

### 3. Payment Request

The engineer should submit:

- `POST /capabilities/request-payment-approval`

Success criteria:

- AFAL returns `pending-approval`
- request shape and auth rules are understandable from docs plus sample code

### 4. Resource Request

The engineer should submit:

- `POST /capabilities/request-resource-approval`

Success criteria:

- AFAL returns `pending-approval`
- provider-facing request shape is understandable from docs plus sample code

### 5. Callback Receiver Verification

The engineer should run the standalone callback receiver and confirm:

- `POST /callbacks/action-settled` is received
- AFAL delivery headers are present
- the receiver can acknowledge with `202`

Success criteria:

- the external engineer can observe settlement callback payloads without using AFAL internals

### 6. Friction Review

The engineer should explicitly record:

- unclear env vars
- confusing request fields
- missing examples
- signing/auth pain points
- callback registration friction
- error messages that are too vague

This feedback is the main output of the pilot.

---

## What Counts As Success

The pilot is successful if the external engineer can:

1. set up the standalone client from docs
2. authenticate to AFAL public routes
3. register callback URLs
4. submit payment and resource approval requests
5. receive callback payloads
6. report friction without needing internal implementation help

The pilot is **not** considered successful if the engineer only succeeds after:

- reading internal AFAL service code
- importing internal fixtures
- using `agents/test-harness/`
- asking for hidden assumptions that are not in docs or provisioning output

---

## Why This Matters

AFAL already behaves like a strong internal sandbox.

This handoff step is the proof that AFAL is moving toward:

- an external-agent integration product surface

rather than staying only:

- a well-implemented internal infrastructure repo

---

## Next Step After Success

If this pilot succeeds, the next stage should be:

- **external-agent validated sandbox**

At that point, AFAL should start to add:

- a distributable client SDK
- a cleaner consumer package surface
- a more explicit onboarding bundle
- optional package / hosted-platform distribution paths

That is the point where package-style distribution becomes credible.
