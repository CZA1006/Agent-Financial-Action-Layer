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
- scaffold service folders
- align backend interfaces with schemas
- prepare for minimal end-to-end demo flows

The backend is where AFAL becomes operational, but Phase 1 should still prioritize structure over heavy implementation.

---

## What Belongs Here

Examples of code or artifacts that belong in `backend/`:

- identity service scaffolding
- credential service scaffolding
- policy engine scaffolding
- challenge service scaffolding
- action router scaffolding
- audit service scaffolding
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

**Service boundaries first, implementations second.**

The backend should be aligned with:
- `docs/architecture/`
- `docs/specs/`
- current MVP scope

If a service boundary is unclear, document it before implementing it.

---

## Immediate Next Step

Phase 1 backend work should focus on:
- service scaffolding
- interfaces for AIP / AMN / ATS / AFAL modules
- minimal orchestration for payment and resource intent flows
- audit-friendly request / decision / receipt boundaries
