# External Agent Integration Minimum Checklist

## Purpose

This document defines the minimum implementation checklist required to move AFAL from the current:

- late Phase 1 externally integrated runtime

to:

- a sandbox integration platform that can be used by real external agent systems

This is not a production roadmap.
It is the shortest practical path to make AFAL ready for one real external agent integration pilot.

---

## Current Stage

AFAL has already completed the local externally integrated runtime slice.

That means the repo already has:

- canonical payment and resource flows
- AIP, ATS, AMN, and AFAL runtime boundaries
- HTTP/OpenAPI contract artifacts
- bilateral runtime-agent harnesses
- trusted-surface approval session, callback, and resume behavior
- an independent trusted-surface review service stub
- a shared SQLite integration database
- receiver callback delivery with outbox, worker redelivery, dead-letter metadata, admin audit, and operator routes
- explicit payment-rail and provider-service adapter boundaries
- network-shaped external payment/provider service stubs
- shared-token auth and signed request metadata placeholders on the external service path
- local SQLite acceptance that passes end to end

What AFAL does **not** have yet is a true external-agent-facing sandbox contract and onboarding layer.

The remaining gap is not the internal payment/resource flow.
The remaining gap is:

- external agent identity and auth
- sandbox provisioning and reset
- callback registration and reachability
- external-agent-specific integration docs
- real external-agent acceptance

---

## Stage Goal

The goal of this checklist is to make AFAL ready for:

- one real external agent system
- one sandbox environment
- one repeatable acceptance flow

At the end of this checklist, AFAL should support:

1. a real external agent client identity
2. signed requests into AFAL public APIs
3. callback delivery to an external agent-owned endpoint
4. payment and resource flow execution through the existing AFAL runtime
5. deterministic sandbox acceptance for happy-path and failure-path scenarios

This checklist deliberately stops **before**:

- production secrets management
- full multi-tenant control plane
- real payment rail integration
- real provider billing integration
- production SRE and observability maturity

---

## Week 1: Make the Integration Boundary Real

### Objective

Turn AFAL's current external-facing edge into a real sandbox integration contract instead of an internal demo boundary.

### Build

#### 1. Define the external agent identity model

Specify the relationship between:

- `client_id`
- `agent_id`
- `tenant_id`
- `subject_did`
- `mandate_ref`
- treasury references and callback ownership

The model must answer:

- whether one external client represents one agent or one agent platform
- how many subject DIDs a client may act for
- which treasury or mandate scope a client can access

#### 2. Replace shared access assumptions with per-client auth

Introduce sandbox client credentials per external integration.

Minimum contract:

- `x-afal-client-id`
- `x-afal-request-timestamp`
- `x-afal-request-signature`

Minimum behavior:

- each client has its own secret or signing key
- requests are rejected outside a timestamp window
- replay protection rules are defined
- requests are scoped to registered subject/account/callback resources

#### 3. Separate public integration routes from operator routes

Define and document two route classes.

Public integration surface:

- action creation requests
- approval session reads needed by approved integrations
- action status reads
- callback registration or callback-related reads if exposed

Operator-only surface:

- notification delivery inspection
- worker control
- redelivery
- admin audit inspection

#### 4. Add sandbox client provisioning

Create a minimal provisioning path that can generate a usable external-agent sandbox bundle.

Each provisioned sandbox client should receive:

- client id
- signing secret or token
- test subject DID
- mandate reference
- ATS budget/quota scope
- callback registration metadata
- environment endpoint references

#### 5. Define callback registration and ownership

Make callback registration explicit.

Minimum fields:

- callback URL
- owner client id
- supported event types
- callback verification expectations

Minimum event set:

- `payment.settled`
- `resource.settled`

### Deliverables

- `docs/specs/external-agent-auth-contract.md`
- `docs/product/external-agent-sandbox-onboarding.md`
- one provisioning script under `scripts/`
- one sandbox configuration example
- updated docs that clearly separate public integration routes from operator routes

### Acceptance Criteria

- a new sandbox client can be provisioned without manual repo edits
- the client receives isolated credentials and scoped test references
- signed public API requests succeed for that client
- operator routes are not available through public credentials
- callback registration exists and can be validated

---

## Week 2: Run One Real External Agent Through Payment

### Objective

Replace harness-only orchestration with one real external agent pilot against AFAL's sandbox boundary.

### Build

#### 1. Select one real external agent runtime

Do not integrate multiple runtimes at once.
Pick one runtime that can:

- make HTTP requests
- persist minimal state
- receive callbacks or poll AFAL
- expose a transcript of actions taken

#### 2. Write the minimal external integration guide

Document only the payment path first.

The guide must explain:

- how to authenticate
- how to send a payment request
- how to interpret `pending-approval`
- how approval completion is surfaced
- how callback handling works
- how polling fallback works
- how to read the final receipt and capability response

#### 3. Run a real external payment pilot

The pilot flow should be:

1. external agent submits a payment request
2. AFAL returns pending approval
3. trusted-surface approves the session
4. external agent receives callback or polls final state
5. external agent confirms settled status and receipt

#### 4. Add transcript-level evidence

Capture:

- request payloads
- auth metadata
- AFAL responses
- callback payloads
- final status reads
- agent-side decision log

This evidence is required to debug whether failures belong to:

- AFAL
- the callback path
- the external agent
- the approval flow

#### 5. Define payment acceptance rules

A successful payment pilot should require:

- no duplicated action creation
- correct pending-approval handling
- no unsafe retries while approval is pending
- settled final state
- receipt visibility
- callback or polling reconciliation success

### Deliverables

- `docs/product/external-agent-integration-guide.md`
- one real external agent pilot runbook
- transcript capture format or artifact
- payment acceptance checklist

### Acceptance Criteria

- one real external agent can complete the payment flow against AFAL
- the agent does not depend on internal test harness code
- callback and polling both work as completion mechanisms
- transcripts are available for review
- another engineer can reproduce the pilot from the guide

---

## Weeks 3-4: Expand to Resource Flow and Failure Acceptance

### Objective

Turn the first external-agent pilot into a repeatable sandbox acceptance layer.

### Build

#### 1. Extend the external agent pilot to the resource flow

The agent must be able to:

- request a resource intent
- handle approval
- receive resource callback or poll final status
- confirm usage, settlement, and resource receipt outcomes

#### 2. Formalize the failure matrix

At minimum, make these scenarios repeatable:

- approval rejected
- approval expired
- callback delivery fails and later recovers
- external adapter transient failure and retry recovery
- external adapter terminal rejection
- dead-letter followed by operator recovery
- callback unavailable but polling reconciliation succeeds

#### 3. Add sandbox reset and test isolation

External-agent testing must be repeatable without manual DB cleanup.

Add a reset path for:

- intents
- deliveries
- admin audit state
- budgets and quotas
- callback registrations
- sandbox test entities

#### 4. Provide a minimal client sample or SDK

At least one supported sample client should exist.

Recommended options:

- TypeScript client
- Python client

Minimum included functionality:

- request signing
- common AFAL action requests
- callback parsing
- final action polling
- error classification guidance

#### 5. Add an external-agent acceptance script

Create one script or runbook that executes:

- payment happy path
- resource happy path
- one transient failure recovery path
- one terminal rejection path

#### 6. Publish operator guidance for external-agent incidents

Document:

- how to inspect delivery failures
- how to redeliver
- how to inspect worker state
- how to reconcile with `/actions/get`
- how to distinguish AFAL-side failure from external-agent-side failure

### Deliverables

- external resource integration guide additions
- sandbox reset script or command
- one sample client or lightweight SDK
- external-agent acceptance script
- operator incident runbook for external integrations

### Acceptance Criteria

- one real external agent can complete both payment and resource flows
- at least four critical failure scenarios are reproducible
- reset and rerun are deterministic
- one sample client is usable by another engineer
- the external-agent acceptance flow can be executed repeatedly in sandbox mode

---

## Minimum Deliverable Summary

At the end of this checklist, AFAL should have:

- per-client external sandbox auth
- signed public API requests with replay rules
- callback registration and ownership rules
- sandbox provisioning for real external agents
- one real external agent payment pilot
- one real external agent resource pilot
- transcript-based acceptance evidence
- failure-path acceptance coverage
- resettable sandbox state
- one sample client or minimal SDK

---

## What "Done" Means

This checklist is complete when AFAL can honestly claim:

- a real external agent system can be provisioned into AFAL sandbox mode
- that agent can authenticate without internal-only shortcuts
- that agent can run payment and resource flows through AFAL
- AFAL can notify the agent through callback or support polling fallback
- key failure scenarios are reproducible and recoverable
- another engineer can repeat the full external-agent acceptance process from docs and scripts

That stage should be described as:

- **External agent sandbox ready**

It is still not:

- production ready
- real rail integrated
- real provider billing integrated
- production control-plane complete

But it is the minimum credible stage for true external-agent integration testing.
