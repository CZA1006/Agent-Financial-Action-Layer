# External Agent Validation Round 002

## Status

- Round: `002`
- Status: `attempted once, blocked at artifact delivery; restart required`
- Recommended mode: `directed-internal-handoff`
- Validation owner: `AFAL team`
- External engineer: `TBD`

---

## Pinned Baseline

- Git commit SHA: `ff6bcc4e7fad8bf1d0c1c8e642813c489c4fc066`
- Git short SHA: `ff6bcc4`
- Baseline date: `2026-04-24T03:37:59Z`

This round is intentionally pinned to one repo state.
Do not send a handoff for Round 002 from an unpinned later checkout without updating this document.

---

## Why Round 002 Exists

Round 001 produced a valid `blocked` signal, but it mixed together:

- true process problems in AFAL's repo-external validation flow
- findings against an older sandbox baseline

Round 002 is meant to answer a narrower and more useful question:

- can an external engineer consume the corrected AFAL external surface from a pinned extracted artifact without hidden repo context

Reference:

- [external-agent-validation-round-001.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-001.md)
- [external-agent-repo-external-validation-plan.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-repo-external-validation-plan.md)
- [external-agent-validation-round-checklist.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-checklist.md)

---

## Preflight Results

The following checks were run against the pinned baseline:

```bash
npm run typecheck
npm run test:mock
npm run accept:external-onboarding -- --artifacts-root /tmp/afal-round-002-onboarding-artifacts
npm run validate:external-agent-pilot-release-surfaces -- --output-root /tmp/afal-round-002-release-surfaces-v2
```

Recorded result:

- `typecheck`: passed
- `test:mock`: passed
- `accept:external-onboarding`: passed
- `validate:external-agent-pilot-release-surfaces`: passed

Important interpretation:

- the repo-contained onboarding smoke path is currently green
- the release-surface guardrail is currently green
- both internal handoff and public release packages now include the validation-plan and round-checklist docs that were missing from the earlier external round baseline

---

## Restart Trigger

The first Round 002 send attempt did not fail on AFAL runtime behavior.
It failed earlier at the logistics layer:

- the external engineer did not actually receive the handoff tarball in an accessible local path
- the engineer also flagged that no tunnel tool was preinstalled in their environment

This means Round 002 is not yet a valid product-surface result.
It needs a controlled restart from a correctly delivered artifact.

Current interpretation:

- artifact-delivery failure: `blocker`
- tunnel-tool prerequisite disclosure: `medium`

---

## External Feedback From First Restart Attempt

After the artifact was re-sent, the external engineer reported a second blocked attempt.

The feedback splits into two groups.

### Group A: AFAL-controlled product or packaging issues

- `F1` callback receiver command in the round prompt did not match the shipped package layout
- `F2` `.env` lived at the handoff root while scripts were run from `pilot/`
- `F3` the round prompt and bundled runbook conflicted
- `F4` bundled docs and manifest still exposed absolute maintainer-machine paths

These are valid AFAL-side issues and should be treated as real consumer-surface friction.

### Group B: External runtime prerequisites or temporary live-host issues

- `B1` the pinned `AFAL_BASE_URL` was offline at the time of the engineer retry
- `B2` `ngrok` was installed but unusable without verified account plus authtoken

These do not invalidate the earlier AFAL-side fixes, but they do show that:

- a temporary `ngrok-free` URL is too fragile to act as a durable pinned baseline
- tunnel-tool assumptions must be explicit in the handoff itself

Current interpretation:

- live sandbox availability: `critical`
- tunnel prerequisite disclosure: `major`
- package layout / command consistency: `major`
- path sanitization: `minor`

---

## Local Fixes Applied After External Feedback

The repo has now been updated locally to reduce the AFAL-controlled friction:

1. the standalone pilot now exposes:
   - `npm run preflight`
   - `npm run tunnel:start`
2. `.env` loading now walks parent directories, so running from `pilot/` still finds the handoff-root `.env`
3. packaged handoff output now includes `.env` inside both:
   - handoff root
   - `pilot/`
4. packaged docs now rewrite maintainer absolute links to packaged relative links
5. packaged manifests now use artifact-relative paths instead of maintainer local filesystem paths
6. the runbook and message template are now aligned around:
   - `cd pilot`
   - `npm install`
   - `npm run preflight`
   - `npm run callback:receiver`
   - `npm run tunnel:start`

These fixes address the repo-controlled portion of the second blocked attempt.

---

## Generated Preflight Artifacts

### Local Internal Handoff Validation Output

- output root:
  `/tmp/afal-round-002-release-surfaces-v2/internal-handoff`
- bundle JSON:
  `/tmp/afal-round-002-release-surfaces-v2/internal-handoff/afal-external-bundle.json`
- handoff directory:
  `/tmp/afal-round-002-release-surfaces-v2/internal-handoff/external-agent-pilot-handoff`
- handoff archive:
  `/tmp/afal-round-002-release-surfaces-v2/internal-handoff/external-agent-pilot-handoff.tar.gz`

Included docs confirmed in the packaged manifest:

- `docs/product/external-agent-pilot-repo-external-runbook.md`
- `docs/product/external-engineer-pilot-handoff.md`
- `docs/product/external-engineer-message-template.md`
- `docs/product/external-agent-repo-external-validation-plan.md`
- `docs/product/external-agent-validation-round-checklist.md`
- `docs/product/external-pilot-findings-template.md`
- `docs/specs/external-agent-auth-contract.md`
- `docs/specs/receiver-settlement-callback-contract.md`

### Local Public Release Validation Output

- output root:
  `/tmp/afal-round-002-release-surfaces-v2/public-release`
- package directory:
  `/tmp/afal-round-002-release-surfaces-v2/public-release/external-agent-pilot-public-release`
- package archive:
  `/tmp/afal-round-002-release-surfaces-v2/public-release/external-agent-pilot-public-release.tar.gz`

The public release-safe package also now includes:

- `docs/product/external-agent-repo-external-validation-plan.md`
- `docs/product/external-agent-validation-round-checklist.md`

---

## Current Limit

The local preflight handoff artifact is not yet the final external-send artifact.

Reason:

- it was provisioned against `http://127.0.0.1:3213`
- it uses demo preflight client values
- that base URL is valid for operator-side local verification, not for a remote external engineer

So the current state is:

- packaging path verified
- docs set verified
- local onboarding path verified
- final externally shareable bundle still needs to be reprovisioned against a reachable AFAL sandbox URL

---

## Required Step Before Sending

Before sending Round 002 to an external engineer, AFAL team must rebuild the internal handoff artifact with:

1. one reachable AFAL sandbox base URL
2. one fresh provisioned client bundle for that engineer
3. one explicit external callback URL plan

Expected command shape:

```bash
npm run build:external-agent-pilot-live-handoff -- \
  --output-root <handoff-output-root> \
  --afal-base-url <reachable-afal-base-url> \
  --client-id <provisioned-client-id> \
  --tenant-id <tenant-id> \
  --agent-id <agent-id>
```

The live handoff command performs a liveness preflight before packaging and refuses
`127.0.0.1` / `localhost` unless `--allow-local` is passed for an operator-only drill.

If the engineer is remote, do not send a bundle that still points at `127.0.0.1`.

Also, before declaring the round started, AFAL team must confirm:

1. the actual tarball or extracted directory has been transferred to the engineer
2. the engineer knows the exact local path of that artifact
3. the engineer has one tunnel tool available for callback exposure, or explicit install instructions

---

## Recommended Next Action

The next concrete step is not more documentation.
It is one operator action:

- rebuild the Round 002 internal handoff artifact against the real external sandbox URL

After that:

1. fill the remaining fields in
   [external-agent-validation-round-checklist.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-checklist.md)
2. send the artifact and stricter task message
3. require the engineer to report:
   - exact artifact used
   - raw command outputs
   - `passed`, `passed-with-friction`, or `blocked`
