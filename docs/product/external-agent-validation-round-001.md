# External Agent Validation Round 001

## Purpose

This document records the first blocked repo-external validation round and turns the raw external feedback into AFAL-side triage.

It should be read together with:

- [external-agent-repo-external-validation-plan.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-repo-external-validation-plan.md)
- [external-pilot-findings-template.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-pilot-findings-template.md)

---

## Outcome Summary

- Round: `001`
- Result: `blocked`
- Primary reason:
  the external engineer could not complete the flow without either reading internal runtime source or editing shipped fixtures

Short summary:

```text
The engineer hit a total blocker at callback registration, then both payment and resource requests failed on fixture/runtime mismatch. The run also exposed a process flaw: the validation happened from a monorepo-contained sample rather than a truly extracted artifact. Some reported issues match an older AFAL baseline and have already been corrected on current main, but the round still correctly signals that AFAL had not yet established a self-enforcing repo-external validation process.
```

---

## High-Level Triage

The feedback splits into two buckets.

### Bucket A: Real process / distribution gaps

These are valid even if some code-level issues have since been fixed:

- F0 missing validation-plan document in shipped material
- F5 the engineer validated from a monorepo-contained sample instead of a truly extracted artifact

These indicate AFAL did not yet freeze and ship a clean enough external-validation package for the round.

### Bucket B: Old baseline issues already corrected on current AFAL main

These findings are still useful evidence, but they should be classified as feedback against an earlier shipped baseline, not against the current repo head:

- F1 `serve:sqlite-http` not enabling external-client auth
- F2 payment fixture/runtime ID mismatch
- F3 resource fixture/runtime ID mismatch
- F4 provisioning example missing budget/quota refs
- F6 inconsistent auth posture across callback vs capability routes

Current main already contains fixes or test coverage that address those specific points.

---

## Finding Review

### F0

- Severity: `major`
- Category: `docs-gap`
- Status: `fixed locally, not yet shipped in the baseline the engineer used`

Assessment:

- valid finding
- the engineer was told to use `docs/product/external-agent-repo-external-validation-plan.md`
- that document was not actually present in the repo baseline they used

AFAL action:

- ship the validation-plan document as part of the normal docs set
- do not reference docs in handoff material before they exist in the published baseline

### F1

- Severity: `critical`
- Category: `onboarding`
- Status: `fixed on current main, likely tested against older baseline`

Assessment:

- the reported behavior is consistent with an older server entrypoint
- current `origin/main` already defines:
  `serve:sqlite-http = AFAL_EXTERNAL_CLIENT_AUTH=true node --import tsx/esm backend/afal/http/sqlite-server.ts`

AFAL evidence:

- [package.json](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/package.json)
- [sqlite-server.ts](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/backend/afal/http/sqlite-server.ts)

AFAL action:

- keep this fix
- make future external rounds use a pinned artifact or release, not an ambiguous repo state

### F2

- Severity: `critical`
- Category: `sample-kit`
- Status: `fixed on current main, likely tested against older baseline`

Assessment:

- valid feedback against the older shipped fixture
- current main uses `payint-0001` in the standalone fixture

AFAL evidence:

- [fixtures.ts](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/samples/standalone-external-agent-pilot/src/fixtures.ts)

### F3

- Severity: `critical`
- Category: `sample-kit`
- Status: `fixed on current main, likely tested against older baseline`

Assessment:

- valid feedback against the older shipped fixture
- current main uses `resint-0001` in the standalone fixture

AFAL evidence:

- [fixtures.ts](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/samples/standalone-external-agent-pilot/src/fixtures.ts)

### F4

- Severity: `major`
- Category: `docs-gap`
- Status: `fixed on current main, likely tested against older baseline`

Assessment:

- valid feedback against the older README snippet
- current main provisioning examples already include:
  `--monetary-budget-refs`
  `--resource-budget-refs`
  `--resource-quota-refs`

AFAL evidence:

- [README.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/README.md)

### F5

- Severity: `critical`
- Category: `release-distribution`
- Status: `real current process issue`

Assessment:

- valid
- the round was allowed to happen in a way that was not self-enforcing
- if the external engineer is inside the monorepo, they can always see internal source, which weakens the meaning of repo-external validation

AFAL action:

- future validation rounds must start from one of:
  - extracted internal handoff artifact
  - public release-safe tarball
- message template and handoff docs should explicitly forbid monorepo-root execution for repo-external validation

### F6

- Severity: `major`
- Category: `auth-signing`
- Status: `not reproduced on current main; likely tested against older baseline`

Assessment:

- current router and server tests explicitly cover auth enforcement on `requestPaymentApproval`
- current main should not be described as intentionally auth-inconsistent on those routes

AFAL evidence:

- [sqlite-server.test.ts](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/backend/afal/http/sqlite-server.test.ts)
- [router.test.ts](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/backend/afal/http/router.test.ts)

---

## What Round 001 Proves

Round 001 does not prove that current AFAL main is still broken in all the ways described.

It does prove three important things:

1. AFAL allowed an external-validation round to happen against an ambiguous baseline
2. AFAL had not yet made the repo-external boundary self-enforcing enough
3. external validation should be run against a pinned extracted artifact, not against a loosely described repo checkout

That is a valuable signal.

---

## Required Fixes Before Round 002

1. Ship the referenced validation-plan document in the published baseline
2. Require the external engineer to run from an extracted artifact, not from inside the monorepo
3. Pin the exact validation baseline:
   - git commit or tag
   - artifact name
   - package type
4. Re-send the task using the stricter execution message
5. Record the artifact identifier and expected docs in the round metadata

---

## Recommendation For Round 002

Round 002 should use:

- one extracted handoff artifact or one release-safe tarball
- one pinned AFAL commit or release tag
- one explicit instruction:
  do not validate from inside the monorepo

The goal for Round 002 is not to add new features.
The goal is to determine whether the corrected shipped surface is externally consumable when the baseline is actually controlled.
