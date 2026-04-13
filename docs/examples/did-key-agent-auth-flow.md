# `did:key` Agent Authentication Flow

## Purpose

This example captures the minimal DID execution flow that a local or bilateral AFAL demo can use before introducing fuller registry, anchoring, or multi-service identity infrastructure.

It is intentionally lightweight:

- Ed25519 keypairs
- `did:key` identifiers
- derived DID Documents
- Verifiable Credentials with Ed25519 proofs
- signed payment and acceptance messages

This is useful for:

- local bootstrap
- bilateral agent authentication
- interop-oriented demos
- validating AIP assumptions without requiring external DID infrastructure

## Flow Summary

### 1. Generate an Ed25519 keypair

Each agent starts with an Ed25519 signing key and public verification key.

### 2. Derive a `did:key`

The public key is encoded into a multibase / multicodec identifier:

```text
did:key:z6Mk...
```

This gives the agent an immediately resolvable execution DID.

### 3. Build the DID Document

Because `did:key` embeds the public key material, the DID Document can be derived directly from the DID:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "did:key:z6MkexampleAgentKey",
  "verificationMethod": [
    {
      "id": "did:key:z6MkexampleAgentKey#z6MkexampleAgentKey",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:key:z6MkexampleAgentKey",
      "publicKeyMultibase": "z6MkexampleAgentKey"
    }
  ],
  "authentication": ["did:key:z6MkexampleAgentKey#z6MkexampleAgentKey"],
  "assertionMethod": ["did:key:z6MkexampleAgentKey#z6MkexampleAgentKey"]
}
```

### 4. Resolve the peer DID

Before accepting a message, the receiving agent:

- checks that the DID uses the expected method
- decodes the public key from the DID
- reconstructs the peer DID Document
- extracts the verification method for signature checks

### 5. Issue a Verifiable Credential

One agent can issue a VC to another agent to express capability or service claims:

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "AgentServiceProvider"],
  "issuer": "did:key:z6MkissuerKey",
  "issuanceDate": "2026-04-13T00:00:00Z",
  "credentialSubject": {
    "id": "did:key:z6MksubjectKey",
    "service": "data_processing",
    "maxPayment": "100 USDC"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-04-13T00:00:00Z",
    "verificationMethod": "did:key:z6MkissuerKey#z6MkissuerKey",
    "proofPurpose": "assertionMethod",
    "proofValue": "4f8c..."
  }
}
```

### 6. Verify the VC

The verifier:

- resolves the issuer DID
- extracts the issuer public key
- reconstructs the VC payload without `proof`
- verifies the Ed25519 signature

This yields a simple but useful trust decision for payment or resource interactions.

### 7. Use DID auth in a payment flow

The same execution identity can be reused in a bilateral payment flow:

1. requester signs a `PaymentRequest`
2. provider resolves the requester DID and verifies the signature
3. provider signs an acceptance or authorization message
4. requester resolves the provider DID and verifies the response
5. settlement proceeds only after both signatures validate

### 8. Produce a dual-signed receipt

After settlement, both agents can sign the same receipt payload. That creates:

- a shared transaction record
- payer-side non-repudiation
- payee-side non-repudiation

## How This Maps To AFAL

This flow is not a replacement for AFAL's richer AIP model. It is a practical execution-layer profile that complements it:

- `did:key` gives fast local bootstrap and bilateral trust establishment
- `did:afal:*` remains the richer record used for lifecycle, governance, and treasury linkage
- VC issuance and verification logic in AIP can support both the internal namespace and interoperable DID-based execution flows

In other words:

- use `did:key` when an agent needs immediate cryptographic identity
- use `did:afal:*` when AFAL needs managed identity state

## Recommended Phase 1 Use

Use this profile for:

- local demos
- test harness identities
- bilateral proof-of-concept integrations
- external agent onboarding before full AFAL-native registration exists

Do not treat this profile alone as sufficient for:

- institutional lifecycle governance
- revocation registries
- treasury authorization state
- production-grade policy enforcement
