# AFAL Receipt Schema

## Status
Draft v0.1

## Purpose

Defines the shared receipt objects emitted after approval or settlement outcomes.

## Receipt Types

- `payment`
- `resource`
- `approval`

## Common Receipt Envelope

```json
{
  "receiptId": "rcpt-0001",
  "schemaVersion": "0.1",
  "receiptType": "payment",
  "actionRef": "payint-0001",
  "decisionRef": "dec-0001",
  "settlementRef": "stl-0001",
  "status": "final",
  "issuedAt": "2026-03-24T12:06:10Z",
  "evidence": {}
}
```

## Payment Receipt

```json
{
  "receiptId": "rcpt-pay-0001",
  "receiptType": "payment",
  "actionRef": "payint-0001",
  "decisionRef": "dec-0001",
  "settlementRef": "stl-0001",
  "status": "final",
  "evidence": {
    "payerAccountRef": "acct-agent-001",
    "payeeDid": "did:afal:agent:fraud-service-01",
    "asset": "USDC",
    "amount": "45.00",
    "chain": "base",
    "txHash": "0xabc123"
  },
  "issuedAt": "2026-03-24T12:06:10Z"
}
```

## Resource Receipt

```json
{
  "receiptId": "rcpt-res-0001",
  "receiptType": "resource",
  "actionRef": "resint-0001",
  "decisionRef": "dec-0002",
  "settlementRef": "stl-0002",
  "status": "final",
  "evidence": {
    "providerId": "provider-openai",
    "resourceClass": "inference",
    "resourceUnit": "tokens",
    "quantity": 500000,
    "asset": "USDC",
    "amount": "18.50"
  },
  "issuedAt": "2026-03-24T12:06:10Z"
}
```

## Approval Receipt

```json
{
  "receiptId": "rcpt-approval-0001",
  "receiptType": "approval",
  "actionRef": "payint-0001",
  "decisionRef": "dec-0001",
  "status": "final",
  "evidence": {
    "challengeRef": "chall-0001",
    "approvedBy": "did:afal:owner:alice-01",
    "approvalChannel": "trusted-surface:web",
    "comment": "Approved after review"
  },
  "issuedAt": "2026-03-24T12:07:00Z"
}
```

## Status Values

- `provisional`
- `final`
- `void`

## Minimal APIs

- `createReceipt`
- `getReceipt`
