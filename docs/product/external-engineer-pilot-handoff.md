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
   - `docs/product/external-engineer-message-template.md`
   - `docs/specs/external-agent-auth-contract.md`
   - `docs/specs/receiver-settlement-callback-contract.md`

The engineer should **not** need:

- direct access to AFAL internal runtime modules
- `agents/test-harness/`
- internal OpenRouter pilot scripts
- internal test fixtures

If the engineer needs those, the external integration surface is still too implicit.

---

## Important Constraint

For this pilot, the external engineer should **not** write a fresh agent runtime first.

The first pass should use only:

- command line execution
- the standalone pilot scripts
- the standalone callback receiver

Why:

- this pilot is testing AFAL's external-consumer boundary
- it is **not yet** testing whether another agent framework can absorb AFAL cleanly

Only after this pilot passes should the engineer replace the standalone scripts with their own agent code.

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

### Recommended Host Assumptions

The external engineer's machine should have:

- Node.js 22 or newer
- `npm`
- ability to reach the AFAL base URL over HTTP
- ability to bind one local loopback port for callback testing

---

## What AFAL Team Should Send

The cleanest handoff is one copy-paste bundle instead of scattered values.

Recommended handoff bundle:

```text
AFAL_BASE_URL=http://127.0.0.1:3213
AFAL_CLIENT_ID=client-demo-001
AFAL_SIGNING_KEY=<signing-key>
AFAL_MONETARY_BUDGET_REF=budg-money-001
AFAL_RESOURCE_BUDGET_REF=budg-res-001
AFAL_RESOURCE_QUOTA_REF=quota-001
AFAL_PAYMENT_CALLBACK_URL=http://127.0.0.1:3401/callbacks/action-settled
AFAL_RESOURCE_CALLBACK_URL=http://127.0.0.1:3401/callbacks/action-settled
```

Optional but useful:

- exact `subjectDid`
- expected `mandateRef`
- expected `paymentPayeeDid`
- expected `resourceProviderDid`
- one example successful callback registration response

---

## Quickest Path

If the external engineer wants the shortest possible validation path, they should do only these four things first:

1. configure `.env`
2. run the callback receiver
3. run callback registration
4. run one payment request and one resource request

That four-step path is enough to expose most onboarding friction.

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

Suggested commands:

```bash
cp .env.example .env
npm install
```

Success criteria:

- the standalone scripts run without importing AFAL internal modules

What the engineer should confirm:

- no missing env error is raised
- `npm install` completes without needing the AFAL monorepo root
- the standalone repo can be treated as an ordinary external consumer

### 1a. Callback Receiver Startup

The engineer should start the local callback receiver before registering URLs:

```bash
npm run callback:receiver
```

Expected output:

```text
callback receiver listening on http://127.0.0.1:3401/callbacks/action-settled
```

If this does not start, the engineer should report:

- port conflict
- missing runtime dependency
- missing env
- unexpected local filesystem writes

### 2. Callback Registration

The engineer should call:

- `POST /integrations/callbacks/register`
- `POST /integrations/callbacks/get`
- `POST /integrations/callbacks/list`

Standalone commands:

```bash
npm run callbacks:register
npm run callbacks:get
npm run callbacks:list
```

Expected registration result:

- HTTP success
- response contains:
  - `clientId`
  - `callbackRegistration`
  - `paymentSettlementUrl` and/or `resourceSettlementUrl`

Expected list result:

- exactly one registration record for the provisioned client in this pilot

Success criteria:

- callback registration succeeds using only external-client signed headers
- readback matches the registered URLs

What the engineer should report if this step is confusing:

- was the signing model unclear
- were header requirements unclear
- was it unclear whether `paymentSettlementUrl` and `resourceSettlementUrl` are both required
- was it unclear which callback path to expose
- was the error message specific enough when registration failed

### 3. Payment Request

The engineer should submit:

- `POST /capabilities/request-payment-approval`

Standalone command:

```bash
npm run payment
```

Expected result:

- HTTP success
- capability result indicates `pending-approval`
- output includes an approval-state pointer such as `approvalSessionRef`

Success criteria:

- AFAL returns `pending-approval`
- request shape and auth rules are understandable from docs plus sample code

What the engineer should report:

- which request fields felt too AFAL-internal
- whether the payment payload was understandable without reading the implementation repo
- whether the response shape made it obvious what happens next

### 4. Resource Request

The engineer should submit:

- `POST /capabilities/request-resource-approval`

Standalone command:

```bash
npm run resource
```

Expected result:

- HTTP success
- capability result indicates `pending-approval`
- output includes an approval-state pointer or equivalent challenge result

Success criteria:

- AFAL returns `pending-approval`
- provider-facing request shape is understandable from docs plus sample code

What the engineer should report:

- whether resource-specific fields were understandable
- whether budget/quota references were intuitive
- whether the provider/requester terminology felt clear

### 5. Callback Receiver Verification

The engineer should run the standalone callback receiver and confirm:

- `POST /callbacks/action-settled` is received
- AFAL delivery headers are present
- the receiver can acknowledge with `202`

Expected AFAL delivery headers:

- `x-afal-notification-id`
- `x-afal-idempotency-key`
- `x-afal-delivery-attempt`
- `x-afal-event-type`

Success criteria:

- the external engineer can observe settlement callback payloads without using AFAL internals

Artifacts worth saving:

- receiver terminal output
- one sample callback JSON artifact
- one screenshot or copy-paste of the callback headers

### 6. Friction Review

The engineer should explicitly record:

- unclear env vars
- confusing request fields
- missing examples
- signing/auth pain points
- callback registration friction
- error messages that are too vague

This feedback is the main output of the pilot.

Recommended feedback format:

```text
Step:
What I tried:
What I expected:
What happened instead:
Severity:
Suggested improvement:
```

Severity guide:

- `critical` = blocked the pilot entirely
- `major` = could proceed only after guessing or asking
- `minor` = completed, but the surface felt rough

---

## Suggested One-Message Status Template

Ask the external engineer to return one message in this format:

```text
Environment:
- OS:
- Node version:

Completed:
- callback receiver
- callback registration
- payment request
- resource request

Blocked:
- <step or none>

Most confusing part:
- <one sentence>

Best part of the current developer experience:
- <one sentence>

Top 3 fixes you would want before using AFAL as a real dependency:
1. ...
2. ...
3. ...
```

---

## What The Engineer Should Not Spend Time On

For this pilot, the engineer should not spend time on:

- replacing the standalone scripts with a custom agent framework
- rewriting request schemas
- reverse-engineering AFAL internal stores
- trying to prove real-funds settlement
- evaluating production hosting or security posture

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
