# Contributing

AFAL is currently in a Phase 1 integration-ready runtime stage with:

- durable local mode
- SQLite-backed integration mode for execution-critical state
- persistent approval callback and resume flow
- bilateral payment/resource runtime-agent harnesses over the AFAL HTTP contract
- receiver callback outbox, worker control, and admin audit routes

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
- bilateral payment/resource callback harnesses, when enabled
- notification admin demo over the SQLite HTTP surface, when enabled
- external adapter retry demo over independent payment/provider HTTP stubs, when enabled
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
- `npm run demo:notification-admin`
  Use when you changed notification outbox delivery, worker control, operator auth, or admin audit behavior and want an end-to-end operator-flow verification.
- `npm run demo:external-adapters-retry`
  Use when you changed payment-rail/provider external adapter behavior and want a network-shaped retry-path verification.
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

## Merge Gate

The current repo merge gate is documented in:

- [docs/product/ci-merge-gate.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/ci-merge-gate.md)

Current required CI checks for `main` should be:

- `typecheck`
- `test-mock`
- `external-onboarding`

Local merge expectation remains broader than CI:

- run `npm run accept:sqlite` for SQLite runtime, HTTP, callback, bilateral harness, notification worker, or adapter-boundary changes

Do not treat a green PR as sufficient if the change obviously touches a broader integration slice than the required CI jobs cover.

## Fast Experiment vs Protected Surface

Not every change in this repo needs the same level of ceremony during development.
The right boundary is:

- move fast on feature branches for internal experiments
- be strict before anything reaches `main`

### Safe To Explore Quickly On A Feature Branch

These are reasonable to prototype quickly before full PR polish:

- new internal demo scripts
- new experimental harnesses
- roadmap, design, or brainstorming docs
- exploratory sample code that is not part of the canonical onboarding path
- one-off debugging or data-inspection scripts
- draft SDK or package ideas that are not yet wired into onboarding or CI

These changes are lower risk because they do **not** directly redefine how an external engineer consumes AFAL.

### Must Be Treated As Protected Surface

The following areas should be treated as contract-bearing surfaces.
If you change them, assume the change must go through PR + required checks:

- `backend/afal/http/`
- `backend/afal/clients/`
- `samples/standalone-external-agent-pilot/`
- provisioning and onboarding scripts under `scripts/`
- export / repo-external skeleton scripts under `scripts/`
- `.github/workflows/`
- `.github/pull_request_template.md`
- external-facing product docs under `docs/product/`
- external-facing specs and examples under `docs/specs/` and `docs/examples/http/`

Why these are stricter:

- they affect the public integration boundary
- they affect the external engineer onboarding path
- they affect what `main` means as a handoff-ready branch

### Simple Decision Rule

Treat a change as protected surface if **any** of these are true:

1. it changes how an external engineer configures `.env`, auth, requests, callbacks, or action-status reads
2. it changes the standalone pilot or exported skeleton behavior
3. it changes OpenAPI, HTTP examples, or external-facing docs
4. it changes CI, onboarding smoke, or merge-gate behavior
5. if broken, it would make `main` unreliable as the external integration baseline

If any answer is yes, do not treat the change as a casual direct-to-main style update.
Use a feature branch, open a PR, and wait for the required checks.

## Scope Guardrails

Do not treat the current repo as a production settlement system.

Still out of scope for this phase:
- real database backends
- real stablecoin settlement integration
- real provider billing integration
- trusted-surface deployment and production callback infrastructure
- on-chain enforcement and production ops concerns

Keep AFAL coherent first; expand scope only when the current Phase 1 surfaces stay stable.
