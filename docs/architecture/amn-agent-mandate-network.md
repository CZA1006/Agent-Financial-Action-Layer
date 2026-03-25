# AMN — Agent Mandate Network

## Purpose

AMN (Agent Mandate Network) is the authority and authorization layer of AFAL.

Its role is to define:
- what an agent is allowed to do
- under which conditions it may do it
- when it must escalate to human approval
- how approval is represented
- how challenges are triggered
- how authorization is verified, revoked, and audited

AMN is the bridge between identity and action.

If AIP answers **“who is this agent?”**, AMN answers:

**“what is this agent allowed to do?”**

---

## Why AMN Exists

In agent-native finance, the key problem is not technical execution.

The key problem is authorization.

A software agent may be able to:
- sign transactions
- call APIs
- route payments
- request quotes
- submit trade intents

But that does not mean it should be allowed to do so.

Without AMN:
- every agent action becomes dangerously overpowered
- raw wallet control becomes the only gate
- there is no structured way to express boundaries
- challenge and human override become ad hoc
- auditability becomes weak

AMN exists to formalize authorization as a network of mandates, policies, and challenge rules.

---

## Core Design Goals

AMN is designed to provide:

1. **Explicit authorization**
   - actions must be allowed, not merely possible

2. **Structured mandates**
   - permissions must be represented as machine-readable objects

3. **Bounded automation**
   - automation must remain within explicit financial and operational limits

4. **Challenge support**
   - high-risk actions must be interruptible and challengeable

5. **Trusted-surface integration**
   - humans must be able to intervene for sensitive actions

6. **Auditability**
   - authorization must be reviewable after the fact

---

## Scope

AMN includes:

- mandate model
- policy model
- approval semantics
- challenge logic
- trusted-surface escalation hooks
- action authorization checks
- mandate lifecycle

AMN does **not** include:
- identity creation
- credential issuance
- wallet/account custody
- execution settlement
- market venue integrations

Those belong to other AFAL modules.

---

## Inspiration from AP2

AMN is strongly inspired by the logic behind AP2, especially:

- mandate-based authorization
- challenge flows
- trusted surfaces
- human-present vs human-not-present distinctions
- payment authorization evidence

However, AFAL does not treat AP2 as the full foundation.

AMN generalizes these concepts beyond shopping and merchant checkout into a broader financial action model.

---

## Mandate Concept

A mandate is a structured, verifiable object that expresses permission for an agent to perform a class of financial action under defined conditions.

A mandate should answer:
- who issued it
- which agent it applies to
- which actions are in scope
- what limits apply
- when it expires
- what triggers challenge
- when it can be revoked

Mandates are the operational law of AFAL.

---

## Core Mandate Types

### 1. Payment Mandate
Allows an agent to initiate or execute payment actions.

Typical use cases:
- service payments
- merchant-to-service-agent payments
- recurring financial flows
- approved counterparty transfers

### 2. Resource Mandate
Allows an agent to consume or purchase non-money economic resources.

Typical use cases:
- compute budget usage
- API/tool usage settlement
- provider credits
- model execution budgets

### 3. Trade Mandate
Allows an agent to initiate trading-related actions.

Typical use cases:
- quote requests
- venue access
- permitted trade intents
- future constrained execution

### 4. Venue Access Mandate (Future)
Allows an agent to access specific venues, protocols, or execution environments.

### 5. Settlement Mandate (Future)
Allows the agent to participate in settlement workflows under specific rules.

---

## Mandate Fields

Each mandate should minimally include:

- mandate id
- issuer
- subject (agent identity)
- mandate type
- scope
- policy reference
- allowed assets
- allowed counterparties
- allowed providers / venues
- maximum value / limit
- maximum frequency
- expiry
- challenge threshold
- revoke conditions
- issuance timestamp
- status

Optional fields may include:
- jurisdiction restrictions
- business-purpose tag
- execution class
- required approvals
- escalation route
- linked credentials

---

## Policy Layer

Mandates express high-level permission.  
Policies define enforceable operational boundaries.

Examples of policy constraints:
- single payment cap
- daily spend cap
- specific stablecoin only
- specific chains only
- specific providers only
- no withdrawals
- no new counterparties
- challenge if value exceeds threshold
- challenge if outside known pattern
- challenge if using restricted venue

Policies may be represented as:
- inline mandate fields
- referenced policy objects
- linked policy credentials

---

## Authorization Model

AMN should support three broad authorization modes:

### 1. Human-in-the-loop
The agent prepares an action, but a human must approve it.

Used for:
- first-time counterparties
- large-value actions
- policy exceptions
- sensitive treasury operations

### 2. Pre-authorized
The human or institution has already approved a mandate, so the agent may act within defined limits.

Used for:
- recurring payments
- budgeted service usage
- known counterparties
- bounded automation

### 3. Fully agent-native
The action is executed under purely machine-level policy controls.

Used only for:
- tightly constrained environments
- low-risk repetitive operations
- intra-system settlement
- future mature agent networks

---

## Challenge Model

Challenge is a first-class concept in AMN.

A challenge should be triggered when:
- amount exceeds threshold
- new counterparty appears
- new asset is used
- new venue is accessed
- unusual location / chain / provider appears
- abnormal compute consumption occurs
- policy engine returns uncertainty
- risk score is elevated

Challenge does not necessarily mean rejection.  
It means escalation.

---

## Trusted Surface

A trusted surface is a secure human approval interface.

Examples:
- web approval surface
- wallet approval UI
- enterprise control console
- dedicated approval application

Trusted surface should support:
- clear context presentation
- mandate details
- risk details
- approval / rejection
- step-up authentication if needed
- signed approval receipts

---

## Mandate Lifecycle

A mandate should support:
- create
- activate
- update (where allowed)
- suspend
- revoke
- expire
- audit

### Suggested states
- draft
- issued
- active
- challenged
- suspended
- expired
- revoked

---

## Action Authorization Flow

For every financial action, AMN should answer:

1. Does the subject agent have valid identity?
2. Does the subject agent hold relevant credentials?
3. Is there a valid mandate for this action type?
4. Is the requested action within scope?
5. Does it satisfy the attached policy constraints?
6. Does it require challenge?
7. Can it be executed now?
8. How should the authorization decision be recorded?

This makes AMN the decision layer before execution.

---

## Examples

### Example A: Payment Mandate
A merchant agent is allowed to pay a fraud-detection service agent:
- only in USDC
- max 100 USDC per call
- max 1,000 USDC per day
- only to whitelisted provider IDs
- challenge if new provider is attempted

### Example B: Resource Mandate
A product agent is allowed to purchase compute:
- only from approved inference providers
- max 1M tokens per day
- challenge if provider price exceeds threshold
- auto-refill allowed from approved budget source

### Example C: Trade Mandate
A trading agent is allowed to:
- request quotes
- submit trade intents
- only on approved venues
- only for approved assets
- no leverage
- challenge above position threshold

---

## Auditability

Every mandate-based decision must be auditable.

A decision log should include:
- subject
- action type
- mandate used
- policy checks
- challenge result
- approval result
- decision timestamp
- execution reference

This is critical for:
- incident review
- compliance
- debugging
- future financial accountability

---

## Minimal MVP Requirements

Phase 1 AMN should support:

- Payment Mandate
- Resource Mandate
- policy checks
- challenge threshold checks
- trusted-surface escalation hooks
- approval / rejection state
- mandate verification
- revoke / suspend

### Out of Scope for MVP
- complex multi-party mandates
- reputation-weighted mandates
- advanced delegation graphs
- full venue access control
- advanced risk scoring engines

---

## Suggested Interfaces

### Mandate actions
- createMandate
- verifyMandate
- suspendMandate
- revokeMandate
- getMandateState

### Authorization actions
- evaluateAction
- triggerChallenge
- resolveChallenge
- approveAction
- rejectAction
- recordAuthorizationDecision

---

## Open Questions

1. Which policy checks must live on-chain vs off-chain?
2. What are the minimum mandate fields for Payment Mandate v0?
3. What are the minimum mandate fields for Resource Mandate v0?
4. What is the first trusted-surface implementation?
5. Should challenge history be fully on-chain, partially anchored, or off-chain only?
6. How do we distinguish institutional mandates from personal mandates in MVP?

---

## Summary

AMN is the authorization layer of AFAL.

It transforms raw agent capability into controlled, reviewable financial action by providing:
- mandates
- policy constraints
- challenge rules
- trusted-surface escalation
- decision logging

Without AMN, AFAL would only have identified agents and programmable accounts.

With AMN, AFAL gains governed financial action.