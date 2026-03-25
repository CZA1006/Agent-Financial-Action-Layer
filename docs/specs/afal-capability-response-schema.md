# AFAL Capability Response Schema

## Status
Draft v0.1

## Purpose

Defines the structured response envelope returned by Phase 1 AFAL capability invocations.

## Capability Response

```json
{
  "responseId": "cap-0001",
  "schemaVersion": "0.1",
  "capability": "createPaymentIntent",
  "requestRef": "req-0001",
  "actionRef": "payint-0001",
  "result": "approved",
  "decisionRef": "dec-0001",
  "challengeRef": null,
  "settlementRef": null,
  "receiptRef": null,
  "message": "Payment intent created and approved",
  "respondedAt": "2026-03-24T12:05:00Z"
}
```

## Result Values

- `approved`
- `rejected`
- `challenge-required`
- `pending-approval`
- `suspended`
- `expired`

## Semantics

- `actionRef` points to the primary created or evaluated object
- `decisionRef` points to AMN evaluation output when authorization was performed
- `challengeRef` is present when trusted-surface action is required
- `settlementRef` and `receiptRef` are only populated when settlement and receipt generation occurred in the same flow

## Minimal APIs

- `respondToCapabilityInvocation`
- `getCapabilityResponse`
