# Backend

## Purpose

The `backend/` folder contains AFAL’s off-chain service layer.

This layer is responsible for coordinating:
- identity resolution
- credential issuance and verification
- mandate and policy evaluation
- challenge orchestration
- action routing
- audit logging
- settlement orchestration

In Phase 1, the backend should be designed as a **clear service boundary layer**, not a fully built production stack.

---

## Phase 1 Role

The goal of `backend/` in the current phase is to:
- define service boundaries
- define module responsibilities
- carry the seeded durable and SQLite-backed execution slices
- align backend interfaces with schemas
- support end-to-end approval, settlement, callback, and operator recovery flows

The backend is where AFAL becomes operational, and the repo has now moved beyond pure scaffolding.

Current backend reality includes:

- storage-backed AIP / ATS / AMN / AFAL service layers
- durable JSON-backed execution mode
- SQLite-backed integration mode for ATS, AMN approval state, AFAL intent state, admin audit, and notification outbox
- a shared SQLite integration database bootstrap path for the execution-critical slice
- an independent trusted-surface review service stub that drives approval callback and resume over HTTP
- explicit payment-rail and provider-settlement adapter boundaries for AFAL settlement execution
- network-shaped mock payment-rail and provider-service stubs that AFAL can call over HTTP
- shared-token auth plus signed request metadata placeholders between AFAL and the external payment/provider HTTP stubs
- bounded retry semantics for transient failures in the external payment/provider HTTP adapter path
- explicit non-retryable external failure handling for terminal payment/provider rejections
- the external service auth boundary is documented in `docs/specs/external-service-auth-contract.md`
- trusted-surface approval session persistence and resume behavior
- receiver callback delivery, outbox persistence, worker redelivery, and admin audit logging
- framework-free HTTP routes for capabilities, approval sessions, notification administration, and worker control
- a standalone external-agent pilot kit that can now be extracted out of the repo for consumer-side validation

---

## What Belongs Here

Examples of code or artifacts that belong in `backend/`:

- identity and credential service logic
- treasury and reservation semantics
- mandate, challenge, and approval-session logic
- action routing and post-approval resume logic
- settlement orchestration and receipt generation
- callback delivery, notification outbox, worker, and admin audit logic
- service-level README files
- interface contracts between modules
- request / response validation boundaries

Suggested subfolders:
- `backend/aip/`
- `backend/amn/`
- `backend/ats/`
- `backend/afal/`

---

## What Does Not Belong Here Yet

The following should **not** be the focus of `backend/` in Phase 1:

- full production deployment infra
- deep database optimization
- large auth / identity provider integration
- queue-heavy microservice complexity
- full observability stack
- large cloud infra setup
- premature performance tuning

---

## Working Principle

**Stable service boundaries first, then narrow execution slices that prove the contract.**

The backend should be aligned with:
- `docs/architecture/`
- `docs/specs/`
- current MVP scope

If a service boundary is unclear, document it before implementing it.

---

## Immediate Next Step

The backend has now moved from an integration-ready execution layer into the first externally integrated slice.

Immediate next backend work should focus on:
- keeping JSON + shared-SQLite runtime slices coherent with the HTTP contract
- supporting repo-external validation through the standalone external-agent pilot kit
- using that external-engineer pilot to find onboarding, auth, callback, and error-surface friction
- preserving the current contract surface while replacing more seeded behavior underneath it
