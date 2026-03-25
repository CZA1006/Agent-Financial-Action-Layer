# ATS Account and Treasury Schema

## Status
Draft v0.1

## Purpose

Defines the Phase 1 account, treasury, budget, and replenishment objects for ATS (Agent Treasury Stack).

## Phase 1 Scope

This schema covers:

- treasury account
- agent operating account
- settlement account
- monetary budgets
- resource budgets / quotas
- replenishment policy
- freeze state
- account status lifecycle

## Account Types

- `treasury`
- `operating`
- `settlement`

## Common Account Record

```json
{
  "accountId": "acct-agent-001",
  "schemaVersion": "0.1",
  "accountType": "operating",
  "status": "active",
  "ownerDid": "did:afal:owner:alice-01",
  "institutionDid": "did:afal:institution:merchant-co",
  "agentDid": "did:afal:agent:payment-agent-01",
  "parentAccountRef": "acct-treasury-001",
  "chain": "base",
  "settlementAsset": "USDC",
  "accountAddress": "0xAgentAccount",
  "smartAccount": {
    "standard": "erc-4337-compatible",
    "factoryRef": "acct-factory-base-01"
  },
  "freezeState": {
    "isFrozen": false,
    "reasonCode": null,
    "frozenAt": null
  },
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:00:00Z"
}
```

## Treasury Account

Treasury accounts are root capital pools.

Required properties:

- `accountType = treasury`
- controlled by owner or institution
- funds operating accounts
- cannot be directly treated as unrestricted agent spend balance

## Agent Operating Account

Operating accounts are the primary execution accounts for agents.

Required properties:

- `accountType = operating`
- linked to exactly one `agentDid`
- bounded by budget and mandate checks
- can spend within approved limits
- cannot imply unrestricted withdrawal rights

## Settlement Account

Settlement accounts are dedicated reconciliation endpoints.

Required properties:

- `accountType = settlement`
- used for netting, withdrawal, or provider settlement paths
- may enforce stricter challenge or withdrawal rules than operating accounts

## Account Status Values

- `proposed`
- `pending-funding`
- `active`
- `restricted`
- `frozen`
- `closed`
- `revoked`

## Monetary Budget

```json
{
  "budgetId": "budg-money-001",
  "budgetType": "monetary",
  "subjectDid": "did:afal:agent:payment-agent-01",
  "accountRef": "acct-agent-001",
  "asset": "USDC",
  "period": "daily",
  "limitAmount": "1000.00",
  "consumedAmount": "45.00",
  "availableAmount": "955.00",
  "status": "active",
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:05:00Z"
}
```

## Resource Budget

```json
{
  "budgetId": "budg-res-001",
  "budgetType": "resource",
  "subjectDid": "did:afal:agent:research-agent-01",
  "accountRef": "acct-agent-002",
  "resourceClass": "inference",
  "resourceUnit": "tokens",
  "period": "daily",
  "limitQuantity": 1000000,
  "consumedQuantity": 500000,
  "availableQuantity": 500000,
  "maxSpendAmount": "50.00",
  "pricingAsset": "USDC",
  "status": "active",
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:05:00Z"
}
```

## Resource Quota

```json
{
  "quotaId": "quota-001",
  "subjectDid": "did:afal:agent:research-agent-01",
  "providerId": "provider-openai",
  "providerDid": "did:afal:institution:provider-openai",
  "resourceClass": "inference",
  "resourceUnit": "tokens",
  "period": "daily",
  "maxQuantity": 1000000,
  "usedQuantity": 500000,
  "status": "active",
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:05:00Z"
}
```

## Replenishment Policy

```json
{
  "replenishmentPolicyId": "repl-001",
  "budgetRef": "budg-res-001",
  "mode": "manual-only",
  "triggerThreshold": 200000,
  "topUpAmount": 300000,
  "requiresChallenge": false,
  "status": "active",
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:00:00Z"
}
```

Mode values:

- `manual-only`
- `threshold-auto`
- `policy-gated-auto`
- `disabled`

## Freeze State

```json
{
  "isFrozen": true,
  "reasonCode": "incident-review",
  "frozenBy": "did:afal:institution:merchant-co",
  "frozenAt": "2026-03-24T12:06:00Z",
  "reviewRef": "case-001"
}
```

## Funding and Settlement Relationships

Canonical Phase 1 paths:

- treasury account -> operating account
- operating account -> service or provider counterparty
- operating account -> settlement account
- resource budget -> provider usage settlement

## Minimal APIs

- `createTreasuryAccount`
- `createAgentOperatingAccount`
- `createSettlementAccount`
- `getAccountState`
- `freezeAccount`
- `unfreezeAccount`
- `allocateBudget`
- `setResourceQuota`
- `setReplenishmentPolicy`
- `getBudgetState`
