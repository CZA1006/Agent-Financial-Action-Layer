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

Send the external engineer either:

- `dist/external-agent-pilot-handoff/`

or, if they prefer the pieces separately:

- the exported skeleton directory
- the rendered `.env`
- the AFAL sandbox base URL
- the handoff docs listed below

---

## Suggested Separate-Repo Flow

In a separate workspace:

1. copy `dist/external-agent-pilot-handoff/pilot/` into a fresh repo
2. copy `dist/external-agent-pilot-handoff/.env` into the repo root
3. keep `dist/external-agent-pilot-handoff/docs/` available as reference material
4. run:

```bash
npm install
npx tsc --noEmit
```

5. start the callback receiver:

```bash
npm run callback:receiver
```

6. in a second terminal, run:

```bash
npm run callbacks:register
npm run callbacks:get
npm run callbacks:list
npm run payment
npm run resource
```

7. save:

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
