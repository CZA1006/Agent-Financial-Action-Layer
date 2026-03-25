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
