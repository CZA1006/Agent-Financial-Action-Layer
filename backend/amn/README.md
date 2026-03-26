# Backend AMN Service Boundary

## Purpose

`backend/amn/` owns mandate verification, policy evaluation, and challenge orchestration boundaries for Phase 1.

## Objects Owned

- mandates
- authorization decisions
- challenge records
- approval results

## Inputs

- action authorization requests
- mandate lookup requests
- trusted-surface approval/rejection callbacks

## Outputs

- authorization decision
- challenge record
- updated decision after approval resolution

## Notes

- derive shapes from `docs/specs/amn-mandate-schema.md`, `docs/specs/afal-authorization-decision-schema.md`, and `docs/specs/afal-approval-challenge-schema.md`
- policy evaluation is off-chain first
- trusted-surface integration should remain callback-driven and auditable
- the current next-stage implementation is an in-memory, storage-backed service skeleton
- the AMN layer is now split into:
  - `interfaces.ts` for mandate, decision, challenge, and approval ports
  - `api/` for request/response handlers above the AMN ports
  - `bootstrap.ts` for fixture-backed seeded mandates and decision templates
  - `store.ts` for persistence operations
  - `file-store.ts` for a durable JSON snapshot implementation of the same store boundary
  - `service.ts` for evaluation, challenge creation, approval recording, and finalization
- this layer now also has one minimal durable persistence option for local seeded mode via `JsonFileAmnStore`
