# AFAL Authorization Decision Schema

## Status
Draft v0.1

## Purpose

Defines the shared authorization decision object returned after AMN evaluates a payment or resource action.

## Authorization Decision

```json
{
  "decisionId": "dec-0001",
  "schemaVersion": "0.1",
  "actionRef": "payint-0001",
  "actionType": "payment",
  "subjectDid": "did:afal:agent:payment-agent-01",
  "mandateRef": "mnd-0001",
  "policyRef": "cred-policy-0001",
  "accountRef": "acct-agent-001",
  "result": "approved",
  "challengeState": "not-required",
  "reasonCode": "within-policy",
  "evaluatedAt": "2026-03-24T12:05:00Z",
  "expiresAt": "2026-03-24T12:10:00Z",
  "auditRef": "audit-0001"
}
```

## Result Values

- `approved`
- `rejected`
- `challenge-required`
- `pending-approval`
- `suspended`
- `expired`

## Decision Rules

- `approved` means the action may proceed within the current validity window
- `challenge-required` means a challenge record must be created
- `pending-approval` means the action is suspended until trusted-surface resolution
- `rejected` means execution must not continue
- `suspended` and `expired` are terminal for the current action request

## Minimal APIs

- `evaluateAuthorization`
- `getAuthorizationDecision`
- `recordAuthorizationDecision`
