# Next-Stage Integration Plan

## Purpose

This document defines the implementation stage **after** AFAL's current local durable skeleton milestone.

It answers five practical questions:

- what stage AFAL should reach next
- what should be built first
- what should explicitly wait
- what concrete artifacts should exist at the end of the stage
- how we will know the stage is complete

This is not a restart-from-zero roadmap.
It assumes the current repo already has:

- Phase 1 schemas and canonical examples
- AIP / ATS / AMN storage-backed local skeletons
- AFAL durable runtime
- approval session persistence and resume
- capability HTTP routes and OpenAPI artifacts
- local demos and local acceptance

---

## Current Stage

AFAL's current stage is:

- **Phase 1 integration-ready runtime, initial multi-flow runtime-agent harness**

What that means in practical terms:

- the docs/specs/contract layer is stable enough to demo
- canonical payment and resource flows execute end to end
- AIP, ATS, AMN, and AFAL runtime all support seeded durable local mode
- ATS, AMN approval state, and AFAL intent state support a seeded SQLite-backed integration mode
- approval sessions can be persisted, resumed, and finalized
- AFAL can expose top-level pending approval requests
- post-approval execution can resume into settlement and receipt generation
- local HTTP demos, SQLite HTTP demos, and local acceptance pass
- first runtime-agent harnesses can drive canonical payment and resource approval flows through independent agent subprocesses

What this stage still is **not**:

- a production backend
- a real trusted-surface integration
- a real database-backed runtime
- a real settlement or provider integration
- a real multi-agent acceptance environment

---

## Stage Definition

The current target stage is:

- **Phase 1 integration-ready runtime**

This stage is successful when AFAL is no longer just a local durable demo system, but a runtime that can be cleanly integrated with:

- an external trusted-surface service
- a real database adapter
- real test agents running as independent processes
- future payment/provider adapters

In short:

- previous stage = runnable local skeleton
- current stage = integration-ready execution layer

---

## Stage Goal

The goal of this stage is to make AFAL ready for **runtime-agent testing**.

That means the system should support:

1. independent AFAL runtime process
2. independent trusted-surface callback source
3. durable state that is not limited to JSON file stores
4. an agent harness that calls AFAL through the real HTTP contract
5. end-to-end approval recovery and settlement flow across process boundaries

This stage should deliberately stop **before**:

- true blockchain settlement
- true custody/wallet infra
- production authentication systems
- multi-tenant control plane work
- autonomous LLM-driven agents

---

## Stage Outcomes

At the end of this stage, AFAL should have these outcomes:

### 1. Trusted-Surface Integration Boundary

AFAL should support a real callback flow rather than only same-process approval injection.

Target outcome:

- an external trusted-surface stub can:
  - query a pending approval session
  - submit an approval or rejection callback
  - trigger AFAL resume

### 2. Database-Backed Integration Mode

AFAL should support at least one real database-backed mode.

Target outcome:

- a SQLite-backed mode exists for at least the most execution-critical state
- JSON file stores remain available as demo mode

### 3. Runtime-Agent Harness

AFAL should be callable by independent test agents rather than only internal scripts and fixtures.

Target outcome:

- at least two test agents can run as separate processes and complete one canonical payment flow through AFAL

### 4. Updated Contract and Acceptance Layer

The contract surface and acceptance flow must reflect integration use cases.

Target outcome:

- OpenAPI, examples, demos, and acceptance scripts all cover the callback-and-resume flow

---

## Recommended Workstreams

This stage is being executed in three workstreams, in this order:

1. trusted-surface callback integration
2. database-backed integration mode
3. runtime-agent harness

This order matters.

Why:

- callback integration is the highest-value differentiator in AFAL's current architecture
- database-backed state is needed before agent harness work becomes credible
- runtime-agent harness only becomes worth building once the callback and persistence layers are stable

Current progress:

- Workstream 1 is in place for Phase 1 callback-and-resume behavior and includes a minimal trusted-surface stub.
- Workstream 2 is in place for the first integration-critical SQLite slice.
- Workstream 3 has started with payment and resource runtime-agent harnesses.

---

## Workstream 1: Trusted-Surface Callback Integration

### Objective

Turn approval session persistence into a true inter-process callback flow.

### Why First

AFAL's most important current capability is:

- `pending approval -> persisted session -> callback -> resume -> settlement`

That is the path most worth turning from local skeleton behavior into a real integration surface.

### Build

- a formal callback contract for trusted-surface results
- explicit callback request and response schemas
- idempotency rules for repeated callback submissions
- session query/read endpoints for trusted-surface consumption
- error handling for:
  - expired session
  - already-finalized session
  - duplicate callback
  - malformed callback
- callback examples and docs
- a minimal `trusted-surface-stub` service or scriptable process

### AFAL Changes Required

- formalize callback payload shape
- formalize callback authentication placeholder rules
- make approval result application independent from internal helper assumptions
- ensure AFAL can safely resume only once
- keep approval state and action resume state aligned

### Deliverables

- `docs/specs/trusted-surface-callback-contract.md`
- OpenAPI additions for callback/query/resume paths
- `app/trusted-surface/` callback examples
- `backend/afal/http/` callback routes if not already present in stable form
- `scripts/demo-http-async.sh` updated or replaced with a more realistic callback demo
- minimal `trusted-surface-stub/` or `scripts/trusted-surface-stub.ts`

### Acceptance Criteria

- AFAL returns pending approval for a challenge-triggering action
- external callback process can read the session
- external callback process can submit approval
- AFAL resumes the approved action into settlement and receipts
- duplicate callback submission is safely handled

### Explicitly Out Of Scope

- full end-user UX
- production authentication and signing
- mobile client work
- multi-step approval workflow UI

---

## Workstream 2: Database-Backed Integration Mode

### Objective

Add a real database mode so AFAL is no longer limited to JSON-file durability.

### Why Second

Once callbacks happen across process boundaries, local JSON files are still useful for demos but not enough for credible integration mode.

SQLite is the right starting point because:

- low operational burden
- deterministic local runs
- easy CI and developer setup
- enough durability for integration testing

### Recommended First Modules

Start with:

1. ATS
2. AFAL state
3. AMN approval session state
4. AIP

Reason:

- ATS and AFAL state are the most execution-critical
- approval session correctness matters directly for callback recovery
- AIP can follow once execution-critical state paths are proven

### Build

- SQLite-backed store implementations
- schema initialization and migration scripts
- seed/bootstrap for canonical dev data
- reset/rebuild workflow for local testing
- runtime config that selects:
  - JSON demo mode
  - SQLite integration mode

### Deliverables

- `backend/ats/sqlite-store.ts`
- `backend/afal/state/sqlite-store.ts`
- `backend/amn/sqlite-store.ts`
- optionally `backend/aip/sqlite-store.ts`
- `scripts/init-sqlite-dev.sh` or equivalent
- `scripts/accept-sqlite.sh`
- updated docs describing mode selection

### Acceptance Criteria

- AFAL can boot in SQLite mode
- canonical payment flow passes in SQLite mode
- pending approval session survives restart in SQLite mode
- approved action can resume after restart in SQLite mode
- local acceptance has a SQLite variant

### Explicitly Out Of Scope

- Postgres production rollout
- cloud-managed DB deployment
- distributed locking
- large-scale reconciliation

---

## Workstream 3: Runtime-Agent Harness

### Objective

Use real agent processes to exercise AFAL through the real HTTP surface.

### Why Third

An agent harness only becomes meaningful when:

- callback boundaries are real
- persistence is credible
- AFAL can survive restart and resume

Without those, agent testing is mostly a prettier fixture wrapper.

### What Counts As A Real Agent Here

For this stage, a real agent means:

- an independent process
- its own config / DID / account context
- it communicates with AFAL through HTTP
- it can wait for or react to approval/session changes

This stage does **not** require:

- autonomous planning
- LLM-native reasoning loops
- fully general-purpose agent stacks

Start with deterministic runtime agents.

### First Harness Scenario

The first harness should be:

- **agent-to-agent payment**

Why this first:

- covers identity
- covers mandate and approval
- covers ATS reservation and settlement
- covers payer/payee outcome visibility
- simpler than provider-style resource billing

### Build

- `agents/test-harness/payer-agent`
- `agents/test-harness/payee-agent`
- `agents/test-harness/trusted-surface-stub`
- seed/bootstrap for their DIDs, credentials, mandates, and accounts
- a single command that boots the harness and executes the flow

### Deliverables

- `agents/test-harness/README.md`
- `scripts/run-agent-payment-harness.sh`
- HTTP request/response capture samples
- acceptance assertions for:
  - payment created
  - pending approval emitted
  - callback applied
  - settlement completed
  - receipt created
  - receiver state observed

### Acceptance Criteria

- payer agent can initiate a payment request
- AFAL emits pending approval
- trusted-surface stub submits approval callback
- AFAL resumes and settles the action
- payee agent can observe final payment result or receipt

### Explicitly Out Of Scope

- autonomous LLM agent logic
- multi-party settlement markets
- open network interoperability testing

---

## Recommended Milestones

### Milestone A: Callback-Ready AFAL

Target:

- trusted-surface callback contract is stable
- callback and resume demos pass

Done when:

- pending approval, callback, and resume all work across independent processes

### Milestone B: SQLite Integration Mode

Target:

- AFAL can run canonical flows in SQLite mode

Done when:

- a restart-safe SQLite-backed acceptance path exists

### Milestone C: Agent Payment Harness

Target:

- two independent agent processes can complete one payment flow

Done when:

- the harness can run with one command and produce a receipt-bearing success result

---

## Suggested Repository Additions

Recommended new files or directories for this stage:

- `docs/product/next-stage-integration-plan.md`
- `docs/specs/trusted-surface-callback-contract.md`
- `docs/examples/http/apply-approval-result.request.json`
- `docs/examples/http/apply-approval-result.response.sample.json`
- `docs/examples/http/get-approval-session.request.json`
- `docs/examples/http/get-approval-session.response.sample.json`
- `backend/ats/sqlite-store.ts`
- `backend/afal/state/sqlite-store.ts`
- `backend/amn/sqlite-store.ts`
- `scripts/init-sqlite-dev.sh`
- `scripts/accept-sqlite.sh`
- `agents/test-harness/`

---

## Validation Strategy

This stage should introduce three parallel validation lanes:

### 1. Existing Local Skeleton Acceptance

Keep:

- `npm run accept:local`

Purpose:

- fast regression safety

### 2. SQLite Integration Acceptance

Add:

- `npm run accept:sqlite`

Purpose:

- validate restart-safe execution in a real DB mode

### 3. Agent Harness Acceptance

Add:

- `npm run accept:agents`

Purpose:

- validate inter-process payment flow through AFAL's HTTP surface

---

## What Success Looks Like

This stage is complete when AFAL can honestly claim:

- it supports external trusted-surface callback integration
- it supports a real database-backed integration mode
- it supports runtime-agent end-to-end testing for at least one canonical payment flow

At that point AFAL moves from:

- local durable execution skeleton

to:

- integration-ready agent financial execution runtime

---

## Recommended First Implementation Slice

The first concrete slice to implement after this document should be:

1. trusted-surface callback contract document
2. callback/query/resume examples
3. minimal trusted-surface stub
4. callback-specific acceptance

Why this slice first:

- highest leverage
- most aligned with AFAL's unique value
- smallest path from current state to true inter-process integration

---

## Summary

Do not jump straight to fully autonomous agents or production settlement.

The next stage should deliberately build the bridge between:

- local durable AFAL demos

and

- real runtime-agent integration testing

That bridge is:

- trusted-surface callback integration
- SQLite integration mode
- runtime-agent harness
