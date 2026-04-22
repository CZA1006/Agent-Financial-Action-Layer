# CI Merge Gate

## Purpose

This document defines the current merge gate for AFAL's Phase 1 runtime repo.

The point is simple:

- CI should block regressions on the public integration surface
- branch protection should require the checks that represent today's actual quality bar
- contributors should not need to guess which checks are mandatory before merge

This is especially important now that AFAL has:

- a sandbox-facing external-client auth boundary
- a standalone external-agent pilot kit
- a repo-contained second-engineer onboarding smoke path

---

## Current Required Checks

The current GitHub Actions workflow lives at:

- [`.github/workflows/ci.yml`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/.github/workflows/ci.yml)

The checks that should be marked as **required** in branch protection are:

1. `typecheck`
2. `test-mock`
3. `external-onboarding`

What each one covers:

1. `typecheck`
   Ensures the TypeScript surface still compiles without type regressions.
2. `test-mock`
   Covers the repo's main automated test suite across runtime, API, HTTP, harness, notification, and OpenAPI behavior.
3. `external-onboarding`
   Replays the repo-contained second-engineer onboarding path:
   start sandbox, provision client, run standalone callback receiver, register callbacks, read them back, then submit one payment and one resource request.

This third check is the one that protects against the exact class of regressions surfaced by external engineer pilot feedback.

---

## Merge Policy

For the current Phase 1 repo, the merge rule should be:

- do not merge while any required check is failing
- do not merge while any required check is still pending
- do not merge if a PR changes onboarding, public auth, provisioning, callback registration, or standalone samples without `external-onboarding` green
- do not merge if a PR changes SQLite runtime or HTTP behavior without `accept:sqlite` being run locally, even if that command is not yet a required CI check

In other words:

- CI protects the minimum shared bar
- local acceptance still covers the broader integration matrix

---

## GitHub UI Setup

Configure branch protection on `main` with these settings:

1. Go to `Settings` -> `Branches` -> `Add branch protection rule`
2. Branch name pattern: `main`
3. Enable `Require a pull request before merging`
4. Enable `Require status checks to pass before merging`
5. Add these required checks:
   - `typecheck`
   - `test-mock`
   - `external-onboarding`
6. Enable `Require branches to be up to date before merging`

Recommended additional settings:

- `Require conversation resolution before merging`
- `Do not allow bypassing the above settings`
- `Restrict deletions`

Use judgment on `Require approvals`.
For a solo-maintained phase, that may slow iteration more than it helps.
For a multi-engineer external integration phase, it becomes more justified.

---

## GitHub CLI Setup

If you use GitHub CLI with authenticated repo-admin access, this is the most direct setup command:

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/CZA1006/Agent-Financial-Action-Layer/branches/main/protection \
  -f required_status_checks.strict=true \
  -f enforce_admins=true \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -F required_status_checks.contexts[]="typecheck" \
  -F required_status_checks.contexts[]="test-mock" \
  -F required_status_checks.contexts[]="external-onboarding" \
  -f restrictions=
```

If the repo owner does not want admin enforcement yet, change:

```text
enforce_admins=true
```

to:

```text
enforce_admins=false
```

You should run this only after the workflow has executed at least once on GitHub, so the status check names already exist.

## Repo Script Setup

This repo also includes a one-shot helper script:

- [`scripts/configure-branch-protection.sh`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/scripts/configure-branch-protection.sh)

Usage:

```bash
GITHUB_TOKEN=<repo-admin-token> \
bash scripts/configure-branch-protection.sh
```

Optional overrides:

```bash
GITHUB_TOKEN=<repo-admin-token> \
REPO_OWNER=CZA1006 \
REPO_NAME=Agent-Financial-Action-Layer \
BRANCH_NAME=main \
ENFORCE_ADMINS=true \
CHECKS_JSON='["typecheck","test-mock","external-onboarding"]' \
bash scripts/configure-branch-protection.sh
```

This script uses the same required checks documented above and calls the GitHub REST branch protection endpoint directly through `curl`.

---

## When To Update This Gate

Update this document and the branch protection rule whenever one of these changes:

- a new CI workflow replaces `ci.yml`
- a required job is renamed
- the external onboarding smoke is superseded by a stronger public-surface acceptance path
- `accept:sqlite` or another broader acceptance path becomes cheap enough to run in CI on every PR

Do not silently rename CI jobs without updating this file.
That creates branch protection drift and blocks merges for avoidable reasons.

---

## Near-Term Recommendation

Current recommended posture:

1. keep `typecheck`, `test-mock`, and `external-onboarding` as required GitHub checks
2. keep `accept:sqlite` as a documented local merge gate
3. revisit whether `accept:sqlite` should enter CI after measuring runtime and flake rate on GitHub-hosted runners

That is the right balance for the repo today:

- strict enough to protect the public integration boundary
- still light enough to keep iteration practical
