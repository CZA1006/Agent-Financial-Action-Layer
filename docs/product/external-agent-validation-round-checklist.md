# External Agent Validation Round Checklist

## Purpose

Use this checklist before sending any repo-external AFAL validation task to an external engineer.

Its job is simple:

- freeze the exact validation baseline
- ensure the engineer receives an extracted artifact, not an ambiguous repo view
- record enough metadata that AFAL can interpret the findings later

This checklist is intentionally operational.
If a line here cannot be filled in, do not start the round.

---

## Round Metadata

Fill this in before sending the handoff:

- Round ID:
- Validation owner:
- External engineer:
- Date sent:
- Expected response date:
- Validation mode:
  - `directed-internal-handoff`
  - `public-release-safe`

---

## Baseline Freeze

All of these must be pinned:

- Git commit SHA:
- Git tag, if any:
- Artifact type:
  - `internal-handoff`
  - `public-release-tarball`
- Artifact filename:
- Artifact build date:
- AFAL sandbox base URL:
- Provisioned `clientId`:
- Provisioned `subjectDid`:

If the engineer cannot tell exactly which AFAL baseline they used, the round is invalid.

---

## Preflight Checks

Run these against the pinned baseline before sending anything:

```bash
npm run typecheck
npm run test:mock
npm run accept:external-onboarding
npm run validate:external-agent-pilot-release-surfaces
npm run build:external-agent-pilot-live-handoff -- \
  --afal-base-url <reachable-afal-base-url> \
  --data-dir <live-sandbox-data-dir> \
  --output-root <handoff-output-root> \
  --client-id <client-id> \
  --tenant-id <tenant-id> \
  --agent-id <agent-id>
```

Record results:

- `typecheck`:
- `test:mock`:
- `accept:external-onboarding`:
- `validate:external-agent-pilot-release-surfaces`:
- `build:external-agent-pilot-live-handoff`:

Do not skip `accept:external-onboarding`.
That is the closest internal smoke test to the exact command-line path the external engineer will use.

Do not skip the live handoff builder for remote engineer rounds.
It is the liveness check that prevents sending a package pinned to an offline or local-only AFAL URL.

For live rounds, run the builder on the host that owns the AFAL SQLite data directory or point `--data-dir` at the same database used by the public AFAL server. A package generated from a different local database is invalid even if `AFAL_BASE_URL` is reachable.

---

## Sandbox Server Freeze

Record the exact server entrypoint used for this round:

- Server command:
- External client auth enabled:
- Trusted-surface service mode:
- Data directory:

Expected default for sandbox-facing validation:

```bash
npm run serve:sqlite-http
```

If you use anything else, write down why.

---

## Artifact Packaging

The engineer must receive an extracted artifact, not instructions to run from inside the AFAL monorepo.

Choose one:

### Mode A

- internal handoff directory generated:
- includes ready-to-use `.env`:
- includes provisioned bundle JSON:
- includes docs bundle:

### Mode B

- public release-safe tarball generated:
- includes `.env.template`:
- includes `bundle.template.json`:
- includes docs bundle:
- live signing key excluded:

If the deliverable still sits next to `backend/`, `agents/`, or other AFAL implementation directories, stop and rebuild the artifact correctly.

---

## Docs Set

Confirm the engineer received these files:

- `README.md`
- `docs/product/external-engineer-pilot-handoff.md`
- `docs/product/external-engineer-message-template.md`
- `docs/product/external-agent-sandbox-onboarding.md`
- `docs/product/external-agent-repo-external-validation-plan.md`
- `docs/product/external-pilot-findings-template.md`
- `docs/specs/external-agent-auth-contract.md`
- `docs/specs/receiver-settlement-callback-contract.md`

Optional but recommended:

- `docs/product/external-agent-pilot-repo-external-runbook.md`
- `docs/product/external-agent-pilot-release-quickstart.md`

If a doc is referenced in the task message but not shipped in the artifact baseline, stop and fix the package first.

---

## Bundle / Env Freeze

Record the exact values or source bundle used:

- `AFAL_BASE_URL`:
- `AFAL_CLIENT_ID`:
- `AFAL_SIGNING_KEY` source:
  - `directly included`
  - `shared separately`
  - `not included by design`
- `AFAL_MONETARY_BUDGET_REF`:
- `AFAL_RESOURCE_BUDGET_REF`:
- `AFAL_RESOURCE_QUOTA_REF`:
- `AFAL_PAYMENT_CALLBACK_URL`:
- `AFAL_RESOURCE_CALLBACK_URL`:

Also record whether the engineer is expected to:

- use a ready-to-run `.env`
- render `.env` from a bundle
- fill values manually

Only one of those should be true for a given round.

---

## External Engineer Instructions

Before sending, confirm the task message explicitly says:

- do not run from inside the AFAL monorepo root
- do not inspect internal runtime source to get unstuck
- do not write a fresh runtime first
- report the exact artifact / tarball / commit used
- send raw outputs for callback registration, readback, payment, and resource commands
- classify the result as `passed`, `passed-with-friction`, or `blocked`

If those instructions are missing, the round is underspecified.

---

## Evidence To Collect

Do not mark the round complete without:

- callback receiver startup output
- `callbacks:register` output
- `callbacks:get` or `callbacks:list` output
- `payment` output
- `resource` output
- one callback payload example if observed
- friction report
- OS and Node version
- exact artifact / tarball / commit used

---

## After The Round

Create or update:

- one round record:
  - for example `docs/product/external-agent-validation-round-00X.md`
- one triage summary
- one list of:
  - real current issues
  - stale baseline issues
  - operator process gaps

The goal is not just to collect complaints.
The goal is to separate:

- true product-surface problems
- packaging mistakes
- baseline ambiguity
- already-fixed regressions from an older round

---

## Exit Rule

Do not claim a new baseline has completed repo-external validation just because one engineer tried once.

Only upgrade the stage when:

1. the round was run from a pinned extracted artifact
2. the baseline was unambiguous
3. no critical blocker remained on that baseline
4. the external engineer completed the intended flow without hidden internal context

Until a baseline satisfies those conditions, that baseline remains:

- locally accepted external-agent sandbox

not yet:

- externally validated external-agent sandbox

Round 003 crossed this gate for the first project-level external validation. Keep using this checklist anyway: every new engineer, package, URL, or client is a new validation baseline and should be pinned before execution.
