# AFAL Resource Intent Schema

## Status
Draft v0.1

## Purpose
Defines the Resource Intent schema used by AFAL.

## Phase 1 Conventions

- Resource budgets are ATS objects in Phase 1, not mandatory credential subjects.
- `policyRef` resolves to a `PolicyCredential` `id`.
- Authorization decisions, challenge records, settlement records, and receipts are modeled as separate objects referenced by ID.

## Resource Intent Schema
```json
{
  "intentId": "resint-0001",
  "schemaVersion": "0.1",
  "intentType": "resource",
  "requester": {
    "agentDid": "did:afal:agent:research-agent-01",
    "accountId": "acct-agent-002"
  },
  "provider": {
    "providerId": "provider-openai",
    "providerDid": "did:afal:institution:provider-openai"
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
    "type": "ats-budget",
    "reference": "budg-res-001"
  },
  "mandateRef": "mnd-0002",
  "policyRef": "cred-policy-0002",
  "executionMode": "pre-authorized",
  "challengeState": "not-required",
  "status": "created",
  "expiresAt": "2026-03-24T12:10:00Z",
  "nonce": "n-1001",
  "createdAt": "2026-03-24T12:00:00Z"
}
```

## Challenge State Values
- `not-required`
- `required`
- `pending-approval`
- `approved`
- `rejected`
- `expired`
- `cancelled`

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
  "decisionRef": "dec-0002",
  "challengeRef": "chall-0002",
  "usageReceiptRef": "usage-001",
  "settlementRef": "stl-0002",
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
