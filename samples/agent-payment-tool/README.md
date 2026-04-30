# AFAL Agent Payment Tool

This sample is the Phase 2 boundary for Claude Code, OpenRouter agents, or any custom agent runtime.

The agent does not pay directly. It calls this tool, the tool asks AFAL for a governed payment action, and AFAL returns the approval session plus the downstream wallet rail URL.

## Run Against Staging

```bash
AFAL_BASE_URL=http://34.44.95.42:3213 \
AFAL_CLIENT_ID=client-metamask-demo-001 \
AFAL_SIGNING_KEY=<from /tmp/afal-metamask-demo-client.json> \
npm run tool:afal-payment -- \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url http://34.44.95.42:3412/wallet-demo
```

Expected output:

```json
{
  "tool": "afal.request_payment",
  "status": "pending_approval",
  "actionRef": "payint-0001",
  "approvalSessionRef": "aps-chall-0001",
  "walletUrl": "http://34.44.95.42:3412/wallet-demo?...",
  "afal": {
    "decisionRef": "dec-0001",
    "challengeRef": "chall-0001",
    "reservedAmount": "0.01",
    "availableAmount": "999.99"
  }
}
```

The agent then presents `walletUrl` to the trusted surface/user. After the wallet confirms and AFAL resumes the action, the payee side verifies settlement by calling AFAL action readback.

## Claude Code / OpenRouter Shape

Expose this command as a required tool before any downstream paid action:

```json
{
  "name": "afal_request_payment",
  "description": "Request an AFAL-governed payment before using a paid downstream service.",
  "input": {
    "message": "Pay 0.01 USDC to payee agent at 0x... for fraud detection service"
  }
}
```

The tool output is the contract the agent should use:

- `pending_approval` means the agent must not deliver paid work yet.
- `walletUrl` is the downstream rail action routed through AFAL.
- `actionRef` is the durable AFAL payment action.
- `approvalSessionRef` is the trusted-surface approval handle.
- `receiptRef` and `settlementRef` appear only after AFAL has settled the action.

Agent runtime integration contract:

- Payer-side agents must call `afal_request_payment` before claiming that payment or paid work is complete.
- A `pending_approval` response is not sufficient to deliver service.
- The trusted surface must complete wallet confirmation and `tool:afal-approve-resume`.
- Provider/payee agents must call `tool:afal-provider-gate` or equivalent AFAL receipt readback before delivering service.
- The only delivery-allowed terminal condition in this sample is `deliverService: true`.

## Provider Receipt Gate

The provider/payee side must not deliver paid service just because a wallet transfer happened. It must read AFAL and require a settled action plus final receipt evidence:

```bash
AFAL_BASE_URL=http://34.44.95.42:3213 \
AFAL_CLIENT_ID=client-metamask-demo-001 \
AFAL_SIGNING_KEY=<from /tmp/afal-metamask-demo-client.json> \
npm run tool:afal-provider-gate -- \
  --action-ref payint-0001 \
  --expected-payee-address 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 \
  --expected-amount 0.01 \
  --expected-asset USDC \
  --expected-chain base-sepolia \
  --expected-tx-hash <wallet-confirmed-txHash>
```

The gate returns `deliverService: true` only when all checks pass:

- AFAL action type is `payment`
- AFAL intent status is `settled`
- settlement record exists
- payment receipt is `final`
- receipt `settlementRef` matches the settlement
- optional expected payee, amount, asset, chain, and tx hash match

## Trusted-Surface Approve And Resume

After the wallet page confirms the transfer, the trusted surface must still approve and resume the AFAL action:

```bash
AFAL_BASE_URL=http://34.44.95.42:3213 \
npm run tool:afal-approve-resume -- \
  --approval-session-ref aps-chall-0001 \
  --comment "Approved after wallet-confirmed Base Sepolia USDC transfer"
```

Expected output includes:

```json
{
  "tool": "afal.trusted_surface_approve_resume",
  "finalIntentStatus": "settled",
  "deliverableHint": "run_provider_gate",
  "txHash": "0x..."
}
```

Then run `tool:afal-provider-gate` with the same `actionRef` and expected `txHash`. The provider should deliver only after the gate returns `deliverService: true`.

Latest clean staging acceptance, captured on 2026-04-30:

```json
{
  "actionRef": "payint-0001",
  "approvalSessionRef": "aps-chall-0001",
  "finalIntentStatus": "settled",
  "settlementRef": "stl-wallet-payint-0001",
  "receiptRef": "rcpt-pay-0001",
  "txHash": "0xdcf0650d64117d08f8d1ca60acf39b470c3a52aabe89d7c30280b2c30e92343a",
  "providerGate": {
    "deliverService": true
  }
}
```

Latest Claude Code-style tool-only acceptance, captured on 2026-04-30:

```json
{
  "tool": "afal.request_payment",
  "actionRef": "payint-0001",
  "approvalSessionRef": "aps-chall-0001",
  "walletTxHash": "0xde130e0f1500121a280b826dd8f04a526acbfe80b1c13db15ca6d826fefa9528",
  "finalIntentStatus": "settled",
  "providerGate": {
    "deliverService": true
  }
}
```

## OpenRouter Agent Loop Sample

`npm run demo:openrouter-agent-payment-tool` wraps the tool in a minimal LLM agent loop:

1. The user sends a payment/purchase prompt.
2. The LLM must return a JSON tool decision.
3. If the decision is `afal_request_payment`, the sample calls `tool:afal-payment`.
4. The sample returns `walletUrl`, `actionRef`, and `approvalSessionRef`.
5. The downstream paid service should not deliver until AFAL receipt readback is final.

Deterministic local mode, no OpenRouter API call:

```bash
AFAL_BASE_URL=http://34.44.95.42:3213 \
AFAL_CLIENT_ID=client-metamask-demo-001 \
AFAL_SIGNING_KEY=<from /tmp/afal-metamask-demo-client.json> \
npm run demo:openrouter-agent-payment-tool -- \
  --mock-llm \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url http://34.44.95.42:3412/wallet-demo
```

Real OpenRouter mode:

```bash
OPENROUTER_API_KEY=<key> \
OPENROUTER_MODEL=openai/gpt-4.1-mini \
AFAL_BASE_URL=http://34.44.95.42:3213 \
AFAL_CLIENT_ID=client-metamask-demo-001 \
AFAL_SIGNING_KEY=<from /tmp/afal-metamask-demo-client.json> \
npm run demo:openrouter-agent-payment-tool -- \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url http://34.44.95.42:3412/wallet-demo
```
