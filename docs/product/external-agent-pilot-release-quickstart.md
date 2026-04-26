# External Agent Pilot Release Quickstart

## Purpose

This is the shortest operator-facing entrypoint for AFAL external-agent pilot distribution.

Use it when you already understand the repo and just need the exact commands for one of these cases:

1. send one live sandbox handoff package to a specific engineer
2. build a release-safe public package
3. publish a public GitHub Release from a tag

If you need the full policy and safety rationale, read:

- [external-agent-pilot-release-handbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-release-handbook.md)
- [staging-sandbox-operator-runbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/staging-sandbox-operator-runbook.md)

---

## Path 1: Internal Handoff To One Engineer

Use this when:

- the recipient is known
- AFAL team is provisioning a real sandbox client for them
- the package should run immediately with a ready-to-use `.env`

Run:

```bash
npm run typecheck
npm run test:mock
npm run accept:external-onboarding
npm run validate:external-agent-pilot-release-surfaces
npm run build:external-agent-pilot-live-handoff -- \
  --afal-base-url https://replace-with-reachable-afal-sandbox-url \
  --output-root dist/round-002-live-handoff \
  --client-id client-round-002-001 \
  --tenant-id tenant-round-002-001 \
  --agent-id agent-round-002-001
```

Deliver:

- `dist/round-002-live-handoff/external-agent-pilot-handoff/`
- or `dist/round-002-live-handoff/external-agent-pilot-handoff.tar.gz`

The live handoff command refuses `127.0.0.1` / `localhost` by default and pings the AFAL base URL before packaging.
Use `--allow-local` only for local operator drills, not for external validation.

Do not:

- upload this package to a public GitHub Release
- share it outside the intended engineer or partner team

Reason:

- it contains a live provisioned sandbox bundle
- it contains a ready-to-use `.env`

---

## Path 2: Build A Public Release-Safe Package

Use this when:

- you want a reusable downloadable package
- you do not want to ship any live signing key
- recipients should request a real bundle separately

Run:

```bash
npm run typecheck
npm run test:mock
npm run validate:external-agent-pilot-release-surfaces
npm run build:external-agent-pilot-public-release
```

Outputs:

- `dist/external-agent-pilot-public-release/external-agent-pilot-public-release/`
- `dist/external-agent-pilot-public-release/external-agent-pilot-public-release.tar.gz`

Expected package shape:

- includes `pilot/`
- includes docs
- includes `bundle.template.json`
- includes `.env.template`
- does not include a live `.env`
- does not include a real signing key

---

## Path 3: Publish A Public GitHub Release

Use this when:

- Path 2 is already green
- you want GitHub to attach the release-safe tarball to a tagged release

First verify locally:

```bash
npm run build:external-agent-pilot-public-release
```

Then tag and push:

```bash
git tag external-agent-pilot-v0.1.0
git push origin external-agent-pilot-v0.1.0
```

Tag rule:

- must match `external-agent-pilot-v*`

Workflow:

- [external-agent-pilot-release.yml](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/.github/workflows/external-agent-pilot-release.yml)

Expected result:

- GitHub Actions builds the public release-safe package
- GitHub Actions uploads the build artifact
- GitHub Actions creates a GitHub Release for that tag
- the release includes `external-agent-pilot-public-release.tar.gz`

---

## Fast Decision Rule

Use this rule when deciding which path to run:

- if the package contains a real provisioned client, use Path 1
- if the package is intended for public download, use Path 2 or Path 3
- if you are unsure, do not publish until `npm run validate:external-agent-pilot-release-surfaces` is green

---

## Minimum Safety Check

Run this before every handoff or release:

```bash
npm run validate:external-agent-pilot-release-surfaces
```

That command proves:

- internal handoff still contains a ready-to-use `.env`
- public release still uses template-only credentials
- public release does not accidentally contain a live signing key

---

## Related Docs

- [external-agent-pilot-release-handbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-release-handbook.md)
- [external-agent-pilot-repo-external-runbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-repo-external-runbook.md)
- [external-engineer-pilot-handoff.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-engineer-pilot-handoff.md)
- [staging-sandbox-operator-runbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/staging-sandbox-operator-runbook.md)
