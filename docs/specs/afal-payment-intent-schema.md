# AFAL Payment Intent Schema

## Status
Draft v0.1

## Purpose
Defines the Payment Intent schema used by AFAL.

## Payment Intent Schema
```json
{
  "intentId": "payint-0001",
  "intentType": "payment",
  "payer": {
    "agentDid": "did:afal:agent:payment-agent-01",
    "accountId": "acct-agent-001"
  },
  "payee": {
    "did": "did:afal:agent:fraud-service-01",
    "address": "0xPayeeAddress"
  },
  "asset": "USDC",
  "amount": "45.00",
  "chain": "base",
  "purpose": {
    "category": "service-payment",
    "description": "fraud detection request #abc123",
    "referenceId": "svc-req-abc123"
  },
  "mandateRef": "mnd-0001",
  "policyRef": "pol-0001",
  "executionMode": "pre-authorized",
  "challengeState": "not-required",
  "status": "created",
  "expiresAt": "2026-03-24T12:10:00Z",
  "nonce": "n-0001",
  "createdAt": "2026-03-24T12:00:00Z"
}
```

## Execution Mode Values
- `human-in-the-loop`
- `pre-authorized`
- `fully-agent-native`

## Challenge State Values
- `not-required`
- `required`
- `pending`
- `passed`
- `failed`

## Status Values
- `created`
- `evaluating`
- `challenge-required`
- `approved`
- `rejected`
- `executing`
- `executed`
- `failed`
- `expired`
- `cancelled`

## Optional Extended Fields
```json
{
  "quoteRef": "quote-001",
  "routeRef": "route-001",
  "metadata": {
    "merchantId": "merchant-123",
    "serviceClass": "fraud-detection"
  },
  "receiptRef": "rcpt-001",
  "txHash": "0x..."
}
```

## Minimal APIs
- `createPaymentIntent`
- `evaluatePaymentIntent`
- `triggerChallengeForIntent`
- `resolveIntentChallenge`
- `executePaymentIntent`
- `getPaymentIntent`
- `getPaymentReceipt`
