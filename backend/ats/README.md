# Backend ATS Service Boundary

## Purpose

`backend/ats/` owns account, treasury, budget, quota, and replenishment boundaries for Phase 1.

## Objects Owned

- treasury accounts
- operating accounts
- settlement accounts
- budgets
- quotas
- replenishment policies

## Inputs

- account creation requests
- budget allocation requests
- account freeze/unfreeze requests
- budget and quota lookups

## Outputs

- account state
- budget state
- quota state
- replenishment policy state

## Notes

- derive shapes from `docs/specs/ats-account-treasury-schema.md`
- do not build a full ledger before the schema stabilizes
- resource budgets are ATS objects, not required VC extensions in Phase 1
- the current next-stage implementation is an in-memory, storage-backed service skeleton
- the ATS layer is now split into:
  - `interfaces.ts` for reader, lifecycle, and budget mutation ports
  - `api/` for request/response handlers above the ATS ports
  - `bootstrap.ts` for fixture-backed seed assembly
  - `store.ts` for persistence operations
  - `file-store.ts` for a durable JSON snapshot implementation of the same store boundary
  - `service.ts` for state lookup and minimal mutation logic
- this layer now also has one minimal durable persistence option for local seeded mode via `JsonFileAtsStore`
