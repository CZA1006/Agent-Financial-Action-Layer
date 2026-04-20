# AIP VC Schema

## Status
Draft v0.1

## Purpose
Defines the credential schemas used by AIP (Agent Identity Passport).

## Phase 1 Conventions

- All credentials use the common envelope below.
- `credentialSubject.id` is the identity subject DID.
- `policyRef` used elsewhere in Phase 1 points to a `PolicyCredential` `id`.
- Compute/resource budgets remain ATS budget objects in Phase 1 and are not mandatory VC types.
- AFAL canonical examples use `did:afal:*` identifiers, but verification logic should remain compatible with DID-based execution identities such as `did:key`.

## Common Credential Envelope
```json
{
  "id": "cred-0001",
  "schemaVersion": "0.1",
  "type": ["VerifiableCredential", "OwnershipCredential"],
  "issuer": "did:afal:institution:merchant-co",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "expirationDate": "2027-03-24T12:00:00Z",
  "credentialSubject": {
    "id": "did:afal:agent:payment-agent-01"
  },
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

## Proof Interoperability

The canonical envelope below shows a `jws` field because Phase 1 schema work should stay neutral about exact proof serialization.

In local demos and bilateral execution profiles, the same credential can also be represented with an Ed25519 detached proof value:

```json
{
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-03-24T12:00:00Z",
    "verificationMethod": "did:key:z6MkissuerKey#z6MkissuerKey",
    "proofPurpose": "assertionMethod",
    "proofValue": "4f8c..."
  }
}
```

That profile is useful when:

- both parties already resolve the issuer DID directly
- the verifier wants a simple signed-payload check
- the goal is fast off-chain credential verification in a demo or test harness

## Credential Types

### OwnershipCredential
```json
{
  "id": "cred-own-0001",
  "type": ["VerifiableCredential", "OwnershipCredential"],
  "issuer": "did:afal:institution:merchant-co",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "credentialSubject": {
    "id": "did:afal:agent:payment-agent-01",
    "ownerDid": "did:afal:owner:alice-01",
    "institutionDid": "did:afal:institution:merchant-co",
    "relationshipType": "owns_and_controls",
    "agentType": "payment-agent",
    "environment": "production"
  }
}
```

### KycCredential / KybCredential
```json
{
  "id": "cred-kyc-0001",
  "type": ["VerifiableCredential", "KycCredential"],
  "issuer": "did:afal:institution:kyc-provider-01",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "credentialSubject": {
    "id": "did:afal:owner:alice-01",
    "kycStatus": "passed",
    "jurisdiction": "HK",
    "riskTier": "low",
    "providerRef": "prov-kyc-001"
  }
}
```

```json
{
  "id": "cred-kyb-0001",
  "type": ["VerifiableCredential", "KybCredential"],
  "issuer": "did:afal:institution:kyb-provider-01",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "credentialSubject": {
    "id": "did:afal:institution:merchant-co",
    "kybStatus": "passed",
    "jurisdiction": "UAE",
    "riskTier": "medium",
    "providerRef": "prov-kyb-101"
  }
}
```

### AuthorityCredential
```json
{
  "id": "cred-auth-0001",
  "type": ["VerifiableCredential", "AuthorityCredential"],
  "issuer": "did:afal:institution:merchant-co",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "credentialSubject": {
    "id": "did:afal:agent:payment-agent-01",
    "authorityClass": "payment-and-resource",
    "allowedActions": [
      "createPaymentIntent",
      "createResourceIntent",
      "executePayment",
      "settleResourceUsage"
    ],
    "scope": {
      "payments": true,
      "resourceSettlement": true,
      "trading": false
    }
  }
}
```

### PolicyCredential
```json
{
  "id": "cred-policy-0001",
  "type": ["VerifiableCredential", "PolicyCredential"],
  "issuer": "did:afal:institution:merchant-co",
  "issuanceDate": "2026-03-24T12:00:00Z",
  "credentialSubject": {
    "id": "did:afal:agent:payment-agent-01",
    "singlePaymentLimit": "100.00",
    "dailyPaymentLimit": "1000.00",
    "allowedAssets": ["USDC"],
    "allowedCounterparties": ["did:afal:agent:fraud-service-01"],
    "allowedProviders": ["did:afal:institution:provider-openai"],
    "allowedChains": ["base"],
    "challengeThreshold": "250.00"
  }
}
```

## Policy Ownership

In Phase 1:

- mandates define action class and coarse scope
- `PolicyCredential` externalizes reusable constraints
- `policyRef` resolves to a `PolicyCredential` `id`
- effective authorization is the intersection of mandate scope and policy constraints
- if mandate and policy conflict, the stricter rule wins; irreconcilable conflicts must reject authorization

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

## Minimal Verification Steps

At minimum, AIP verification logic should:

1. resolve the issuer DID or AFAL identity record
2. obtain the issuer verification method
3. reconstruct the credential payload without `proof`
4. verify the signature over the canonicalized payload
5. check credential lifecycle status and expiration

That same sequence works for both:

- AFAL-native records under `did:afal:*`
- lightweight execution credentials under `did:key`
