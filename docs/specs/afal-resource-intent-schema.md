# AFAL Resource Intent Schema

## Status
Draft v0.1

## Purpose
Defines the Resource Intent schema used by AFAL.

## Resource Intent Schema
```json
{
  "intentId": "resint-0001",
  "intentType": "resource",
  "requester": {
    "agentDid": "did:afal:agent:research-agent-01",
    "accountId": "acct-agent-002"
  },
  "provider": {
    "providerId": "provider-openai",
    "payeeDid": "did:afal:institution:provider-openai"
  },
  "resource": {
    "resourceClass": "inference",
    "resourceUnit": "tokens",
    "quantity": 500000
  },
  "pricing": {
    "maxSpend": "50.00",
    "asset": "USDC"
  },
  "budgetSource": {
    "type": "compute-budget",
    "reference": "cred-cb-001"
  },
  "mandateRef": "mnd-0002",
  "policyRef": "pol-0002",
  "executionMode": "pre-authorized",
  "challengeState": "not-required",
  "status": "created",
  "expiresAt": "2026-03-24T12:10:00Z",
  "nonce": "n-1001",
  "createdAt": "2026-03-24T12:00:00Z"
}
```

## Resource Classes
- `inference`
- `embedding`
- `search`
- `tool-call`
- `provider-credit`

## Resource Units
- `tokens`
- `calls`
- `credits`
- `minutes`

## Status Values
- `created`
- `evaluating`
- `challenge-required`
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
  "conversionRef": "conv-001",
  "providerQuoteRef": "provquote-001",
  "usageReceiptRef": "usage-001",
  "settlementRef": "settle-001",
  "metadata": {
    "workflowId": "wf-123",
    "taskClass": "research"
  }
}
```

## Minimal APIs
- `createResourceIntent`
- `evaluateResourceIntent`
- `triggerResourceChallenge`
- `resolveResourceChallenge`
- `executeResourceIntent`
- `settleResourceUsage`
- `getResourceIntent`
- `getResourceReceipt`
- `getResourceSettlement`
