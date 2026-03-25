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
