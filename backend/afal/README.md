# Backend AFAL Action Boundary

## Purpose

`backend/afal/` owns action orchestration across AIP, AMN, ATS, settlement, and receipt generation for Phase 1.

## Objects Owned

- payment intents
- resource intents
- capability responses
- settlement records
- receipts

## Inputs

- create/evaluate/execute payment requests
- create/evaluate/execute resource requests
- trusted-surface resolution events

## Outputs

- payment/resource intent state
- capability response
- settlement record
- receipt

## Notes

- derive shapes from the AFAL schema docs under `docs/specs/`
- orchestration should call module boundaries rather than absorb their logic
- one canonical Phase 1 flow should be enough to drive the first demo
- `interfaces.ts` should remain the minimal contract surface for flow orchestration before concrete service implementations exist
- `mock/` contains a fixture-backed in-memory stub that replays the canonical payment and resource flows through those interfaces
- `api/` provides a framework-free request/response adapter above orchestration so AFAL can expose capability handlers before choosing HTTP transport
- `http/` provides the framework-free transport contract for Phase 1 capability routes and status-code behavior
