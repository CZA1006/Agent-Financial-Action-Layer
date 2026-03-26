# Runtime-Agent Harness

`agents/test-harness/` is the first minimal runtime-agent layer above AFAL's SQLite-backed HTTP contract.

## Purpose

- model separate runtime roles instead of only fixture scripts
- let one `payer-agent` trigger a challenge-producing payment request
- let one `approval-agent` resolve the persisted approval session through the trusted-surface callback path
- provide one harness entrypoint that can orchestrate both agents against the real AFAL HTTP surface

## Current Roles

- `payer-agent.ts`
  - submits the canonical payment approval request
  - returns the persisted `approvalSessionRef`
- `resource-requester-agent.ts`
  - submits the canonical resource approval request
  - returns the persisted `approvalSessionRef`
- `approval-agent.ts`
  - reads the approval session
  - applies an approval result
  - resumes the approved action into settlement
- `payment-harness.ts`
  - orchestrates both agent roles
  - can run in-process for tests
  - can spawn separate subprocesses for local demos
  - uses an isolated temporary SQLite data directory by default
- `resource-harness.ts`
  - orchestrates the resource requester and approval agent
  - can run in-process for tests
  - can spawn separate subprocesses for local demos
  - uses an isolated temporary SQLite data directory by default

## Notes

- this is the first runtime-agent harness, not yet a full multi-agent market simulation
- the harness currently focuses on the payer + trusted-surface approval path because that is the most differentiated Phase 1 execution loop
- it now also covers the canonical resource approval path through the same callback-and-resume boundary
- receiver/payee-side active agent behavior should come later, once AFAL exposes stronger receiver-facing query or callback surfaces
