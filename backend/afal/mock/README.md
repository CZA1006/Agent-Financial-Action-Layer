# Mock AFAL Orchestrator

`backend/afal/mock/` provides a fixture-backed, in-memory stub orchestrator for the Phase 1 canonical flows.

## Purpose

- replay the payment and resource examples without adding backend persistence
- exercise `backend/afal/interfaces.ts` end-to-end before real module services exist
- give the first demo and test harness a deterministic orchestration target

## Notes

- the default ports are built from `sdk/fixtures/`
- AIP, ATS, and AMN now default to seeded store-backed services instead of hand-written fixture ports
- payment and resource intents now default to a seeded store-backed AFAL intent state service
- settlement and usage confirmation now default to a seeded store-backed AFAL settlement service
- receipts and capability responses now default to a seeded store-backed AFAL output service
- the orchestrators still only support the canonical approved flows defined in the example fixtures
- this layer is intentionally thin and should not absorb AIP, AMN, or ATS business logic

## Demo

- `demo.ts` runs both canonical flows end-to-end through the mock ports and performs fixture-alignment assertions
- the intended command is `npm run demo:mock`
- `runMockAfalDemo()` returns both full flow outputs plus a compact summary for CLI/demo use

## Test Skeleton

- `demo.test.ts` is a formal test skeleton built on `node:test` and `node:assert/strict`
- the intended command is `npm run test:mock`
- the current suite covers payment flow replay, resource flow replay, and combined demo summary output
- the suite also covers negative-path boundaries for credential failure, rejected/expired/cancelled approval, invalid DID/account/budget/quota refs, and provider usage failures
- `npm run typecheck` checks the current `backend/` and `sdk/` TypeScript surfaces
