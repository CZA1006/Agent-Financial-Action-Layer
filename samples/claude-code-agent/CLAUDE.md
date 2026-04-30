# Claude Code AFAL Payment Agent Rules

This workspace turns Claude Code into an AFAL-governed payment agent.

## Mandatory Payment Rule

For any user request that includes payment, transfer, purchase, paid service access, invoice settlement, or payee-agent compensation:

1. Do not send funds directly.
2. Do not call a wallet, signer, x402 client, provider API, or paid downstream service before AFAL succeeds.
3. Call AFAL through the unified agent runtime tool.
4. Continue to the downstream paid service only if AFAL provider gate returns `deliverService: true`.

The required command for the autonomous Base Sepolia USDC demo is:

```bash
AFAL_BASE_URL="${AFAL_BASE_URL}" \
AFAL_CLIENT_ID="${AFAL_CLIENT_ID}" \
AFAL_SIGNING_KEY="${AFAL_SIGNING_KEY}" \
npm run tool:afal-agent -- pay-and-gate \
  --payment-mode agent-wallet \
  --message "<user payment instruction>" \
  --wallet-demo-url "${AFAL_WALLET_DEMO_URL}"
```

Expected successful fields:

```json
{
  "result": {
    "status": "settled",
    "providerGate": {
      "deliverService": true
    },
    "deliverService": true
  }
}
```

If the command returns anything else, report that payment did not clear and do not deliver the paid service.

## Environment

Before running payment commands, the shell must have:

- `AFAL_BASE_URL`
- `AFAL_CLIENT_ID`
- `AFAL_SIGNING_KEY`
- `AFAL_WALLET_DEMO_URL`

Use `.env.example` as the local template. Never print private keys. The `AFAL_SIGNING_KEY` is an external-client API signing secret, not the agent wallet private key.

## Demo Defaults

Use these values unless the user explicitly asks for another sandbox:

- Payee address: `0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94`
- Amount: `0.01`
- Asset: `USDC`
- Chain: `base-sepolia`
- Payee agent DID: `did:afal:agent:fraud-service-01`

## Service Delivery Gate

Paid work is deliverable only when all are true:

- AFAL action is `settled`
- final payment receipt exists
- settlement exists
- payee, amount, asset, chain, and tx hash checks pass
- provider gate returns `deliverService: true`

Do not treat a raw chain transaction, pending approval, or wallet confirmation as sufficient.

## Recommended User-Facing Summary

After a successful payment, summarize:

- `actionRef`
- `settlementRef`
- `receiptRef`
- `txHash`
- `deliverService`

Keep secrets out of the response.
