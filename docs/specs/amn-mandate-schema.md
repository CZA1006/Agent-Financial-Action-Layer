# AMN Mandate Schema

## Status
Draft v0.1

## Purpose
Defines the mandate schema for AMN (Agent Mandate Network).

## Phase 1 Conventions

- `policyRef` resolves to a `PolicyCredential` `id` in Phase 1.
- Mandates define action scope; policy credentials externalize reusable constraints.
- Effective authorization uses the intersection of mandate scope and policy constraints.
- If mandate and policy disagree, the stricter rule wins; irreconcilable conflicts reject the action.

## Common Mandate Envelope
```json
{
  "mandateId": "mnd-0001",
  "schemaVersion": "0.1",
  "mandateType": "payment",
  "issuer": "did:afal:owner:alice-01",
  "subject": "did:afal:agent:payment-agent-01",
  "status": "active",
  "issuedAt": "2026-03-24T12:00:00Z",
  "expiresAt": "2026-04-24T12:00:00Z",
  "scope": {},
  "policyRef": "cred-policy-0001",
  "challengeRules": {},
  "metadata": {},
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-03-24T12:00:00Z",
    "verificationMethod": "did:afal:owner:alice-01#key-1",
    "proofPurpose": "assertionMethod",
    "jws": "..."
  }
}
```

## Mandate Types
- `payment`
- `resource`
- `trade`
- `venue-access`
- `settlement`

## Status Values
- `draft`
- `issued`
- `active`
- `challenged`
- `suspended`
- `expired`
- `revoked`

## Payment Mandate Scope
```json
{
  "allowedAssets": ["USDC"],
  "allowedCounterparties": ["did:afal:agent:fraud-service-01"],
  "singlePaymentLimit": "100.00",
  "dailyPaymentLimit": "1000.00",
  "allowedChains": ["base"],
  "withdrawalAllowed": false
}
```

## Resource Mandate Scope
```json
{
  "resourceClass": "inference",
  "allowedProviders": [
    "did:afal:institution:provider-openai",
    "did:afal:institution:provider-anthropic"
  ],
  "dailyTokenLimit": 1000000,
  "maxSpendPerRequest": "50.00",
  "autoRefillAllowed": false
}
```

## Trade Mandate Scope
```json
{
  "allowedAssets": ["ETH", "USDC"],
  "allowedVenues": ["venue-uniswap", "venue-cowswap"],
  "maxTradeValue": "1000.00",
  "maxDailyNotional": "5000.00",
  "leverageAllowed": false
}
```

## Challenge Rules
```json
{
  "valueThreshold": "250.00",
  "newCounterpartyRequiresChallenge": true,
  "newAssetRequiresChallenge": true,
  "newVenueRequiresChallenge": true,
  "highResourceUsageRequiresChallenge": true
}
```

## Authorization Decision Output
```json
{
  "decisionId": "dec-0001",
  "actionRef": "payint-0001",
  "subjectDid": "did:afal:agent:payment-agent-01",
  "mandateId": "mnd-0001",
  "actionType": "payment",
  "result": "approved",
  "challengeState": "not-required",
  "policyRef": "cred-policy-0001",
  "evaluatedAt": "2026-03-24T12:05:00Z"
}
```

Result values:
- `approved`
- `rejected`
- `challenge-required`
- `pending-approval`
- `suspended`
- `expired`
- `revoked`

## Minimal APIs
- `createMandate`
- `getMandate`
- `verifyMandate`
- `suspendMandate`
- `revokeMandate`
- `evaluateActionAgainstMandate`
- `triggerChallenge`
- `resolveChallenge`
- `recordAuthorizationDecision`
