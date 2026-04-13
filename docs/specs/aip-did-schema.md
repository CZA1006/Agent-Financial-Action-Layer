# AIP DID Schema

## Status
Draft v0.1

## Purpose
Defines the initial DID-oriented identity schema for AIP (Agent Identity Passport).

## Subject Types
- `owner`
- `institution`
- `agent`

## Identifier Format
```text
did:afal:<subject-type>:<id>
```
Examples:
- `did:afal:owner:8a2d9f3c`
- `did:afal:institution:corp-001`
- `did:afal:agent:payment-agent-01`

## Interoperability Note

Phase 1 uses `did:afal:*` as the canonical internal namespace for AFAL-owned records.

For local execution and bilateral interoperability, AFAL can also accept an execution-layer DID profile based on `did:key`:

```text
did:key:z6Mk...
```

That profile is especially useful when:

- an agent needs immediate self-certifying identity
- a demo should not depend on an external DID registry
- the verifier only needs public-key resolution plus signature verification

The two layers serve different purposes:

- `did:afal:*` for AFAL-managed lifecycle state
- `did:key` for portable cryptographic execution identity

## Identity Record Schema
```json
{
  "id": "did:afal:agent:payment-agent-01",
  "subjectType": "agent",
  "status": "active",
  "controller": ["did:afal:owner:8a2d9f3c"],
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:00:00Z",
  "verificationMethods": [
    {
      "id": "key-1",
      "type": "ed25519",
      "publicKeyMultibase": "z6Mk..."
    }
  ],
  "serviceEndpoints": [
    {
      "id": "primary-api",
      "type": "agent-api",
      "serviceEndpoint": "https://example.com/agent/payment-agent-01"
    }
  ],
  "metadata": {
    "displayName": "Payment Agent 01",
    "environment": "production",
    "version": "0.1.0"
  }
}
```

## Status Values
- `proposed`
- `created`
- `active`
- `restricted`
- `frozen`
- `revoked`
- `retired`

## Owner-Agent Binding Schema
```json
{
  "bindingId": "bind-0001",
  "ownerDid": "did:afal:owner:8a2d9f3c",
  "agentDid": "did:afal:agent:payment-agent-01",
  "institutionDid": "did:afal:institution:merchant-co",
  "relationshipType": "owns_and_controls",
  "status": "active",
  "createdAt": "2026-03-24T12:00:00Z",
  "updatedAt": "2026-03-24T12:00:00Z"
}
```

Relationship types:
- `owns`
- `controls`
- `owns_and_controls`
- `governs`
- `delegates_to`

## Minimal APIs
- `createOwnerDid`
- `createInstitutionDid`
- `createAgentDid`
- `resolveIdentity`
- `bindAgentToOwner`
- `freezeIdentity`
- `revokeIdentity`
- `rotateVerificationKey`

## Minimal `did:key` Resolution Profile

When AIP accepts a `did:key` execution identity, resolution can be reduced to:

1. confirm the identifier starts with `did:key:z`
2. multibase / base58btc decode the identifier suffix
3. confirm the expected multicodec prefix for the key type
4. extract the raw public key bytes
5. reconstruct a DID Document for verification relationships

For an Ed25519 public key, the derived verification method can look like:

```json
{
  "id": "did:key:z6MkexampleAgentKey#z6MkexampleAgentKey",
  "type": "Ed25519VerificationKey2020",
  "controller": "did:key:z6MkexampleAgentKey",
  "publicKeyMultibase": "z6MkexampleAgentKey"
}
```

This is sufficient for:

- request authentication
- VC proof verification
- bilateral signature exchange in payment or resource flows

## Notes
Phase 1 uses an internal DID-like namespace while keeping compatibility with stricter DID methods and lightweight execution profiles such as `did:key`.
