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
