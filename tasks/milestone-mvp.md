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
The repo now has a stable contract, seeded-runtime foundation, externally validated sandbox, and early Phase 2 agent-payment control-plane proof through Claude Code MCP.

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
- SQLite-backed HTTP sandbox and external-client provisioning
- wallet-confirmed Base Sepolia USDC demo with AFAL settlement and receipt
- autonomous agent-wallet payment rail mode under AFAL guardrails
- Claude Code MCP acceptance through `afal_pay_and_gate`

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

Still required before calling the MVP implementation production-ready:

- one seeded local environment runs the Phase 1 flows through real storage-backed AIP / ATS / AMN services
- payment and resource flows persist state transitions beyond process-local fixture replay
- challenge / approval state survives process boundaries
- the current HTTP contract stays compatible while the backing runtime becomes real
