# AIP VC Schema

## Status
Draft v0.1

## Purpose
Defines the credential schemas used by AIP (Agent Identity Passport).

## Common Credential Envelope
```json
{
  "id": "cred-0001",
  "type": ["VerifiableCredential", "OwnershipCredential"],
  "issuer": "did:afal:institution:merchant-co",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "expirationDate": "2027-03-24T12:00:00Z",
  "credentialSubject": {},
  "credentialStatus": {
    "id": "status-0001",
    "type": "StatusListEntry",
    "status": "active"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-03-24T12:00:00Z",
    "verificationMethod": "did:afal:institution:merchant-co#key-1",
    "proofPurpose": "assertionMethod",
    "jws": "..."
  }
}
```

## Credential Types
### OwnershipCredential
```json
{
  "id": "did:afal:agent:payment-agent-01",
  "ownerDid": "did:afal:owner:alice-01",
  "institutionDid": "did:afal:institution:merchant-co",
  "relationshipType": "owns_and_controls",
  "agentType": "payment-agent",
  "environment": "production"
}
```

### KycCredential / KybCredential
```json
{
  "id": "did:afal:owner:alice-01",
  "kycStatus": "passed",
  "jurisdiction": "HK",
  "riskTier": "low",
  "providerRef": "prov-kyc-001"
}
```

```json
{
  "id": "did:afal:institution:merchant-co",
  "kybStatus": "passed",
  "jurisdiction": "UAE",
  "riskTier": "medium",
  "providerRef": "prov-kyb-101"
}
```

### AuthorityCredential
```json
{
  "id": "did:afal:agent:payment-agent-01",
  "authorityClass": "payment-and-resource",
  "allowedActions": [
    "createPaymentIntent",
    "createResourceIntent",
    "executePayment"
  ],
  "scope": {
    "payments": true,
    "resourceSettlement": true,
    "trading": false
  }
}
```

### PolicyCredential
```json
{
  "id": "did:afal:agent:payment-agent-01",
  "singlePaymentLimit": "100.00",
  "dailyPaymentLimit": "1000.00",
  "allowedAssets": ["USDC"],
  "allowedCounterparties": ["did:afal:agent:fraud-service-01"],
  "allowedChains": ["base"],
  "challengeThreshold": "250.00"
}
```

### Token Economy Extensions
- `ComputeBudgetCredential`
- `ProviderAccessCredential`
- `ConversionCredential`
- `ReplenishmentCredential`
- `ExecutionClassCredential`

## Credential Status Values
- `active`
- `suspended`
- `expired`
- `revoked`

## Minimal API Actions
- `issueOwnershipCredential`
- `issueKycCredential`
- `issueKybCredential`
- `issueAuthorityCredential`
- `issuePolicyCredential`
- `verifyCredential`
- `getCredentialStatus`
- `suspendCredential`
- `revokeCredential`
