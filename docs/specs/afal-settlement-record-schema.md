# AFAL Settlement Record Schema

## Status
Draft v0.1

## Purpose

Defines the shared settlement record object used to describe payment or resource settlement outcomes.

## Settlement Types

- `onchain-transfer`
- `provider-settlement`
- `internal-ledger`

## Settlement Record

```json
{
  "settlementId": "stl-0001",
  "schemaVersion": "0.1",
  "settlementType": "onchain-transfer",
  "actionRef": "payint-0001",
  "decisionRef": "dec-0001",
  "sourceAccountRef": "acct-agent-001",
  "destination": {
    "payeeDid": "did:afal:agent:fraud-service-01",
    "settlementAddress": "0xPayeeAddress"
  },
  "asset": "USDC",
  "amount": "45.00",
  "chain": "base",
  "txHash": "0xabc123",
  "status": "settled",
  "executedAt": "2026-03-24T12:06:00Z",
  "settledAt": "2026-03-24T12:06:10Z"
}
```

## Status Values

- `pending`
- `executing`
- `settled`
- `failed`
- `reversed`

## Resource Settlement Example

```json
{
  "settlementId": "stl-0002",
  "settlementType": "provider-settlement",
  "actionRef": "resint-0001",
  "decisionRef": "dec-0002",
  "sourceAccountRef": "acct-agent-002",
  "destination": {
    "providerId": "provider-openai",
    "providerDid": "did:afal:institution:provider-openai"
  },
  "asset": "USDC",
  "amount": "18.50",
  "status": "settled",
  "executedAt": "2026-03-24T12:06:00Z",
  "settledAt": "2026-03-24T12:06:10Z"
}
```

## Minimal APIs

- `createSettlementRecord`
- `getSettlementRecord`
- `updateSettlementStatus`
