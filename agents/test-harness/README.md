# Runtime-Agent Harness

`agents/test-harness/` is the first minimal runtime-agent layer above AFAL's SQLite-backed HTTP contract.

## Purpose

- model separate runtime roles instead of only fixture scripts
- let one `payer-agent` trigger a challenge-producing payment request
- let one `approval-agent` resolve the persisted approval session through the trusted-surface callback path
- let one `payee-agent` or `provider-agent` independently confirm the settled result through AFAL's HTTP query surface
- provide harness entrypoints that can orchestrate both requester-side and bilateral agent flows against the real AFAL HTTP surface

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
- `payee-agent.ts`
  - reads settled payment action status over HTTP
  - confirms the final payment settlement and receipt from the receiver side
- `provider-agent.ts`
  - reads settled resource action status over HTTP
  - confirms the final usage receipt and provider settlement from the receiver side
- `payment-harness.ts`
  - orchestrates both agent roles
  - can run in-process for tests
  - can spawn separate subprocesses for local demos
  - uses an isolated temporary SQLite data directory by default
- `payment-bilateral-harness.ts`
  - orchestrates payer, approval, and payee agents
  - closes the loop from request initiation to receiver-side confirmation
- `resource-harness.ts`
  - orchestrates the resource requester and approval agent
  - can run in-process for tests
  - can spawn separate subprocesses for local demos
  - uses an isolated temporary SQLite data directory by default
- `resource-bilateral-harness.ts`
  - orchestrates requester, approval, and provider agents
  - closes the loop from request initiation to provider-side confirmation

## Notes

- this is still a controlled runtime-agent harness, not yet a full multi-agent market simulation
- the bilateral harnesses now cover both requester-side and receiver/provider-side confirmation loops
- receiver-facing behavior currently depends on AFAL's read-side `getActionStatus` query rather than push callbacks
