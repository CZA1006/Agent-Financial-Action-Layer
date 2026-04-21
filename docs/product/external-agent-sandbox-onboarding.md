# External Agent Sandbox Onboarding

## Purpose

This document defines the current minimum onboarding path for one real external agent system to connect to AFAL's sandbox-facing SQLite HTTP runtime.

This is the first practical bridge between:

- AFAL's locally accepted externally integrated runtime

and:

- a real external agent integration pilot

---

## Preconditions

Start AFAL's SQLite-backed HTTP server:

```bash
npm run serve:sqlite-http
```

If you want external client auth enabled for a custom launcher, the server wiring must enable the external client auth option in the SQLite HTTP runtime.

---

## Provision A Sandbox Client

The minimum provisioning path is:

```bash
node --import tsx/esm scripts/provision-external-agent-sandbox.ts \
  --data-dir ./.afal-sqlite-http-data \
  --client-id client-demo-001 \
  --tenant-id tenant-demo-001 \
  --agent-id agent-demo-001 \
  --subject-did did:afal:agent:payment-agent-01 \
  --mandate-ref mnd-0001 \
  --monetary-budget-refs budg-money-001
```

The script writes the client record into the shared SQLite integration database and prints a sandbox bundle containing:

- AFAL base URL
- `clientId`
- `subjectDid`
- mandate references
- budget / quota references
- signing key
- required auth headers

---

## Current Request Auth

Public AFAL requests from the external agent must currently include:

- `x-afal-client-id`
- `x-afal-request-timestamp`
- `x-afal-request-signature`

Current signature formula:

```text
sha256(`${clientId}:${requestRef}:${timestamp}:${signingKey}`)
```

This is a sandbox placeholder, not a production auth model.

---

## Minimum Pilot Path

### 1. Payment

The first external-agent pilot should use:

- `POST /capabilities/request-payment-approval`
- trusted-surface approval completion
- `POST /actions/get`

If you want to use a real LLM-backed agent loop against the sandbox-facing payment path, set `OPENROUTER_API_KEY` in `.env` and run:

```bash
npm run demo:openrouter-payment-pilot -- --data-dir ./.afal-openrouter-pilot-data
npm run demo:openrouter-resource-pilot -- --data-dir ./.afal-openrouter-resource-pilot-data
```

The OpenRouter pilots still use canonical AFAL payment/resource fixtures and mock settlement. They do not require real funds.

Current failure-matrix examples:

```bash
npm run demo:openrouter-payment-pilot -- \
  --data-dir ./.afal-openrouter-payment-rejected-data \
  --approval-result rejected

npm run demo:openrouter-resource-pilot -- \
  --data-dir ./.afal-openrouter-resource-retry-data \
  --confirm-usage-failures-before-success 1 \
  --settle-resource-usage-failures-before-success 1

npm run demo:openrouter-payment-callback-recovery-pilot -- \
  --data-dir ./.afal-openrouter-payment-callback-recovery-data

npm run demo:openrouter-resource-callback-recovery-pilot -- \
  --data-dir ./.afal-openrouter-resource-callback-recovery-data \
  --provider-fail-first-attempts 1
```

Use a fresh `--data-dir` per run if you want isolated ATS and AFAL state.

If you want one command that runs the current real external-agent sandbox acceptance matrix:

```bash
npm run accept:external-agent
```

If you want persistent JSON evidence for every scenario:

```bash
npm run accept:external-agent -- --artifacts-root ./.afal-openrouter-acceptance-artifacts
```

Reference checklist:

- [External Agent Sandbox Acceptance Checklist](./external-agent-sandbox-acceptance-checklist.md)
- [Sample External Agent Pilot Kit](../../samples/README.md)
- [Standalone External Agent Pilot](../../samples/standalone-external-agent-pilot/README.md)

### 2. Resource

After payment is stable, extend to:

- `POST /capabilities/request-resource-approval`
- trusted-surface approval completion
- `POST /actions/get`

---

## Callback Registration

The sandbox onboarding model now supports callback registration through authenticated
integration routes:

- `POST /integrations/callbacks/register`
- `POST /integrations/callbacks/get`
- `POST /integrations/callbacks/list`

Current callback fields can include:

- payment settlement callback URL
- resource settlement callback URL
- receiver-side identity mapping for:
  - `paymentPayeeDid`
  - `resourceProviderDid`

---

## Current Limitations

The sandbox onboarding path does not yet provide:

- callback verification handshake
- production auth
- production-grade replay resistance
- multi-client tenant management

It is only the first controlled boundary for onboarding one external agent integration pilot.
