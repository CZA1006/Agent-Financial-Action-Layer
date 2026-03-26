# AFAL Intent State Service

`backend/afal/state/` owns payment and resource intent state as store-backed records.

## Purpose

- persist Phase 1 payment and resource intents behind a stable service boundary
- move intent lifecycle updates out of the mock orchestrator body
- keep AFAL-owned action state separate from settlement and output records

## Scope

- payment intent creation and lifecycle updates
- resource intent creation and lifecycle updates
- seeded canonical templates for the current demo flows

## Notes

- this layer does not evaluate mandates or execute settlement
- it only stores AFAL intent state and applies lifecycle field updates
- seeded templates are used for canonical flows so current demo expectations remain stable
