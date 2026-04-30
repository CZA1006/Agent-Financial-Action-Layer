# External Agent Pilot Release Handbook

## Purpose

This handbook defines how the AFAL team should distribute the external-agent pilot package.

It exists because AFAL now has two different distribution modes:

- an internal handoff artifact for a specific external engineer
- a public release-safe package for broader distribution
- an AFAL payment MCP preview package for Claude Code / MCP-capable agent testing

Those are not interchangeable.

The internal handoff artifact can contain a live provisioned sandbox bundle and a real signing key.
The public release package must not.

---

## Distribution Modes

### 1. Internal Handoff Artifact

Use this when:

- one named engineer or partner team is testing against a specific AFAL sandbox
- AFAL team is intentionally provisioning a client for them
- the recipient should be able to run immediately without waiting for extra secrets

Build command:

```bash
npm run build:external-agent-pilot-handoff-artifact
```

Primary outputs:

- `dist/external-agent-pilot-release/external-agent-pilot-handoff/`
- `dist/external-agent-pilot-release/afal-external-bundle.json`
- `dist/external-agent-pilot-release/external-agent-pilot-handoff.tar.gz`

Workflow:

- [external-agent-handoff-artifact.yml](.github/workflows/external-agent-handoff-artifact.yml)

Security posture:

- contains a live provisioned sandbox client bundle
- contains a ready-to-use `.env`
- should be shared only with the intended recipient
- should not be published as a GitHub Release asset

### 2. Public Release Package

Use this when:

- AFAL team wants a repeatable public-facing pilot package
- the package should be safe to attach to a GitHub Release
- recipients must still request their own provisioned sandbox bundle

Build command:

```bash
npm run build:external-agent-pilot-public-release
```

Primary outputs:

- `dist/external-agent-pilot-public-release/external-agent-pilot-public-release/`
- `dist/external-agent-pilot-public-release/external-agent-pilot-public-release.tar.gz`

Workflow:

- [external-agent-pilot-release.yml](.github/workflows/external-agent-pilot-release.yml)

Security posture:

- contains only `bundle.template.json`
- contains only `.env.template`
- contains no live signing key
- is safe to publish as a GitHub Release asset

---

## Operator Rule

Use this decision rule every time:

1. if the package contains a real provisioned client, use internal handoff only
2. if the package is meant to be publicly downloadable, use the public release package only
3. never attach the internal handoff artifact to a GitHub Release
4. never put a live signing key in a tag-triggered release workflow

If there is any uncertainty, default to the public release package and send the real bundle separately.

---

## Recommended Release Process

### Internal Engineer-To-Engineer Handoff

Run:

```bash
npm run typecheck
npm run test:mock
npm run accept:external-onboarding
npm run build:external-agent-pilot-handoff-artifact
```

Then verify:

- `dist/external-agent-pilot-release/external-agent-pilot-handoff/.env` exists
- `dist/external-agent-pilot-release/afal-external-bundle.json` exists
- the bundle contains the expected `clientId`, `subjectDid`, and refs
- the recipient is the intended engineer or team

Then send only through a direct channel:

- direct file share
- private message
- private ticket attachment
- encrypted internal storage

Do not publish this artifact on GitHub.

### Public Release

Run:

```bash
npm run typecheck
npm run test:mock
npm run build:external-agent-pilot-public-release
```

Then verify:

- `bundle.template.json` uses placeholders
- `.env.template` uses placeholders
- no live signing key appears anywhere in the package
- the README inside the package states that a provisioned bundle must be requested from AFAL team

Then create a release tag:

```bash
git tag external-agent-pilot-v0.1.0
git push origin external-agent-pilot-v0.1.0
```

That tag pattern triggers:

- [external-agent-pilot-release.yml](.github/workflows/external-agent-pilot-release.yml)

Expected result:

- a GitHub Release is created for the tag
- the release includes `external-agent-pilot-public-release.tar.gz`

---

## Tag Naming Rule

Use this tag format:

```text
external-agent-pilot-vX.Y.Z
```

Examples:

- `external-agent-pilot-v0.1.0`
- `external-agent-pilot-v0.1.1`
- `external-agent-pilot-v0.2.0`

Do not use:

- `v0.1.0`
- `pilot-v0.1.0`
- `external-agent-v0.1.0`

---

## AFAL Payment MCP Preview Package

Use this when:

- a tester wants Claude Code or another MCP-capable agent to discover AFAL payment tools
- the tester has a separately provisioned AFAL external-client signing key
- the tester should not need to run internal harness commands manually

Current entrypoint:

```bash
afal-payment-mcp
```

Current repo-local command:

```bash
npm run mcp:afal-payment
```

Current quickstart:

- [AFAL Payment MCP Preview Release Quickstart](afal-payment-mcp-release-quickstart.md)

Recommended preview release validation:

```bash
npm run typecheck
npm run test:mock
npm pack
```

Then perform a live Claude Code MCP acceptance run against staging:

```text
Pay 0.01 USDC to the fraud detection payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94, then only deliver the service if AFAL provider gate passes.
```

Release notes must include:

- required env vars: `AFAL_BASE_URL`, `AFAL_CLIENT_ID`, `AFAL_SIGNING_KEY`, `AFAL_WALLET_DEMO_URL`, `AFAL_PAYMENT_MODE`
- Claude Code `claude mcp add-json` example
- sandbox reset/provision instructions
- testnet-only disclaimer
- latest acceptance tx hash
- explicit statement that no private wallet key belongs in Claude Code or MCP config

Security posture:

- release asset must not contain a live `AFAL_SIGNING_KEY`
- release asset must not contain an agent wallet private key
- signing key must be provisioned per tester or copied from the operator-run staging output
- agent wallet private key remains only in the VM payment rail service environment

Recommended tag format:

```text
afal-payment-mcp-vX.Y.Z-preview.N
```

Example:

```text
afal-payment-mcp-v0.1.0-preview.1
```

The workflow is intentionally scoped to the explicit `external-agent-pilot-v*` pattern.

---

## Pre-Release Checklist

Before any release or handoff, verify:

- `npm run typecheck` is green
- `npm run test:mock` is green
- `npm run validate:external-agent-pilot-release-surfaces` is green
- docs match the current artifact behavior
- the artifact contains the expected files
- the artifact type matches the intended distribution mode

Before public release specifically, verify:

- no live `AFAL_SIGNING_KEY` appears in any packaged file
- no live `clientId` intended for one engineer appears in the package
- no ready-to-use `.env` is included

Before internal handoff specifically, verify:

- the recipient is known
- the provisioned client scope is correct
- the correct sandbox base URL is present
- callback URLs are appropriate for the target environment
- the staging sandbox URL passes the live handoff preflight

---

## Rollback And Revocation

If the wrong internal handoff artifact is shared:

1. provision a replacement client
2. revoke or stop using the exposed client
3. invalidate the prior handoff package
4. notify the recipient which package is now authoritative

If a public release package is incorrect but contains no secrets:

1. build a corrected package
2. publish a new tag
3. note the superseding version in the release notes

If a public release ever contains a live signing key, treat it as a credential leak:

1. revoke the affected client immediately
2. remove or supersede the release
3. rotate any related credentials
4. document the incident internally

---

## Relationship To Other Docs

Use this handbook together with:

- [staging-sandbox-operator-runbook.md](docs/product/staging-sandbox-operator-runbook.md)
- [external-agent-pilot-repo-external-runbook.md](docs/product/external-agent-pilot-repo-external-runbook.md)
- [external-engineer-pilot-handoff.md](docs/product/external-engineer-pilot-handoff.md)
- [external-agent-sandbox-onboarding.md](docs/product/external-agent-sandbox-onboarding.md)
- [ci-merge-gate.md](docs/product/ci-merge-gate.md)

Role split:

- this handbook is for AFAL operators and maintainers
- the onboarding docs are for external engineers consuming AFAL
- the quickstart is the shortest day-to-day operator entrypoint:
  [external-agent-pilot-release-quickstart.md](docs/product/external-agent-pilot-release-quickstart.md)

---

## Current Recommendation

For the repo today:

1. use internal handoff artifacts for active second-engineer pilots
2. use public release packages for broader discovery and reproducible downloads
3. keep the credential-bearing handoff artifact out of GitHub Releases
4. keep the public release path template-only until AFAL has a stronger hosted provisioning story

That keeps distribution practical without weakening the sandbox boundary.
