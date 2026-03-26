# AFAL HTTP Transport Contract

`backend/afal/http/` defines a minimal HTTP-shaped contract above the AFAL API adapter.

## Purpose

- expose stable Phase 1 transport paths before choosing Express, Fastify, Hono, or another framework
- define route names, request bodies, and response envelopes for capability execution
- keep transport validation separate from API error mapping and orchestration logic

## Phase 1 Routes

- `POST /capabilities/request-payment-approval`
- `POST /capabilities/execute-payment`
- `POST /capabilities/request-resource-approval`
- `POST /capabilities/settle-resource-usage`
- `POST /approval-sessions/get`
- `POST /approval-sessions/apply-result`
- `POST /approval-sessions/resume`
- `POST /approval-sessions/resume-action`

## Notes

- this layer is framework-free and currently implemented as a pure router function
- `durable-server.ts` adds a thin Node `http` server shell above the durable router wiring
- `sqlite-server.ts` adds the same thin Node `http` server shell above the SQLite integration wiring
- `durable-demo.ts` runs a one-shot canonical payment request through the durable HTTP layer
- `sqlite-demo.ts` runs the same one-shot canonical payment request through the SQLite-backed HTTP layer
- request validation is intentionally minimal: method, path, request body shape, and `requestRef` consistency
- successful responses pass through the API adapter payloads and status codes
- `request-payment-approval` and `request-resource-approval` now expose top-level `pending-approval` capability responses without forcing inline settlement
- `resume-approved-action` resumes a persisted approved action into final settlement, receipt creation, and capability response creation
- `durable.ts` wires the same router contract to the seeded local durable AFAL runtime
- `sqlite.ts` wires the same router contract to the seeded SQLite-backed AFAL integration runtime
- approval session routes expose trusted-surface callback persistence and resume semantics above the same durable runtime
- `npm run demo:http-payment` runs the canonical payment request through durable HTTP and prints a compact summary
- `npm run demo:http-sqlite` runs the canonical payment request through the SQLite-backed HTTP layer and prints a compact summary
- `npm run demo:http-async` runs the async payment path through request-approval, apply-result, and resume-action
- `npm run serve:durable-http` starts the capability routes against the seeded local durable runtime
- `npm run serve:sqlite-http` starts the same capability routes against the seeded SQLite-backed integration runtime
- the docs-first transport draft lives at `docs/specs/afal-http-openapi-draft.yaml`
- `npm run export:openapi` generates `docs/specs/afal-http-openapi-draft.json` from that YAML draft
- the stable publish paths for downstream consumers are `docs/specs/openapi/latest.yaml` and `docs/specs/openapi/latest.json`
- `docs/specs/openapi/manifest.json` captures version, generation time, and git metadata for those stable artifacts
- `backend/afal/http/openapi-export.test.ts` verifies that the JSON export stays aligned with the current transport contract
- `docs/specs/openapi/index.html` and `npm run preview:openapi` provide a static OpenAPI preview for human review
- in the current Phase 1 mock transport, `challenge-required` is represented inside the returned flow payload rather than as a separate top-level HTTP response
