# Next-Stage Implementation Roadmap

## Purpose

This document defines the next implementation stage for AFAL after the original docs-first, schema-first, contract-first milestone.

It answers a narrower question than the whitepaper:

- what should be implemented next
- in what order
- what each module must deliver first
- what should explicitly wait

The original goal of this roadmap was to move AFAL from:

- stable schemas
- canonical examples
- shared types
- mock orchestration
- HTTP/OpenAPI contract artifacts

to:

- minimal real services behind AIP, ATS, and AMN
- one real Phase 1 execution path for payment and resource settlement

This roadmap is for the current repo state, not for the original "start from zero" planning phase.

---

## Current Stage

This roadmap has now been partially executed.

AFAL is no longer only at the "docs + mock orchestration" point.

AFAL has already completed the following foundation work:

- Phase 1 scope is frozen at the documentation level
- core schemas exist for AIP, AMN, ATS, intents, decisions, receipts, and settlement records
- canonical payment and resource flows exist
- shared SDK types exist
- seeded runtime orchestration exists for the two canonical flows
- AIP has a storage-backed in-memory skeleton:
  - interfaces
  - bootstrap
  - store
  - service
  - API adapter
- ATS has a storage-backed in-memory skeleton:
  - interfaces
  - bootstrap
  - store
  - service
  - API adapter
- AMN has a storage-backed in-memory skeleton:
  - interfaces
  - bootstrap
  - store
  - service
  - API adapter
- AFAL now has storage-backed in-memory skeletons for:
  - intent state
  - settlement / usage records
  - receipts / capability responses
- AFAL has a formal module runtime service above seeded orchestration
- API and HTTP transport contracts exist
- OpenAPI artifacts can be versioned, published, previewed, and snapshotted
- seeded durable JSON-backed execution exists across the canonical flows
- SQLite-backed integration slices exist for ATS, AMN approval state, and AFAL intent state
- trusted-surface callback persistence and approved-action resume exist over the HTTP surface
- bilateral runtime-agent harnesses exist for payment and resource flows
- receiver callback delivery now includes outbox persistence, worker redelivery, dead-letter metadata, operator auth, and admin audit
- a shared SQLite integration database now backs the execution-critical slice, notification outbox, and admin audit
- an independent trusted-surface review service stub exists as a separate HTTP process
- explicit payment-rail and resource-provider adapter contracts now exist above AFAL-owned settlement recording
- network-shaped mock payment-rail and provider-service stubs now exist and can be called over HTTP
- the external service path now includes shared-token auth and signed request metadata placeholders
- sandbox-facing external client provisioning, per-client auth, callback registration APIs, and standalone consumer samples now exist
- internal real-agent sandbox acceptance now exists across payment, resource, rejection, retry, and callback-recovery scenarios
- a standalone external-agent pilot kit now exists for repo-external validation

What does **not** exist yet:

- durable AIP persistence beyond in-memory seeded state
- durable ATS persistence beyond the current seeded slices
- durable AMN persistence beyond the current seeded slices
- full trusted-surface approval handling across independently deployed services
- real stablecoin settlement integration
- real provider billing / usage confirmation integration
- real on-chain interfaces beyond documentation

So the next stage is no longer another schema pass, and it is no longer only about proving one execution path.
The next stage is validating whether the current AFAL boundary is consumable from outside the implementation repo and then using that feedback to shape the eventual SDK/package surface.

---

## Implementation Order

Recommended module order:

1. repo-external consumer validation
2. onboarding and auth friction fixes
3. consumer-facing SDK / package boundary
4. stronger external adapters underneath the existing contract

Why this order:

- the main remaining uncertainty is no longer whether AFAL can run internally
- the main remaining uncertainty is whether another engineer can consume the current surface without hidden repo context
- the SDK or package boundary should be shaped by that consumer validation, not by internal assumptions
- stronger adapters should continue underneath a contract that has already been externally exercised

This order is intentionally not:

- another internal harness pass
- package publishing first
- trusted-surface UI first
- on-chain contracts first
- trade intent first

Those would add surface area before the consumer boundary has been validated.

---

## Immediate Next Deliverable

The immediate next deliverable is:

- one successful repo-external pilot run by a second engineer using the standalone external-agent pilot kit

That pilot should use:

- public AFAL routes only
- provisioning output only
- published onboarding docs only

It should not rely on:

- internal `agents/test-harness/`
- internal AFAL runtime modules
- internal fixtures

If that pilot succeeds, the next implementation unit should be:

- a consumer-facing TypeScript SDK / package boundary for AFAL public routes

---

## Stage 1: AIP Persistence First

### Goal

Replace the current seeded in-memory AIP skeleton with durable persistence and keep the existing AIP service/API surface stable.

### Already Done

- DID record storage model exists
- VC record model exists
- seeded in-memory DID resolution works
- seeded in-memory credential verification works
- identity freeze and credential revocation already affect AFAL flow outcomes
- AIP API adapter already exists

### Implement Next

- DID record storage for:
  - Owner DID
  - Institution DID
  - Agent DID
- DID resolution API behind the existing AIP boundary
- VC storage and retrieval for:
  - Ownership VC
  - KYC/KYB VC
  - Authority VC
  - Policy VC
- credential verification service for:
  - issuer match
  - subject match
  - issuance / expiration checks
  - revocation / freeze checks
- identity lifecycle state:
  - active
  - frozen
  - revoked
- credential lifecycle state:
  - active
  - revoked

### Minimal Success Criteria

- AFAL can resolve a DID from durable storage instead of in-memory seed state
- AFAL can verify required credentials from durable storage instead of in-memory seed state
- identity freeze and credential revocation affect downstream flow results

### Do Not Implement Yet

- advanced DID method interoperability
- full OpenID4VCI / OpenID4VP
- cryptographic proof optimization
- provider access credentials
- compute budget credentials
- broad cross-institution verifier network
- on-chain DID anchoring

### Recommended Output

- `backend/aip/` durable store implementation behind the existing service interfaces
- a minimal persistent model document for DID records and VC records
- tests for resolve, verify, revoke, freeze across service restarts or re-instantiation

---

## Stage 2: ATS Persistence Second

### Goal

Replace the current seeded in-memory ATS skeleton with durable account, budget, and quota state.

### Already Done

- account model exists
- budget and quota models exist
- seeded in-memory account / budget / quota reads work
- seeded in-memory consumption paths work
- ATS API adapter already exists

### Implement Next

- persistent account model for:
  - owner treasury account
  - agent operating account
  - settlement account
- account status model:
  - active
  - frozen
  - closed
- monetary budget model:
  - allocated amount
  - consumed amount
  - remaining amount
  - validity window
- resource budget / quota model:
  - resource class
  - provider scope
  - limit
  - usage
- account and budget lookup APIs behind the ATS boundary
- reservation / hold semantics for Phase 1 execution:
  - reserve budget for intent execution
  - settle budget consumption after success
  - release reservation on failure
- simple settlement record persistence

### Minimal Success Criteria

- payment and resource flows can fail for real budget/account reasons, not just in-memory seed mismatch
- the system can reserve and consume budget in a deterministic way
- settlement records and receipts reference persistent ATS state

### Do Not Implement Yet

- full ERC-4337 account factory
- multi-chain asset support
- batch settlement
- reconciliation engine
- replenishment automation
- internal netting logic
- broad portfolio or treasury management
- fiat bridge behavior

### Recommended Output

- `backend/ats/` durable store implementation behind the existing service interfaces
- a small migration or seed layer for one owner, one institution, and one agent
- tests for account state, budget reservation, quota consumption, and release on failure

---

## Stage 3: AMN Persistence Third

### Goal

Replace the current seeded in-memory AMN skeleton with durable mandate, decision, challenge, and approval state.

### Already Done

- mandate model exists
- decision / challenge / approval schemas exist
- seeded in-memory mandate evaluation works for canonical flows
- seeded in-memory challenge and approval persistence works inside one process
- AMN API adapter already exists

### Implement Next

- mandate storage for:
  - payment mandate
  - resource mandate
- mandate lookup by subject, action class, and reference
- policy evaluation engine for Phase 1 checks:
  - action type allowed
  - counterparty / provider restrictions
  - asset restrictions
  - amount or quota threshold checks
  - validity window
- decision output persistence:
  - approved
  - rejected
  - challenge-required
  - pending-approval
  - expired
  - cancelled
- approval / challenge state persistence
- trusted-surface callback contract:
  - create approval request
  - record approval result
  - expire or cancel approval request

### Minimal Success Criteria

- AFAL can evaluate a real mandate from storage
- challenge state survives process boundaries and can be resumed
- approval results change later execution behavior

### Do Not Implement Yet

- policy template marketplace
- advanced risk scoring
- multi-party approval workflows
- institution-wide governance console
- full AP2 interoperability layer
- trade mandate execution
- adaptive or learning-based policies

### Recommended Output

- `backend/amn/` durable store implementation behind the existing service interfaces
- decision-engine tests against real mandate fixtures stored in persistence
- one minimal trusted-surface state transition test path

---

## Stage 4: AFAL Integration Layer Fourth

### Goal

Keep AFAL thin, but switch it from seeded in-memory module state to durable module orchestration across AIP, ATS, and AMN.

### Already Done

- AFAL has a formal runtime service
- AFAL API can depend on module service rather than only raw orchestrator classes
- AFAL intent state, settlement, and output records have storage-backed in-memory services
- the HTTP contract and OpenAPI publish chain are already stable

### Implement Next

- replace seeded in-memory ports with durable AIP / ATS / AMN ports
- preserve the existing payment and resource orchestration shape
- keep the current API adapter and HTTP transport contract stable
- wire real receipt and settlement persistence into AFAL outputs
- expose one demo-ready environment with seeded entities and budgets

### Minimal Success Criteria

- `POST /capabilities/execute-payment` can run against durable AIP, ATS, and AMN services for one seeded scenario
- `POST /capabilities/settle-resource-usage` can run against durable AIP, ATS, and AMN services for one seeded scenario
- the current OpenAPI contract remains the external interface

### Do Not Implement Yet

- framework-heavy production server stack
- distributed workflow engine
- multi-tenant production auth
- production observability platform
- trading routes
- venue connectors
- quote and routing engine

### Recommended Output

- one seeded local environment that replaces the pure in-memory replay path
- compatibility tests showing the HTTP contract still matches the orchestration results
- a clear gap list between local seeded mode and production mode

---

## Cross-Cutting Rule: Trusted Surface Is Supportive, Not Primary

Trusted surface work should happen only to the extent required by AMN approval persistence.

Implement first:

- approval request creation
- approval state lookup
- approval accept / reject / cancel / expire callback handling

Do not implement yet:

- polished end-user UI
- broad app shell
- operator dashboard
- mobile app variants

The trusted surface is a dependency of real challenge flow, not the main product at this stage.

---

## Cross-Cutting Rule: Contracts Stay Interface-Level

On-chain work should remain interface-level until the off-chain state model is stable in AIP, ATS, and AMN.

Allowed next:

- refine `contracts/aip/`, `contracts/amn/`, and `contracts/ats/` interface notes
- identify which state transitions may later be anchored on-chain

Not allowed yet:

- full contract build-out as the main implementation track
- forcing off-chain service design to fit premature chain choices

The repo still needs one stable off-chain execution path before contract-heavy implementation is justified.

---

## Suggested 4-Sprint Plan

### Sprint 1

- implement persistent AIP storage and verification
- replace fixture identity lookup in the mock path with AIP-backed lookup behind the same interfaces

### Sprint 2

- implement persistent ATS account and budget state
- add reservation and settlement state transitions

### Sprint 3

- implement persistent AMN mandate, decision, and approval state
- connect minimal trusted-surface callback semantics

### Sprint 4

- connect real AIP + ATS + AMN services into AFAL orchestration
- run the two canonical flows through the real service path
- publish the first "real-service-backed" OpenAPI snapshot

---

## Definition Of Done For The Next Stage

AFAL should be considered out of the current mock-only stage when all of the following are true:

- at least one Owner DID, Institution DID, and Agent DID live in persistent AIP storage
- at least one real payment mandate and one real resource mandate live in persistent AMN storage
- at least one owner treasury account, one agent operating account, and one settlement account live in persistent ATS storage
- payment and resource flows run through real storage-backed services instead of fixture truth
- receipts and settlement records are persisted
- the existing HTTP capability contract still passes contract tests

Until those are true, the project is still in the mock-contract stage, even if more code exists.

---

## Explicit Non-Goals For This Next Stage

- full exchange / orderbook
- advanced market access
- full AP2 integration
- full x402 integration
- consumer wallet UX
- multi-chain rollout
- generalized institution operations console
- advanced token economy and compute marketplace mechanics

The point of the next stage is not expansion.
The point is to make the current Phase 1 scope real.
