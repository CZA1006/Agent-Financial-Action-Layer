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

## Notes
Phase 1 may use an internal DID-like namespace while keeping future compatibility with a stricter DID method.
