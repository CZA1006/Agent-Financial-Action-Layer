# AFAL Shared Conventions

## Status
Draft v0.1

## Purpose

Defines shared naming and structural conventions for Phase 1 AFAL schemas.

These conventions apply to:

- AIP DID and VC objects
- AMN mandates and decisions
- ATS accounts, budgets, and quotas
- AFAL payment/resource intents
- challenge, settlement, and receipt outputs

## Canonical Phase 1 Flow

```text
Owner/Institution
  -> Agent DID + VC
  -> Mandate
  -> Treasury/Budget
  -> Payment Intent or Resource Intent
  -> Authorization Decision / Challenge
  -> Settlement
  -> Receipt
```

## Identifier Conventions

Recommended identifier prefixes:

- DID: `did:afal:<subject-type>:<id>`
- credential: `cred-...`
- mandate: `mnd-...`
- account: `acct-...`
- budget: `budg-...`
- quota: `quota-...`
- replenishment policy: `repl-...`
- decision: `dec-...`
- challenge: `chall-...`
- settlement: `stl-...`
- receipt: `rcpt-...`
- capability response / invocation: `cap-...`

## Timestamp Conventions

- timestamps use RFC 3339 / ISO 8601 UTC strings
- field names use `createdAt`, `updatedAt`, `issuedAt`, `evaluatedAt`, `executedAt`, `settledAt`, `expiresAt`

## Numeric Conventions

- money values are decimal strings, for example `"45.00"`
- integer resource counts use numbers, for example `500000`
- percentages and slippage values use explicit unit suffixes when applicable, for example `maxSlippageBps`

## Enum Conventions

- enum values use lowercase kebab-case
- status values describe lifecycle state
- result values describe decision outcome
- `Ref` fields are identifiers only, not embedded objects

## `Ref` Semantics

In Phase 1, a field ending in `Ref` resolves to an off-chain object identifier unless explicitly documented otherwise.

Examples:

- `policyRef` -> `PolicyCredential.id`
- `mandateRef` -> `Mandate.mandateId`
- `decisionRef` -> `AuthorizationDecision.decisionId`
- `challengeRef` -> `ChallengeRecord.challengeId`
- `settlementRef` -> `SettlementRecord.settlementId`
- `receiptRef` -> `ActionReceipt.receiptId`

## Actor Reference Shapes

### Agent Actor
```json
{
  "agentDid": "did:afal:agent:payment-agent-01",
  "accountId": "acct-agent-001"
}
```

### Counterparty
```json
{
  "payeeDid": "did:afal:agent:fraud-service-01",
  "settlementAddress": "0xPayeeAddress"
}
```

### Provider
```json
{
  "providerId": "provider-openai",
  "providerDid": "did:afal:institution:provider-openai"
}
```

## Policy Ownership

Phase 1 uses two layers:

- mandates define action class and coarse scope
- policy credentials define reusable externalized constraints

Effective authorization is the intersection of both layers.

If the two layers conflict:

- the stricter rule wins
- irreconcilable conflicts reject the action

## Shared Outcome Vocabulary

### Authorization result values
- `approved`
- `rejected`
- `challenge-required`
- `pending-approval`
- `suspended`
- `expired`

### Challenge state values
- `not-required`
- `required`
- `pending-approval`
- `approved`
- `rejected`
- `expired`
- `cancelled`

### Common action status values
- `created`
- `evaluating`
- `challenge-required`
- `pending-approval`
- `approved`
- `rejected`
- `executing`
- `executed`
- `settled`
- `failed`
- `expired`
- `cancelled`
