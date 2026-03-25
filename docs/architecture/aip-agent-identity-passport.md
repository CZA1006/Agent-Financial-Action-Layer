# AIP — Agent Identity Passport

## Purpose

AIP (Agent Identity Passport) is the identity and credential substrate of AFAL.

Its role is to define:
- who an owner is
- who an institution is
- who an agent is
- how ownership and control are represented
- how identity-related credentials are issued, verified, revoked, and rotated

AIP is the first layer of AFAL because no financial action should occur before the acting entity can be identified and its authority can be traced.

---

## Why AIP Exists

Traditional finance assumes identity through:
- legal persons
- banks
- broker accounts
- KYC systems
- organizational hierarchy

Agent-native finance cannot make those assumptions implicitly.

An agent should not be treated as:
- only a wallet address
- only an API client
- only a software process

An agent must become a first-class digital financial actor with:
- a persistent identity
- a relationship to an owner or institution
- verifiable credentials
- lifecycle controls
- revocation / freeze semantics
- future compatibility with mandates, treasury, and settlement

AIP provides this identity substrate.

---

## Core Design Goals

AIP is designed to provide:

1. **Persistent identity**
   - agents should not be reducible to ephemeral execution sessions

2. **Owner-agent binding**
   - every agent must be attributable to an owner, institution, or control domain

3. **Verifiable claims**
   - identity-related facts must be represented through structured credentials

4. **Lifecycle control**
   - identities and credentials must support issuance, update, revocation, freeze, and rotation

5. **Protocol interoperability**
   - AIP should align with DID / VC design patterns and support future integrations

6. **Financial-grade traceability**
   - identity should support later use in payment, resource, settlement, and trading flows

---

## Scope

AIP includes:

- identity model
- DID model
- ownership model
- institution model
- credential model
- identity lifecycle
- verification model
- revocation and rotation model

AIP does **not** include:
- payment execution
- resource settlement
- treasury logic
- challenge flows
- market access or venue adapters

Those belong to other AFAL modules.

---

## Identity Subjects

AIP recognizes three primary identity subjects:

### 1. Owner
A natural person or governing principal.

Examples:
- an individual user
- an operator
- a human account holder
- a delegated manager

### 2. Institution
A legal or organizational entity.

Examples:
- a company
- a treasury organization
- a fund structure
- a merchant organization
- a protocol operator

### 3. Agent
A software entity capable of financial actions.

Examples:
- payment agent
- treasury agent
- service purchasing agent
- market execution agent
- settlement agent
- internal automation agent

---

## Identity Model

The AIP model should allow the following relationships:

- Owner → owns / controls → Agent
- Institution → governs / authorizes → Agent
- Owner → belongs to / acts for → Institution
- Agent → acts under authority from → Owner / Institution

This means identity is not only about naming a subject.  
It is also about defining the control graph.

---

## DID-Oriented Structure

AIP is designed around a DID-compatible model.

At minimum, the system should support:

- **Owner DID**
- **Institution DID**
- **Agent DID**

Each DID should have:
- unique identifier
- controller reference
- verification methods
- service references
- metadata
- lifecycle state

### Minimal DID Responsibilities

A DID in AIP should support:
- create
- resolve
- update metadata
- rotate keys
- freeze
- revoke / deactivate

---

## DID Document Considerations

Each DID should be associated with a DID-like document or equivalent identity record.

At minimum, the document should support:

- `id`
- `controller`
- `verificationMethods`
- `serviceEndpoints`
- `status`
- `createdAt`
- `updatedAt`
- `revocationRef` (optional)

### Example conceptual fields

- identifier
- subject type
- controller
- signing keys
- encryption keys
- service endpoints
- allowed verification relationships
- current status

---

## Ownership Model

Ownership is a first-class concept in AIP.

The system must be able to prove:
- which owner created the agent
- which institution authorizes the agent
- whether ownership changed
- whether the agent is still valid

### Ownership can be direct or indirect

#### Direct ownership
A user creates an agent and directly controls it.

#### Institutional ownership
A company or governed treasury creates the agent, while specific human operators may manage it indirectly.

#### Delegated ownership
The owner delegates operational control to another layer without transferring ultimate authority.

---

## Credential Model

AIP uses verifiable-credential-style objects to represent claims about identity subjects.

### Core Credential Types

#### 1. Ownership Credential
Proves that an agent belongs to an owner or institution.

Possible fields:
- credential id
- issuer
- subject (agent DID)
- owner DID
- institution DID (optional)
- agent type
- issuedAt
- expiry
- status

#### 2. KYC / KYB Credential
Proves that the owner or institution passed compliance checks.

Possible fields:
- credential id
- issuer
- subject DID
- KYC/KYB status
- jurisdiction
- risk tier
- issuedAt
- expiry
- status

#### 3. Authority Credential
Represents what this agent may do.

Possible fields:
- credential id
- issuer
- subject (agent DID)
- authority class
- scope
- validity window
- status

#### 4. Policy Credential
Represents financial and operational boundaries.

Possible fields:
- spend limits
- asset whitelist
- counterparty whitelist
- chain / venue restrictions
- challenge threshold
- expiry
- revocation status

### Extended Credential Types

To support token economy and Web4 resource budgets, AIP may later include:

- Compute Budget Credential
- Provider Access Credential
- Conversion Credential
- Replenishment Credential
- Execution Class Credential

---

## Lifecycle Model

Identity objects in AIP must support a clear lifecycle.

### Agent Lifecycle States
Example state progression:

- proposed
- created
- active
- restricted
- frozen
- revoked
- retired

### Credential Lifecycle States
Example state progression:

- issued
- active
- suspended
- expired
- revoked

### Key Lifecycle
Identity keys should support:
- issuance
- rotation
- deactivation
- emergency replacement

---

## Verification Model

AIP should support verification at multiple layers:

### Identity Verification
Check whether the DID / identity exists and is active.

### Credential Verification
Check whether a credential:
- was issued by a trusted issuer
- is unexpired
- is unrevoked
- matches the subject
- is valid for the requested context

### Relationship Verification
Check whether:
- this owner controls this agent
- this institution governs this agent
- this agent is authorized to operate in this domain

---

## Revocation and Freeze

AIP must support operational safety controls.

### Freeze
Temporary action that blocks use of identity or credentials without permanent deletion.

Used for:
- suspicious behavior
- review periods
- temporary incident response

### Revoke
Permanent invalidation of an identity credential or relationship.

Used for:
- ownership termination
- compromise
- policy breach
- entity retirement

### Rotate
Controlled update of keys or identity-linked control data.

Used for:
- routine key rotation
- post-compromise recovery
- operational upgrade

---

## Trust Model

AIP should not assume that all issuers are equal.

The system should define:
- trusted issuers
- issuer classes
- verification requirements
- accepted credential types
- rejection behavior for unknown issuers

This becomes increasingly important when integrating:
- external KYC providers
- institutions
- partner ecosystems
- future agent networks

---

## Minimal MVP Requirements

Phase 1 AIP should support:

- Owner DID
- Agent DID
- owner-agent binding
- Ownership Credential
- KYC/KYB Credential
- Authority Credential
- Policy Credential
- verification API
- revocation API
- freeze / rotate hooks

### Out of Scope for MVP
- full reputation graph
- cross-chain DID network
- advanced selective disclosure
- complex institution hierarchy
- identity marketplace

---

## Suggested Interfaces

### Core identity actions
- createOwnerDid
- createAgentDid
- bindAgentToOwner
- resolveIdentity
- freezeAgent
- revokeAgent
- rotateIdentityKey

### Credential actions
- issueOwnershipCredential
- issueKycCredential
- issueAuthorityCredential
- issuePolicyCredential
- verifyCredential
- revokeCredential

---

## Open Questions

1. Should AFAL define its own DID method or use a simplified internal identity model first?
2. Which identity fields should be anchored on-chain vs stored off-chain?
3. Which credential status checks should be on-chain vs off-chain?
4. How should institution control and owner control differ in the data model?
5. What is the minimum credential set required for MVP scenarios?

---

## Summary

AIP is the identity foundation of AFAL.

It turns owners, institutions, and agents into verifiable financial actors by providing:
- persistent identifiers
- ownership relationships
- verifiable credentials
- lifecycle control
- revocation and traceability

Without AIP, AFAL would only have wallets and APIs.

With AIP, AFAL gains the basis for:
- authority
- treasury
- payment
- settlement
- future market access