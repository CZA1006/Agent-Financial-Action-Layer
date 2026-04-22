# External Agent Sandbox Onboarding

## Purpose

This document defines the current minimum onboarding path for one real external agent system to connect to AFAL's sandbox-facing SQLite HTTP runtime.

This is the first practical bridge between:

- AFAL's locally accepted externally integrated runtime

and:

- a real external agent integration pilot

This onboarding doc is now also the base document for a **second-engineer external validation pass** using the standalone pilot kit.

---

## Preconditions

Start AFAL's SQLite-backed HTTP server:

```bash
npm run serve:sqlite-http
```

This default server entrypoint now enables external-client auth automatically.

If you use a custom launcher instead of `npm run serve:sqlite-http`, you must still enable the external client auth option yourself.

For an external engineer pilot, the better setup is:

- AFAL team runs the sandbox server
- AFAL team provisions the client
- external engineer receives only the consumer bundle and credentials

That avoids conflating infrastructure setup problems with onboarding-surface problems.

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
  --mandate-refs mnd-0001,mnd-0002 \
  --monetary-budget-refs budg-money-001 \
  --resource-budget-refs budg-res-001 \
  --resource-quota-refs quota-001 \
  --payment-payee-did did:afal:agent:fraud-service-01 \
  --resource-provider-did did:afal:institution:provider-openai
```

The script writes the client record into the shared SQLite integration database and prints a sandbox bundle containing:

- AFAL base URL
- `clientId`
- `subjectDid`
- mandate references
- budget / quota references
- signing key
- required auth headers

When handing off to another engineer, send the output as a single bundle rather than scattered values.

For the current standalone pilot kit, one sandbox subject is used for both payment and resource sample requests:

- `did:afal:agent:payment-agent-01`

This is a sandbox simplification for external onboarding. It avoids forcing the external engineer to manage multiple client identities in the first validation pass.

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

The external engineer should not need to derive this formula manually if they are using the standalone kit.
If they still need to reason about the formula to get unstuck, that is feedback worth capturing.

---

## Minimum Pilot Path

This section describes the minimal onboarding path.
For the engineer-facing execution handoff, use:

- [External Engineer Pilot Handoff](./external-engineer-pilot-handoff.md)

### 1. Payment

The first external-agent pilot should use:

- `POST /capabilities/request-payment-approval`
- trusted-surface approval completion
- `POST /actions/get`

For the second-engineer pilot, the first pass should stay command-line based.
They do not need to write a fresh agent loop or a custom LLM integration.

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

If you want one command that replays the second-engineer onboarding sequence inside this repo:

```bash
npm run accept:external-onboarding
```

This onboarding smoke command starts a sandbox server, provisions one external client, launches the standalone callback receiver, registers callback URLs, reads them back, and submits one payment plus one resource request.

Use this before sending the standalone kit to another engineer. It is the fastest way to catch regressions in:

- default external-client auth
- provisioning examples
- standalone fixture IDs and subjects
- callback registration docs
- command-line onboarding assumptions

Reference checklist:

- [External Agent Sandbox Acceptance Checklist](./external-agent-sandbox-acceptance-checklist.md)
- [Sample External Agent Pilot Kit](../../samples/README.md)
- [Standalone External Agent Pilot](../../samples/standalone-external-agent-pilot/README.md)
- [External Engineer Pilot Handoff](./external-engineer-pilot-handoff.md)

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

Minimal expected flow:

1. start the standalone callback receiver
2. register the callback URLs
3. read them back with `get` or `list`
4. submit payment and resource requests
5. observe callback payload arrival

If any of those steps requires reading internal runtime code, the external onboarding surface is still incomplete.

---

## Current Limitations

The sandbox onboarding path does not yet provide:

- callback verification handshake
- production auth
- production-grade replay resistance
- multi-client tenant management

It is only the first controlled boundary for onboarding one external agent integration pilot.

It is also not yet the final package or SDK surface.
It is the pre-package validation layer that should inform the eventual SDK or package design.

---

## Recommended Next Validation Step

The next step is no longer to add another internal harness.

The next step is:

- give the standalone pilot kit to a second engineer
- require them to run it from a separate repo or separate workspace
- require them to use only:
  - AFAL public routes
  - provisioning output
  - this onboarding document
  - the standalone pilot README

If that second engineer can complete the flow without needing internal runtime context, AFAL moves from:

- **internally accepted external-agent sandbox**

to:

- **externally validated external-agent sandbox**
