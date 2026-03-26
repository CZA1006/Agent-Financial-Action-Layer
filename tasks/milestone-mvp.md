# MVP Milestone

## Goal

Build the minimum viable AFAL foundation for:

- identity
- credentials
- accounts
- mandates
- payment/resource intents
- stablecoin settlement
- trusted-surface challenge hooks

This milestone is no longer at the "starting from zero" stage.
The repo now has a stable contract and seeded-runtime foundation, so the remaining work is to turn the current skeletons into real implementations without changing the Phase 1 external contract.

## Deliverables Status

Completed:

- DID and VC schemas
- mandate schema
- payment intent schema
- resource intent schema
- ATS account / budget / quota model
- repository scaffolding
- architecture docs
- canonical payment and resource example flows
- shared SDK types
- AIP seeded storage-backed skeleton
- ATS seeded storage-backed skeleton
- AMN seeded storage-backed skeleton
- AFAL seeded runtime for:
  - intent state
  - settlement records
  - receipts / capability responses
- AFAL API adapter
- AFAL HTTP transport contract
- OpenAPI draft / stable publish / snapshot / preview pipeline

Remaining for MVP:

- replace seeded in-memory AIP state with durable persistence
- replace seeded in-memory ATS state with durable persistence and reservation semantics
- replace seeded in-memory AMN state with durable mandate / challenge persistence
- wire real trusted-surface approval state callbacks
- keep AFAL runtime thin while switching it from seeded module state to real module state
- define one local seeded environment that is "real service mode" rather than "fixture replay mode"

## Deliverables

- DID and VC schemas
- mandate schema
- payment intent schema
- resource intent schema
- account model
- repository scaffolding
- initial architecture docs
- initial implementation plan

## Success Criteria

Already met:

- a clear modular architecture for AIP / AMN / ATS
- a stable schema set for Phase 1
- a documented implementation plan
- one end-to-end demo target selected
- canonical payment and resource flows runnable through seeded runtime and tests
- stable AFAL API / HTTP / OpenAPI contract artifacts

Still required before calling the MVP implementation complete:

- one seeded local environment runs the Phase 1 flows through real storage-backed AIP / ATS / AMN services
- payment and resource flows persist state transitions beyond process-local fixture replay
- challenge / approval state survives process boundaries
- the current HTTP contract stays compatible while the backing runtime becomes real
