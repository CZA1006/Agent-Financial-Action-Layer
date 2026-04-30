# Current Project Status

## Snapshot

AFAL is currently a late Phase 1 externally validated sandbox. It is not production payment infrastructure yet, but the repo now proves a real integration boundary:

- AFAL can run as a SQLite-backed HTTP sandbox.
- External agents can authenticate with provisioned client credentials.
- External agents can register callback URLs and submit payment/resource requests from outside the monorepo.
- A live handoff archive passed Round 003 external validation against the GCP staging sandbox.
- A prompt-driven payer-agent demo can create an AFAL-governed payment action and settle it through a real Base Sepolia USDC MetaMask transfer.
- A payee agent can verify settlement and receipt state by reading AFAL, not by trusting the payer agent's local output.
- The wallet-confirmed payment rail has optional server-side JSON-RPC receipt verification for Base Sepolia USDC `txHash` submissions.

## What Is Working

### Core Runtime

- AIP, AMN, ATS, and AFAL module boundaries are implemented in TypeScript.
- Canonical payment and resource flows run in seeded in-memory mode, durable JSON mode, SQLite integration mode, and HTTP mode.
- Approval sessions persist and can be resumed after trusted-surface approval.
- AFAL records decisions, challenges, settlements, receipts, budgets, quotas, notification outbox entries, and admin audit records.

### External-Agent Sandbox

- `serve:sqlite-http` starts the AFAL HTTP sandbox with external-client auth enabled.
- `provision:external-agent-sandbox` creates scoped client credentials, mandate refs, budget refs, quota refs, and signing metadata.
- The standalone pilot package includes `pilot/.env`, a sanitized `bundle.json`, docs, preflight, callback registration, payment, resource, and tunnel scripts.
- Preflight checks both AFAL reachability and signed credential acceptance.
- Round 003 passed from an extracted archive outside the AFAL monorepo.

### GCP Staging

Current staging baseline:

- AFAL base URL: `http://34.44.95.42:3213`
- wallet payment rail URL: `http://34.44.95.42:3412/wallet-demo`
- AFAL service: `afal-staging.service`
- payment rail service: `afal-payment-rail.service`
- MetaMask demo data dir: `/srv/afal/metamask-demo-001/sqlite-data`
- payment rail verification: `PAYMENT_RAIL_VERIFY_ONCHAIN=true`
- Base Sepolia RPC: `https://sepolia.base.org`

### Prompt-Driven MetaMask Payment Demo

The current demo flow is:

```text
user prompt
  -> payer agent
  -> AFAL external-client auth, mandate, policy, budget, challenge
  -> MetaMask Base Sepolia USDC transfer
  -> payment rail txHash registration, RPC receipt verification, and wallet-confirmation readback
  -> trusted-surface approval and resume
  -> AFAL settlement and receipt
  -> payee-agent AFAL readback
```

Validated output includes:

- `actionRef`: `payint-0001`
- `approvalSessionRef`: `aps-chall-0001`
- clean budget state: `reserved 0.01 USDC`, `available 999.99`
- final intent status: `settled`
- settlement ref: `stl-wallet-payint-0001`
- receipt ref: `rcpt-pay-0001`
- latest clean verified staging tx hash: `0xa01b5bc37b7591f9563bb73adf541e466a957798dcd8342e9c11ada81f73a0bf`
- payment rail readback: `wallet confirmation ok`
- onchain verification readback: `ok`, `chainId=84532`, `logIndex=0`
- dynamic approval context matching the actual prompt amount, chain, payee DID, settlement address, and purpose

## What This Proves

AFAL is acting as the AI infra payment layer:

- It gives agents an authenticated financial action API.
- It constrains agent actions with identity, mandate, policy, budget, and challenge checks.
- It separates agent intent from wallet execution.
- It records settlement and receipt evidence for both payer and payee sides.
- It gives the payee agent a verifiable AFAL readback path.

The MetaMask step is intentionally human-in-the-loop. That is a safety boundary for the current testnet demo, not the final custody model.

## Current Limits

AFAL does not yet provide:

- production auth
- production database deployment
- production-grade onchain finality policy or configurable asset registry
- autonomous custody, MPC, or smart-account signing
- production trusted-surface UI
- production observability and operator control plane
- mainnet payment readiness

## Phase 2 Started

Phase 2 now has the first SDK/tool boundary:

- `sdk/client/createAfalClient` signs external-client AFAL requests and wraps payment/resource approval plus action readback.
- `sdk/client/createAfalClient().waitForPaymentReceipt` provides the first receipt polling helper.
- `sdk/client/agent-payment` converts a prompt-style USDC payment instruction into an AFAL payment intent and wallet rail URL.
- `samples/agent-payment-tool` exposes this as `npm run tool:afal-payment`, which is the first Claude Code/OpenRouter-style tool wrapper.
- `npm run demo:openrouter-agent-payment-tool` wraps that tool in a minimal LLM agent loop; the LLM must choose `afal_request_payment` before any paid downstream service can proceed.

## Next Engineering Priorities

1. Add payee/provider service gating: do not deliver service unless AFAL action readback has a final receipt.
2. Add callback registration helpers to `sdk/client`, then update standalone external-agent samples to use the SDK boundary.
3. Extend the OpenRouter/Claude Code sample from payment-request creation into receipt-gated service delivery.
4. Design the x402/Coinbase pilot adapter and decide the first paid API/resource scenario.
5. Move from IP-based staging to a stable HTTPS domain or hosted sandbox entrypoint.

Phase 2 plan:

- [Phase 2: Agent Payment Control Plane](phase-2-agent-payment-control-plane.md)
