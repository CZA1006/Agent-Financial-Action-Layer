# External Agent Sandbox Acceptance Checklist

## Purpose

This checklist defines the current acceptance surface for AFAL's real external-agent sandbox path.

It is intentionally narrower than production readiness.
Its purpose is to prove that a real LLM-backed external agent can:

- authenticate into AFAL's public API
- execute canonical payment and resource flows
- survive key failure paths
- recover receiver callback delivery through operator intervention

---

## Current Acceptance Command

Run the full sandbox acceptance with:

```bash
npm run accept:external-agent
```

If you want structured evidence files for each scenario:

```bash
npm run accept:external-agent -- --artifacts-root ./.afal-openrouter-acceptance-artifacts
```

This command requires:

- `OPENROUTER_API_KEY` in the environment or project-root `.env`
- network access to OpenRouter
- local loopback listener support for callback recovery pilots

The acceptance script uses isolated temporary data directories for every scenario.

When `--artifacts-root` is provided, each scenario also writes JSON artifacts such as:

- `summary.json`
- `llm.json`
- `payment.json` or `resource.json`
- `approval.json`
- `actionStatus.json`, `deliveryBeforeWorker.json`, `deliveryAfterWorker.json`, or similar
- `result.json`

## Companion Onboarding Smoke Command

Run the repo-contained second-engineer onboarding replay with:

```bash
npm run accept:external-onboarding
```

If you want to preserve the generated bundle, callback readbacks, request outputs, and logs:

```bash
npm run accept:external-onboarding -- --artifacts-root ./.afal-external-onboarding-artifacts
```

This command is intentionally narrower than `accept:external-agent`.

It proves that AFAL's current onboarding docs and standalone pilot kit are internally self-consistent for the basic command-line flow:

- start sandbox server
- provision external client
- start standalone callback receiver
- register callback URLs
- read callback registration back
- submit one payment request
- submit one resource request

It does not prove trusted-surface approval, settlement, callback delivery success, or callback recovery.
Those remain covered by `accept:external-agent`.

---

## Scope

The current external-agent sandbox acceptance covers six scenarios.

### 1. Payment happy path

Expected result:

- external LLM returns `request_payment_approval`
- AFAL returns `pending-approval`
- trusted-surface review approves
- action resumes and settles
- final status is `settled`
- payment receipt exists

### 2. Resource happy path

Expected result:

- external LLM returns `request_resource_approval`
- AFAL returns `pending-approval`
- trusted-surface review approves
- provider usage and settlement complete
- final status is `settled`
- usage receipt and resource receipt exist

### 3. Payment approval rejected

Expected result:

- payment request reaches approval stage
- trusted-surface result is `rejected`
- AFAL action status becomes `rejected`
- ATS reservation is released
- no settlement occurs

### 4. Resource transient retry recovery

Expected result:

- provider usage confirmation fails once
- provider settlement fails once
- AFAL retries both paths through bounded retry
- action still ends as `settled`

### 5. Payment callback recovery

Expected result:

- payment settles successfully
- payee callback fails on first delivery attempt
- delivery record becomes `failed`
- operator runs notification worker
- callback is redelivered
- delivery record becomes `delivered`

### 6. Resource callback recovery

Expected result:

- resource flow settles successfully
- provider callback fails on first delivery attempt
- delivery record becomes `failed`
- operator runs notification worker
- callback is redelivered
- delivery record becomes `delivered`

---

## Evidence Produced

Each pilot produces JSON output that shows:

- external client identity
- signed-header requirement
- LLM decision
- AFAL request and approval state
- final settlement or rejection outcome
- notification delivery state where relevant

For callback recovery pilots, the output must show:

- `failedStatusBeforeWorker: "failed"`
- `finalStatusAfterWorker: "delivered"`
- `redelivered: 1`

---

## What This Acceptance Proves

Passing `accept:external-agent` currently proves:

- AFAL's public external-client auth boundary works with a real LLM-backed caller
- both canonical Phase 1 flows work over the public API
- trusted-surface approval and resume work end to end
- transient upstream failures can recover through retry
- receiver callback failures can recover through outbox + operator worker flow

It does **not yet** prove:

- that a second engineer can consume AFAL from a separate repo without monorepo context
- that the current docs and standalone kit are fully friction-free for external onboarding

It also does **not** prove:

- production secrets management
- production key rotation
- public internet deployment
- real funds or real payment rails
- real provider billing systems
- production-grade observability or tenancy isolation

---

## Recommended Usage

Use this acceptance command:

- before major external-agent sandbox changes
- before updating onboarding docs
- before claiming new external-agent readiness

Use the individual pilot commands when debugging one path in isolation.

Use the standalone repo-external pilot after this acceptance passes, not before it.

Why:

- `accept:external-agent` proves the sandbox boundary works under controlled internal conditions
- the standalone pilot proves the same boundary is usable by a different engineer without internal repo assumptions
