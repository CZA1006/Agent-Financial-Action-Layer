# AFAL Payment Intent Schema

## Status
Draft v0.1

## Purpose
Defines the Payment Intent schema used by AFAL.

## Phase 1 Conventions

- Actor and counterparty references follow `docs/specs/afal-shared-conventions.md`.
- `policyRef` resolves to a `PolicyCredential` `id`.
- Authorization decisions, challenge records, settlement records, and receipts are modeled as separate objects referenced by ID.

## Payment Intent Schema
```json
{
  "intentId": "payint-0001",
  "schemaVersion": "0.1",
  "intentType": "payment",
  "payer": {
    "agentDid": "did:afal:agent:payment-agent-01",
    "accountId": "acct-agent-001"
  },
  "payee": {
    "payeeDid": "did:afal:agent:fraud-service-01",
    "settlementAddress": "0xPayeeAddress"
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
  "policyRef": "cred-policy-0001",
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
- `pending-approval`
- `approved`
- `rejected`
- `expired`
- `cancelled`

## Status Values
- `created`
- `evaluating`
- `challenge-required`
- `pending-approval`
- `approved`
- `rejected`
- `executing`
- `executed`
- `settled`
- `failed`
- `expired`
- `cancelled`

## Optional Extended Fields
```json
{
  "decisionRef": "dec-0001",
  "challengeRef": "chall-0001",
  "settlementRef": "stl-0001",
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
