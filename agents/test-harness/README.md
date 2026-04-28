# Runtime-Agent Harness

`agents/test-harness/` is the first minimal runtime-agent layer above AFAL's SQLite-backed HTTP contract.

## Purpose

- model separate runtime roles instead of only fixture scripts
- let one `payer-agent` trigger a challenge-producing payment request
- let one `approval-agent` resolve the persisted approval session through the trusted-surface callback path
- let one `payee` or `provider` receiver agent actively accept a settlement callback after AFAL resumes the approved action
- provide harness entrypoints that can orchestrate both requester-side and bilateral agent flows against the real AFAL HTTP surface

## Current Roles

- `payer-agent.ts`
  - submits the canonical payment approval request
  - returns the persisted `approvalSessionRef`
  - can sign external-client AFAL requests when `AFAL_CLIENT_ID` and `AFAL_SIGNING_KEY` are provided
- `resource-requester-agent.ts`
  - submits the canonical resource approval request
  - returns the persisted `approvalSessionRef`
- `approval-agent.ts`
  - can still talk directly to AFAL for in-process tests
  - in spawned harnesses now talks to an independent trusted-surface HTTP stub
  - causes the trusted-surface stub to read the approval session, apply the approval result, and resume the approved action
- `payee-agent.ts`
  - reads settled payment action status over HTTP
  - confirms the final payment settlement and receipt from the receiver side
  - supports payee-side verification for the prompt-driven MetaMask demo
- `provider-agent.ts`
  - reads settled resource action status over HTTP
  - confirms the final usage receipt and provider settlement from the receiver side
- `payee-callback-agent.ts`
  - starts a minimal callback receiver for payment settlement notifications
  - confirms the final payment settlement and receipt from the receiver side without polling AFAL state
- `provider-callback-agent.ts`
  - starts a minimal callback receiver for resource settlement notifications
  - confirms the final usage receipt and provider settlement from the receiver side without polling AFAL state
- `payment-harness.ts`
  - orchestrates both agent roles
  - can run in-process for tests
  - can spawn separate subprocesses for local demos
  - in spawned mode starts a dedicated trusted-surface HTTP service by default
  - uses an isolated temporary SQLite data directory by default
- `payment-bilateral-harness.ts`
  - orchestrates payer, approval, and payee-side callback receiver agents
  - closes the loop from request initiation to receiver-side callback confirmation
- `notification-admin-demo.ts`
  - orchestrates a failed-first payment callback delivery
  - exercises operator-only delivery lookup, worker run, and admin-audit reads
  - proves the outbox/worker path can recover receiver delivery without replaying the business action
- `resource-harness.ts`
  - orchestrates the resource requester and approval agent
  - can run in-process for tests
  - can spawn separate subprocesses for local demos
  - in spawned mode starts a dedicated trusted-surface HTTP service by default
  - uses an isolated temporary SQLite data directory by default
- `resource-bilateral-harness.ts`
  - orchestrates requester, approval, and provider-side callback receiver agents
  - closes the loop from request initiation to provider-side callback confirmation
- `metamask-agent-payment-demo.ts`
  - accepts a prompt-style payment message
  - parses amount, asset, chain, and payee address into a payment instruction
  - submits the signed payer-agent request to AFAL
  - prints a prefilled MetaMask wallet URL for Base Sepolia USDC
  - waits for wallet confirmation, then resumes the AFAL approval session
  - asks the payee agent to read AFAL and verify the final settlement and receipt

## Notes

- this is still a controlled runtime-agent harness, not yet a full multi-agent market simulation
- the bilateral harnesses now cover both requester-side and receiver/provider-side callback loops
- AFAL still exposes `getActionStatus` for pull-based reconciliation, but the bilateral callback path now verifies active receiver delivery
- spawned bilateral harness runs now persist callback outbox records in the shared `afal-integration.sqlite` database under the selected data directory
- spawned bilateral harness runs now start a notification outbox worker for automatic redelivery of failed receiver callbacks
- `notification-admin-demo.ts` keeps the worker stopped initially so operator-driven recovery routes can be demonstrated deterministically
- `payment-bilateral-harness.ts` and `resource-bilateral-harness.ts` both support failure injection flags so callback retries can be exercised end to end
- spawned harness summaries now include `trustedSurfaceUrl` so the process boundary is visible in demo output
- the MetaMask demo is intentionally human-in-the-loop for wallet signing; AFAL is proving governed agent payment orchestration, not autonomous custody
- the payee-side readback proves the receiver can verify payment through AFAL instead of trusting the payer agent's local output
