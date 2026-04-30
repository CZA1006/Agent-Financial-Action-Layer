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

Current status: the Claude Code path has reached first acceptance through MCP. A user issued a plain payment prompt, Claude Code called `afal_pay_and_gate`, the VM agent-wallet signer executed a Base Sepolia USDC transfer, and AFAL provider gate returned `deliverService=true`.

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
- MCP server exposing AFAL payment tools to Claude Code / MCP-capable agent runtimes.
- OpenRouter simple agent example using the SDK.
- Payment rail adapter interface.
- Server-side onchain verification for wallet-submitted `txHash` values, plus a wallet-confirmation readback that lets agent demos show `verification.ok`, verified chain ID, log index, and tx hash.
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

Current implementation:

- `sdk/client/createAfalClient` signs external-client requests and wraps payment approval, resource approval, action readback, and payment receipt polling.
- `sdk/client/agent-payment` parses a simple prompt-style USDC payment instruction and builds the AFAL payment intent plus wallet rail URL.
- `samples/agent-payment-tool` exposes the first Claude/OpenRouter-style CLI tool via `npm run tool:afal-payment`.
- `samples/agent-payment-tool/openrouter-agent.ts` wraps the tool in a minimal LLM agent loop and rejects non-AFAL payment tool choices.
- `samples/agent-payment-tool/approve-resume-tool.ts` exposes the trusted-surface approve/resume step as `npm run tool:afal-approve-resume`.
- `samples/agent-payment-tool/provider-receipt-gate.ts` gives provider/payee agents a strict AFAL receipt gate before service delivery.
- `samples/afal-mcp-server` exposes `afal_pay_and_gate`, `afal_request_payment`, `afal_approve_resume`, and `afal_provider_gate` as MCP tools.
- `afal-payment-mcp` is the preview binary entrypoint for MCP distribution.

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

Current implementation:

- `npm run tool:afal-payment` accepts a natural-language payment message and returns `pending_approval`, `actionRef`, `approvalSessionRef`, budget reservation fields, and a wallet rail URL.
- The tool is suitable as a required Claude Code/OpenRouter function before any paid downstream action.
- `npm run demo:openrouter-agent-payment-tool` demonstrates an agent choosing the mandatory AFAL payment tool before downstream delivery.
- `npm run tool:afal-approve-resume` resumes wallet-confirmed pending actions into AFAL settlement/receipt state.
- `npm run tool:afal-provider-gate` rejects delivery unless AFAL action readback is settled and the final receipt evidence matches expected payment fields.
- The existing MetaMask transcript demo remains the full end-to-end presentation path with wallet confirmation, onchain verification, AFAL settlement, receipt evidence, and payee-agent readback.

Claude Code-style tool-only acceptance, captured on 2026-04-30:

- `tool:afal-payment` returned `pending_approval`, `payint-0001`, `aps-chall-0001`, and a prefilled wallet URL.
- MetaMask completed a Base Sepolia USDC transfer with txHash `0xde130e0f1500121a280b826dd8f04a526acbfe80b1c13db15ca6d826fefa9528`.
- Payment rail accepted the wallet confirmation with JSON-RPC verification `ok`.
- `tool:afal-approve-resume` returned `finalIntentStatus=settled`, `settlementRef=stl-wallet-payint-0001`, and `receiptRef=rcpt-pay-0001`.
- `tool:afal-provider-gate` returned `deliverService=true` with every receipt, settlement, payee, amount, asset, chain, and txHash check passing.

This proves the shell/tool contract needed by Claude Code or another local agent runtime. Real OpenRouter LLM selection is still pending because the available OpenRouter account returned a 402 insufficient-credits response.

Claude Code MCP acceptance, captured on 2026-05-01:

- Claude Code MCP server: `afal-payment`
- MCP tool called: `afal_pay_and_gate`
- user prompt: `Pay 0.01 USDC to the fraud detection payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94, then only deliver the service if AFAL provider gate passes.`
- result: `settled`
- provider gate: passed
- `deliverService`: `true`
- tx hash: `0x9e848b428fe6476bcacbb0ce1c2edd0aa36bf6e390b55db210a70b95ef8dde79`

This proves a real agent runtime can discover AFAL as a tool and route payment through AFAL without the user manually running shell commands.

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
- `agent-wallet-base-sepolia-usdc`
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

Current Claude Code MCP demo path:

1. User prompts Claude Code with a payment request.
2. Claude Code discovers the `afal-payment` MCP server.
3. Claude Code calls `afal_pay_and_gate`.
4. AFAL authorizes and reserves the action.
5. AFAL approval/resume triggers the payment rail agent-wallet signer.
6. The signer broadcasts Base Sepolia USDC under configured max-amount and payee allowlist policy.
7. AFAL records settlement and receipt.
8. Provider gate returns `deliverService=true`.

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

1. Cut an AFAL payment MCP preview release with `afal-payment-mcp`, clear Claude Code setup docs, and no live secrets.
2. Replace deterministic demo refs such as `payint-0001` with unique action refs for repeated live testing.
3. Reduce the MCP package surface so external testers can install without cloning the full repo.
4. Build one minimal OpenRouter agent example on top of the MCP/SDK boundary after account credits are available.
5. Design the x402/Coinbase pilot adapter and decide the first paid resource/API scenario.
6. Move staging from raw IP/HTTP to a stable HTTPS endpoint.
