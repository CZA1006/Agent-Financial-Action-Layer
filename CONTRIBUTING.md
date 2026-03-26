# Contributing

AFAL is currently in a Phase 1 integration-ready runtime stage with:

- durable local mode
- initial SQLite integration mode
- persistent approval callback and resume flow
- initial payment/resource runtime-agent harnesses over the AFAL HTTP contract

That means contribution quality is judged less by feature count and more by whether a change keeps the current Phase 1 contract coherent.

## Working Rules

- keep documentation, schemas, fixtures, runtime behavior, and published contract artifacts aligned
- prefer small, reviewable commits over broad mixed refactors
- do not widen Phase 1 scope implicitly
- if a change affects the HTTP contract or OpenAPI artifacts, regenerate and commit the resulting published files
- if a change affects canonical flows, update the example docs and HTTP samples in `docs/examples/http/`

## Local Validation

Before opening a PR, run:

```bash
npm run accept:local
npm run accept:sqlite
```

If your environment cannot bind local ports, run:

```bash
npm run accept:local -- --skip-http
npm run accept:sqlite -- --skip-http
```

This currently covers:
- TypeScript typecheck
- full automated test suite
- durable runtime demo
- durable HTTP demos, when enabled
- SQLite integration demo and SQLite HTTP demo, when enabled
- runtime-agent payment/resource harnesses, when enabled
- OpenAPI export refresh

## When To Run Extra Checks

Run these in addition to `accept:local` when relevant:

- `npm run preview:openapi`
  Use when you changed the HTTP contract or OpenAPI artifacts and want a human review pass.
- `npm run snapshot:openapi -- <version>`
  Use only when intentionally publishing a new immutable OpenAPI snapshot.
- `npm run demo:mock`
  Use when you changed canonical fixture or orchestration behavior and want a quick in-memory comparison.
- `npm run demo:agent-payment`
  Use when you changed callback, resume, SQLite HTTP, or runtime-agent harness behavior and want a subprocess-level verification.
- `npm run demo:agent-payment-bilateral`
  Use when you changed payee-facing action status reads or the bilateral payment harness flow.
- `npm run demo:agent-resource`
  Use when you changed the resource approval/resume path and want the same subprocess-level verification on the resource flow.
- `npm run demo:agent-resource-bilateral`
  Use when you changed provider-facing action status reads or the bilateral resource harness flow.

## Pull Request Expectations

A good PR should state:
- what changed
- whether the change is docs-only, runtime-only, or contract-affecting
- whether OpenAPI artifacts changed
- which validation command was run
- whether any local-port restriction required `--skip-http`

## Scope Guardrails

Do not treat the current repo as a production settlement system.

Still out of scope for this phase:
- real database backends
- real stablecoin settlement integration
- real provider billing integration
- trusted-surface deployment and production callback infrastructure
- on-chain enforcement and production ops concerns

Keep AFAL coherent first; expand scope only when the current Phase 1 surfaces stay stable.
