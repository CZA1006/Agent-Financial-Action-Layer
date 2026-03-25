# AFAL Approval and Challenge Schema

## Status
Draft v0.1

## Purpose

Defines the shared challenge, approval context, and approval result objects used by AMN, the trusted surface, and AFAL action outputs.

## Challenge Record

```json
{
  "challengeId": "chall-0001",
  "schemaVersion": "0.1",
  "actionRef": "payint-0001",
  "actionType": "payment",
  "subjectDid": "did:afal:agent:payment-agent-01",
  "mandateRef": "mnd-0001",
  "policyRef": "cred-policy-0001",
  "state": "pending-approval",
  "reasonCode": "new-counterparty",
  "riskSignals": [
    "new-counterparty",
    "amount-above-threshold"
  ],
  "trustedSurfaceRef": "trusted-surface:web",
  "approvalContextRef": "ctx-0001",
  "createdAt": "2026-03-24T12:05:00Z",
  "updatedAt": "2026-03-24T12:05:00Z",
  "expiresAt": "2026-03-24T12:15:00Z"
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

## Approval Context

```json
{
  "approvalContextId": "ctx-0001",
  "challengeRef": "chall-0001",
  "actionRef": "payint-0001",
  "actionType": "payment",
  "headline": "Approve payment to fraud-service-01",
  "summary": "45.00 USDC on Base to a new service counterparty",
  "subjectDid": "did:afal:agent:payment-agent-01",
  "humanVisibleFields": {
    "payerAccountRef": "acct-agent-001",
    "payeeDid": "did:afal:agent:fraud-service-01",
    "asset": "USDC",
    "amount": "45.00",
    "chain": "base",
    "purpose": "fraud detection request #abc123",
    "mandateRef": "mnd-0001",
    "policyRef": "cred-policy-0001",
    "riskSignals": [
      "new-counterparty",
      "amount-above-threshold"
    ]
  },
  "createdAt": "2026-03-24T12:05:00Z"
}
```

## Approval Result

```json
{
  "approvalResultId": "apr-0001",
  "challengeRef": "chall-0001",
  "actionRef": "payint-0001",
  "result": "approved",
  "approvedBy": "did:afal:owner:alice-01",
  "approvalChannel": "trusted-surface:web",
  "stepUpAuthUsed": true,
  "comment": "Known provider; approve for this request",
  "approvalReceiptRef": "rcpt-approval-0001",
  "decidedAt": "2026-03-24T12:07:00Z"
}
```

Result values:

- `approved`
- `rejected`
- `expired`
- `cancelled`

## Minimal APIs

- `createChallengeRecord`
- `getChallenge`
- `getApprovalContext`
- `approveChallenge`
- `rejectChallenge`
- `expireChallenge`
