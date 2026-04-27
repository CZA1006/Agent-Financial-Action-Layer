# External Agent Pilot Repo-External Runbook

## Purpose

This runbook defines the cleanest path to validate AFAL from a separate repo or separate workspace using the exported standalone pilot skeleton.

Use this after:

- `npm run accept:external-onboarding` is green
- `npm run validate:external-agent-pilot-export` is green
- a sandbox client has been provisioned

This runbook is stricter than the in-repo smoke tests because it removes the monorepo as hidden support infrastructure.

---

## AFAL Team Preparation

From the AFAL repo root:

1. Export the skeleton:

```bash
npm run export:external-agent-pilot
```

2. Provision a sandbox client bundle:

```bash
npm run provision:external-agent-sandbox -- \
  --data-dir ./.afal-sqlite-http-data \
  --client-id client-demo-001 \
  --tenant-id tenant-demo-001 \
  --agent-id agent-demo-001 \
  --subject-did did:afal:agent:payment-agent-01 \
  --mandate-refs mnd-0001,mnd-0002 \
  --monetary-budget-refs budg-money-001 \
  --resource-budget-refs budg-res-001 \
  --resource-quota-refs quota-001 \
  --payment-payee-did did:afal:agent:fraud-service-01 \
  --resource-provider-did did:afal:institution:provider-openai \
  --output /tmp/afal-external-bundle.json
```

3. Render the bundle into `.env` text for the external repo:

```bash
node scripts/render-external-agent-bundle-env.mjs \
  --input /tmp/afal-external-bundle.json \
  --output /tmp/afal-external-agent.env
```

4. Package one complete handoff directory:

```bash
npm run package:external-agent-pilot-handoff -- \
  --bundle-json /tmp/afal-external-bundle.json \
  --output-dir dist/external-agent-pilot-handoff
```

5. For a local CI-style artifact, build the release artifact:

```bash
npm run build:external-agent-pilot-handoff-artifact
```

For a real external engineer round, use the live handoff builder instead.
It verifies the public AFAL base URL before creating the credential-bearing package:

```bash
npm run build:external-agent-pilot-live-handoff -- \
  --afal-base-url https://replace-with-reachable-afal-sandbox-url \
  --data-dir /srv/afal/round-002/sqlite-data \
  --output-root dist/round-002-live-handoff \
  --client-id client-round-002-001 \
  --tenant-id tenant-round-002-001 \
  --agent-id agent-round-002-001
```

The live handoff builder refuses `127.0.0.1` / `localhost` by default.
Use `--allow-local` only for local operator drills.

Important: run the live handoff builder on the host that owns the live AFAL
SQLite data directory, or point `--data-dir` at a shared database used by the
deployed sandbox. Do not build a live handoff from a maintainer laptop temp
directory while the public sandbox reads a different database.

Send the external engineer either:

- `dist/external-agent-pilot-handoff/`
- `dist/external-agent-pilot-release/external-agent-pilot-handoff/`
- `dist/round-002-live-handoff/external-agent-pilot-handoff/`

CI-style artifact output:

- `dist/external-agent-pilot-release/external-agent-pilot-handoff/`
- `dist/external-agent-pilot-release/afal-external-bundle.json`
- `dist/external-agent-pilot-release/external-agent-pilot-handoff.tar.gz`
- `dist/round-002-live-handoff/external-agent-pilot-handoff.tar.gz`

GitHub Actions also uploads this artifact on `main` through:

- [`external-agent-handoff-artifact.yml`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/.github/workflows/external-agent-handoff-artifact.yml)

Important boundary:

- this handoff artifact contains a live provisioned sandbox bundle
- it is suitable for direct AFAL-team-to-engineer transfer
- it is not the right asset to publish as a public GitHub release

If you want a release-safe public package instead:

```bash
npm run build:external-agent-pilot-public-release
```

Public release output:

- `dist/external-agent-pilot-public-release/external-agent-pilot-public-release/`
- `dist/external-agent-pilot-public-release/external-agent-pilot-public-release.tar.gz`

GitHub can publish that release-safe tarball on tags matching `external-agent-pilot-v*` through:

- [`external-agent-pilot-release.yml`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/.github/workflows/external-agent-pilot-release.yml)
- [`external-agent-pilot-release-handbook.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-release-handbook.md)

or, if they prefer the pieces separately:

- the exported skeleton directory
- the rendered `.env`
- the AFAL sandbox base URL
- the handoff docs listed below

---

## Run From Extracted Archive

In a separate workspace outside the AFAL monorepo:

1. extract the handoff package outside the AFAL monorepo
2. `cd pilot`
3. run:

```bash
npm install
npx tsc --noEmit
npm run preflight
```

`npm run preflight` must pass both checks:

- AFAL base URL is reachable
- bundled external-client credentials are accepted by AFAL

4. start the callback receiver:

```bash
npm run callback:receiver
```

5. in a second terminal, expose the callback receiver:

```bash
npm run tunnel:start
```

Preferred tunnel rule:

- use `cloudflared` as the primary path for anonymous HTTPS callback tunnels
- if using `ngrok`, make sure the engineer already has a verified account and configured authtoken

macOS install:

```bash
brew install cloudflared
```

6. update the callback URL values in `.env`

7. then run:

```bash
npm run callbacks:register
npm run callbacks:get
npm run callbacks:list
npm run payment
npm run resource
```

Expected outputs:

- `callbacks:register`, `callbacks:get`, and `callbacks:list` return `ok: true`
- `payment` returns `pending-approval` and reserves `45.00 USDC`
- `resource` returns `pending-approval` and reserves `100000` tokens

Re-run constraint:

- this pilot intentionally stops at `pending-approval`; trusted-surface approval and settlement are outside this repo-external smoke path
- pending payment/resource reservations remain in the shared sandbox state until a settlement or explicit sandbox reset occurs
- repeated runs against the same shared budget/quota can accumulate reservations and eventually change later outputs
- for clean repeated validation, provision a fresh client and prefer a fresh sandbox data directory or operator-reset state

8. save:

- callback registration output
- callback readback output
- payment output
- resource output
- one callback payload if present

---

## Required Handoff Docs

The external engineer should receive these docs with the skeleton:

- [`docs/product/external-engineer-pilot-handoff.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-engineer-pilot-handoff.md)
- [`docs/product/external-engineer-message-template.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-engineer-message-template.md)
- [`docs/product/external-agent-repo-external-validation-plan.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-repo-external-validation-plan.md)
- [`docs/product/external-agent-validation-round-checklist.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-checklist.md)
- [`docs/product/external-pilot-findings-template.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-pilot-findings-template.md)
- [`docs/specs/external-agent-auth-contract.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/external-agent-auth-contract.md)
- [`docs/specs/receiver-settlement-callback-contract.md`](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/receiver-settlement-callback-contract.md)

---

## Branch Strategy

Use this branch strategy while the exported skeleton is still evolving quickly:

1. keep AFAL runtime changes on one branch
2. keep external skeleton/export changes on a separate branch
3. merge runtime changes first if they affect onboarding or request semantics
4. then regenerate and revalidate the exported skeleton
5. only then hand it to another engineer

Reason:

- it keeps runtime regressions separate from export hygiene regressions
- it makes external pilot findings easier to triage

---

## Success Criteria

The repo-external pilot is successful when:

- the external repo installs without monorepo context
- the external repo compiles without monorepo context
- callback registration succeeds
- payment request returns `pending-approval`
- resource request returns `pending-approval`
- the engineer can report friction without needing hidden internal context
