# Phase 2: Agent Payment Control Plane

## Purpose

Phase 2 turns AFAL from a validated sandbox into a usable agent payment control plane.

The core claim for this phase is:

```text
Agents should not pay directly.
Agents should request a governed financial action through AFAL,
then AFAL should authorize, constrain, approve, execute through a downstream rail,
and produce settlement/receipt evidence that both payer and payee agents can verify.
```

This is the AI payment infrastructure layer between agent runtimes and payment rails.

```text
Claude Code / OpenRouter agent / custom agent
  -> AFAL identity + mandate + policy + budget + approval + audit
  -> payment rail adapter
  -> x402 / Coinbase / wallet / stablecoin / API billing / card-like rails
  -> AFAL settlement + receipt + payee/provider verification
```

AFAL should not replace downstream payment protocols such as x402. AFAL should be the agent-native authorization and governance layer before those rails are allowed to execute.

## Starting Point

Phase 1 has produced:

- SQLite-backed AFAL HTTP sandbox.
- External-client auth and provisioning.
- Standalone external-agent handoff package.
- Successful Round 003 external engineer validation.
- Prompt-driven MetaMask/Base Sepolia payment demo.
- Payer-agent request, trusted-surface approval, wallet transfer, AFAL settlement/receipt, and payee-agent readback.
- Optional JSON-RPC receipt verification for wallet-submitted Base Sepolia USDC `txHash` values.

Phase 1 proves the boundary works.

Phase 2 must prove the boundary is useful as infrastructure.

## Phase 2 Target

Phase 2 target stage:

- **AFAL as mandatory agent payment control plane**

At the end of Phase 2, a developer should be able to build a simple Claude Code or OpenRouter-backed agent and make it pay through AFAL without copying monorepo harness code.

The ideal user experience is:

```ts
const afal = new AfalClient({
  baseUrl: process.env.AFAL_BASE_URL,
  clientId: process.env.AFAL_CLIENT_ID,
  signingKey: process.env.AFAL_SIGNING_KEY,
});

const payment = await afal.requestPaymentApproval({
  payeeDid: "did:afal:agent:fraud-service-01",
  amount: "0.01",
  asset: "USDC",
  chain: "base-sepolia",
  purpose: "fraud detection service",
});

const receipt = await afal.waitForReceipt(payment.actionRef);
```

The agent should not need to know how to manually create AFAL auth headers, callback registration payloads, approval session payloads, or receipt polling logic.

## Scope

### In Scope

- TypeScript client SDK for AFAL public routes.
- Claude Code style tool wrapper around the SDK.
- OpenRouter simple agent example using the SDK.
- Payment rail adapter interface.
- Server-side onchain verification for wallet-submitted `txHash` values.
- Coinbase x402 pilot behind AFAL approval.
- Payee/provider verification flow through AFAL readback or callbacks.
- Hosted/staging sandbox operator path for demos.

### Out Of Scope

- Mainnet funds.
- Autonomous unrestricted wallet custody.
- Full MPC or smart-account production custody.
- Full enterprise operator console.
- Full Visa-scale network operations.
- Market venue trading.

These can become later phases. Phase 2 should stay focused on agent payment governance and first real rail integration.

## Workstreams

### 1. AFAL TypeScript SDK

Goal:

- make external agent integration small, typed, and repeatable.

SDK v1 should wrap:

- request signing
- callback registration/get/list
- payment approval request
- resource approval request
- action status readback
- settlement/receipt polling
- common error mapping

SDK v1 should not include:

- internal test harness logic
- OpenRouter-specific prompting
- trusted-surface UI implementation
- wallet custody
- operator/admin routes

Acceptance:

- standalone sample can replace direct HTTP scripts with SDK calls
- Claude/OpenRouter examples import the SDK instead of monorepo harness internals
- raw HTTP remains documented and usable

### 2. Agent Examples

Goal:

- prove real agent runtimes can use AFAL as the payment gate.

Examples:

- `OpenRouter payer agent`: parses a user payment instruction, calls AFAL, waits for receipt.
- `Claude Code tool wrapper`: exposes AFAL payment as a required tool before a paid downstream action.
- `payee/provider agent`: verifies AFAL settlement/receipt before delivering service output.

Acceptance:

- one prompt can trigger an AFAL-governed payment request
- the agent cannot complete payment by bypassing AFAL in the demo flow
- payee/provider side can verify the action through AFAL

### 3. Payment Rail Adapter Interface

Goal:

- make downstream rails pluggable while preserving AFAL as the common policy and receipt layer.

Adapter contract should express:

- action ref
- payer identity/account
- payee/provider identity
- asset
- amount
- chain or rail
- idempotency key
- settlement evidence
- terminal status
- retry classification

Initial adapters:

- `mock`
- `wallet-confirmed-base-sepolia`
- `x402-coinbase-pilot`

Acceptance:

- AFAL can choose a rail adapter after approval
- each adapter returns normalized settlement evidence
- AFAL receipts are rail-agnostic at the top level but retain rail-specific evidence

### 4. Server-Side Onchain Verification

Goal:

- stop trusting browser-submitted `txHash` as settlement truth.

The payment rail must verify:

- chain ID
- token contract
- ERC-20 `Transfer` event
- sender
- recipient
- amount
- tx success
- minimum confirmations or finality policy
- replay protection for already-used `txHash`

Acceptance:

- wrong token, wrong recipient, wrong amount, failed tx, and replayed tx are rejected
- verified tx creates settlement evidence that AFAL can receipt
- MetaMask demo remains usable on Base Sepolia

Current implementation status:

- `app/payment-rail` can enable verification with `PAYMENT_RAIL_VERIFY_ONCHAIN=true`.
- The verifier checks `eth_chainId` and `eth_getTransactionReceipt`.
- It validates transaction success, block inclusion, transaction hash, ERC-20 `Transfer` log, token, sender, recipient, and USDC-style 6-decimal amount.
- It rejects replayed `txHash` values for different AFAL actions.
- GCP staging has validated the verifier against Base Sepolia RPC for tx `0x16d906dd16a67ef91abb384bc68b1ee3a6ec4f8166ead96cc1c4cdfeb73b55fd`.
- Remaining production work: configurable asset registry, finality threshold, production RPC provider strategy, and stronger payer/payee allowlists.

### 5. Coinbase x402 Pilot

Goal:

- prove AFAL can sit before a machine-native payment protocol used for paid APIs/resources.

Target flow:

```text
agent wants paid API/resource
  -> AFAL payment/resource approval
  -> AFAL selects x402 rail
  -> x402 payment flow completes
  -> downstream service accepts payment
  -> AFAL records receipt
  -> provider/payee verifies AFAL state
```

Acceptance:

- AFAL governs the agent before the x402 payment is attempted
- x402 payment evidence is mapped into AFAL settlement/receipt records
- provider side can reject service delivery if AFAL receipt is missing or invalid

## Phase 2 Demo Narrative

The demo should be explainable in one sentence:

> The agent wants to pay, but it cannot pay directly; it must ask AFAL, and AFAL decides whether the action is allowed before any downstream payment rail executes.

Concrete demo path:

1. User prompts a payer agent: "Pay 0.01 USDC to this payee agent for fraud detection."
2. Payer agent parses intent and calls AFAL SDK.
3. AFAL authenticates the agent and checks mandate, policy, budget, and challenge rules.
4. AFAL returns pending approval and a human-readable approval context.
5. Trusted surface approves.
6. AFAL executes through a configured rail adapter.
7. Rail returns verified settlement evidence.
8. AFAL issues receipt.
9. Payee agent reads AFAL and releases service only after receipt verification.

## Phase 2 Exit Criteria

Phase 2 is complete when:

- a simple external agent can integrate through an AFAL SDK
- OpenRouter or Claude Code can trigger a governed AFAL payment flow
- at least one real downstream rail pilot works behind AFAL
- wallet `txHash` settlement is server-verified, not browser-trusted
- payee/provider verification is demonstrated
- repeatable staging runbook and demo script exist
- docs clearly separate sandbox, testnet, and production readiness

## Immediate Next Steps

1. Use the new `--transcript` demo mode for presentation recordings and external walkthroughs.
2. Start `@afal/client` or equivalent TypeScript SDK inside this repo.
3. Build one minimal OpenRouter agent example on top of the SDK.
4. Design the x402/Coinbase pilot adapter and decide the first paid resource/API scenario.
5. Move staging from raw IP/HTTP to a stable HTTPS endpoint.
