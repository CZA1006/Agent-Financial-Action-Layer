# AFAL Whitepaper v6  
## Agent Financial Action Layer for Web4 Agent-Native Financial Markets

## Status
Working draft for architecture, protocol direction, and implementation planning.

---

# 1. Executive Summary

AFAL (Agent Financial Action Layer) is a Web4 financial action layer for agent-native identity, authority, accounts, payments, settlement, and future market access.

AFAL is designed for a future in which agents become major participants in digital financial markets. In that future, financial infrastructure cannot assume that all actions originate directly from human users. Instead, the system must support machine actors that can be identified, authorized, funded, constrained, challenged, audited, and settled.

AFAL is composed of three primary modules:

- **AIP** — Agent Identity Passport  
- **AMN** — Agent Mandate Network  
- **ATS** — Agent Treasury Stack  

Together, these modules form the substrate for:

- agent identity
- delegated authority
- programmable treasury and account controls
- payment and resource settlement
- future trade intents and venue access

AFAL does **not** begin by building a consumer wallet, a trading venue, or an agent exchange.  
AFAL begins by building the foundational layer that makes those future systems possible.

---

# 2. Core Thesis

## 2.1 The Web4 Financial Thesis

We believe future financial systems will increasingly become **agent-driven**.

This does not mean humans disappear. Instead, a dual-layer model emerges:

### Human Finance Layer
- fiat
- banks
- traditional legal entities
- existing regulation
- explicit human liability

### Agent Finance Layer
- crypto / stablecoins
- programmable accounts
- delegated actions
- automated payments
- automated settlement
- eventually, automated trading and market participation

### Bridge Layer
- human intent to agent mandate
- fiat to crypto treasury flows
- regulatory translation
- audit and reporting translation
- trusted-surface approvals for high-risk actions

AFAL is designed as the foundational infrastructure of this bridge and agent-native financial layer.

---

## 2.2 What Must Exist Before Agent Markets

Before agent-native exchanges, agent-native brokers, or fully autonomous financial agents can exist safely, the following primitives must exist:

1. **Identity** — who is this agent?
2. **Authority** — what is this agent allowed to do?
3. **Account** — where does this agent hold money and resources?
4. **Action** — how does this agent request and execute financial operations?
5. **Settlement** — how are payments and resource consumption settled?
6. **Auditability** — how can actions be explained and verified?

AFAL focuses on building these primitives first.

---

# 3. Why Existing Infrastructure Is Not Enough

There are important adjacent building blocks in the current ecosystem:

- **W3C DID / VC** for decentralized identifiers and verifiable credentials
- **OpenID4VCI / OpenID4VP** for credential issuance and presentation
- **ERC-4337** for programmable smart accounts
- **AP2** for mandate, challenge, trusted surface, and payment authorization logic
- **x402** for machine-native API payment flows
- **Agentic wallet frameworks** for agent account control

These are important but incomplete.

Today, there is still no widely adopted standard that fully integrates:

- agent identity
- owner-agent binding
- KYC/KYB credential reuse
- account opening
- programmable authority
- payment intent execution
- resource settlement
- future trading permissions

AFAL aims to integrate and extend these layers into a coherent Web4 financial substrate.

---

# 4. System Overview

## 4.1 AFAL Core Modules

### AIP — Agent Identity Passport
AIP provides the identity and credential substrate for:
- owners
- institutions
- agents

AIP handles:
- Owner DID
- Agent DID
- Institution DID
- ownership credentials
- KYC/KYB credentials
- authority credentials
- revocation / freeze / rotate lifecycle

### AMN — Agent Mandate Network
AMN provides the authorization layer for financial actions.

AMN handles:
- payment mandates
- resource mandates
- future trade mandates
- challenge rules
- trusted-surface escalation
- approval semantics
- authority evaluation

### ATS — Agent Treasury Stack
ATS provides the programmable account and treasury layer.

ATS handles:
- smart accounts
- treasury accounts
- sub-accounts
- budget controls
- asset and counterparty restrictions
- resource quota controls
- settlement structures

### AFAL Financial Action Layer
AFAL exposes structured financial capabilities for agents through standardized action objects.

Examples:
- payment intent
- resource intent
- future trade intent
- settlement request
- quote request
- capability exposure interfaces

---

# 5. Design Principles

AFAL follows six core principles:

1. **Identity before payments**
2. **Authority before automation**
3. **Accounts before trading**
4. **Structured intents before raw execution**
5. **Challenge for high-risk actions**
6. **Auditability by default**

This means AFAL does not treat financial operations as raw wallet signatures or UI clicks.  
Instead, all meaningful actions should be structured, constrained, and reviewable.

---

# 6. Identity Layer (AIP)

## 6.1 Why Agent Identity Matters

In human finance, identity is assumed through:
- KYC
- institutions
- accounts
- contracts

In agent finance, identity must be explicit.

A wallet address is not enough.  
An agent must have:
- a persistent identity
- an ownership relationship
- verifiable credentials
- a lifecycle
- an auditable control model

## 6.2 DID Model

AFAL uses a DID-oriented identity model.

At minimum, AFAL recognizes:

- **Owner DID**
- **Agent DID**
- **Institution DID**

Each DID must support:
- creation
- resolution
- verification methods
- controller semantics
- service references
- revocation / freeze / rotate hooks

## 6.3 Credentials

AFAL uses verifiable credentials to represent facts about agents and owners.

### Core Credentials
- Ownership Credential
- KYC / KYB Credential
- Authority Credential
- Policy Credential

### Extended Credentials
- Compute Budget Credential
- Provider Access Credential
- Conversion Credential
- Replenishment Credential
- Execution Class Credential

## 6.4 Lifecycle

Agents must support:
- identity creation
- owner binding
- credential issuance
- policy updates
- temporary freeze
- permanent revocation
- key rotation

AIP is not only an identifier system.  
It is the identity and trust substrate for future financial participation.

---

# 7. Mandates and Authority (AMN)

## 7.1 Why Mandates Matter

The core problem in agent finance is not whether an agent can technically sign a transaction.

The real question is:

**Was the agent allowed to do it?**

This requires explicit authorization.

## 7.2 Mandate Model

AFAL uses mandate objects to express allowed financial actions.

Initial mandate classes:

- **Payment Mandate**
- **Resource Mandate**
- **Trade Mandate** (future)
- **Venue Access Mandate** (future)
- **Settlement Mandate** (future)

Each mandate should define:
- subject
- issuer
- scope
- limits
- allowed assets
- allowed counterparties
- allowed venues
- expiry
- challenge thresholds
- revocation conditions

## 7.3 AP2-Inspired Logic

AFAL does not adopt AP2 as its full foundation.

Instead, AFAL borrows AP2’s strongest ideas:

- mandate-driven authorization
- challenge model
- trusted-surface approval
- human-present / human-not-present distinction
- payment authorization evidence

AFAL extends this model beyond commerce and payment into broader agent financial actions.

## 7.4 Challenge and Trusted Surface

Some actions should not be fully automated.

Challenge should be triggered by:
- high value
- new counterparties
- new assets
- unusual chains or venues
- policy violations
- abnormal resource consumption
- high-risk trading behavior

Trusted surface may be:
- a secure web interface
- a dedicated approval app
- a wallet-integrated approval flow
- future enterprise policy consoles

---

# 8. Treasury and Accounts (ATS)

## 8.1 Why a Wallet Is Not Enough

An agent should not merely own a generic wallet.  
It needs a programmable financial account structure.

## 8.2 Treasury Structure

AFAL recommends at least three layers:

### Owner / Institution Treasury
Primary capital pool controlled by the owner or institution.

### Agent Operating Account
Budgeted execution account for payment and resource usage.

### Settlement / Withdrawal Account
Dedicated account for reconciliation, disbursement, and controlled transfer outflows.

## 8.3 Smart Account Model

AFAL is designed to be compatible with ERC-4337 style smart accounts.

Desired properties:
- programmable validation
- session keys
- modular policy enforcement
- gas abstraction
- role separation
- emergency freeze and recovery

## 8.4 Treasury Controls

ATS should support:
- spend limits
- asset whitelists
- counterparty whitelists
- chain / venue restrictions
- withdrawal controls
- resource quota enforcement
- compute budget allocation
- sub-account management

---

# 9. Token Economy Integration

## 9.1 Why Token Economy Matters

The AI era changes the meaning of “budget”.

A future agent account may not only hold money.  
It may hold:
- stablecoins
- compute credits
- inference tokens
- tool quotas
- provider-specific budgets
- trading risk budgets

This expands the treasury model from **money management** to **multi-resource management**.

## 9.2 Three Resource Classes

AFAL explicitly distinguishes:

### Money
- stablecoins
- crypto assets
- settlement value

### Compute
- inference tokens
- model credits
- API call quotas
- tool usage budget

### Authority
- what the agent is allowed to spend, convert, or execute

## 9.3 Resource Credentials

AFAL extends the credential model to support:
- compute budgets
- provider access rights
- conversion rules
- replenishment policies
- execution classes

## 9.4 Resource Intent

AFAL introduces **Resource Intent** as a sibling to Payment Intent.

Examples:
- purchase 1M inference tokens
- consume API credits
- settle compute usage
- top up a model budget
- convert stablecoin budget into execution quota

This allows AFAL to support not only financial payments, but also AI-native economic actions.

---

# 10. Financial Capability Exposure Layer

## 10.1 Inspiration from OpenAI and Google

AFAL is informed by two important trends:

### OpenAI Super-App Direction
OpenAI’s movement toward a unified desktop super app suggests that future value lies not in isolated tools, but in owning the **default entry point** for action and context.

### Google WebMCP Direction
Google’s WebMCP work suggests that websites should expose **structured, agent-ready capabilities**, rather than forcing agents to interact through raw UI automation.

## 10.2 Implication for AFAL

AFAL should not merely expose wallets and screens.  
It should expose **structured financial capabilities** for agents.

## 10.3 Capability Exposure Design

AFAL introduces a **financial capability exposure layer** with two classes of actions:

### Declarative Financial Actions
- resolveIdentity
- presentCredential
- createAgentAccount
- getBudgetState
- createPaymentIntent
- authorizeIntent
- executePayment
- getReceipt
- freezeIdentity
- revokeCredential

### Imperative Financial Actions
- createResourceIntent
- settleUsage
- requestQuote
- submitTradeIntent
- routePayment
- bridgeFunds
- rebalanceTreasury
- future venue actions

This makes AFAL more than a wallet backend.  
It becomes a structured financial action layer for agent-native systems.

---

# 11. Payment and Settlement

## 11.1 Payment Intent Model

Financial execution in AFAL should begin with **Intent**, not raw transfers.

A Payment Intent should minimally include:
- payer identity
- payee identity
- amount
- asset
- purpose
- policy reference
- expiry
- execution mode
- nonce

## 11.2 Resource Intent Model

A Resource Intent should minimally include:
- requesting agent
- provider / payee
- resource category
- quantity / quota
- pricing reference
- settlement mode
- budget source
- policy reference
- expiry
- nonce

## 11.3 Settlement Modes

AFAL supports three settlement modes:

### 1. Real-time On-Chain Settlement
For high-value or high-trust transactions.

### 2. Batch / Aggregated Settlement
For high-frequency API or tool usage.

### 3. Internal Ledger Settlement
For frequent intra-platform or treasury-controlled interactions.

## 11.4 Receipts and Audit

Every executed action should produce:
- receipt
- execution metadata
- policy reference
- approval state
- tx hash or ledger event
- audit log entry

---

# 12. Future Trading and Market Access

## 12.1 Trading Is Not Phase 1

AFAL does not begin with a trading venue.

Instead, AFAL prepares the substrate for future trading through:
- identity
- authority
- account control
- payment / settlement
- future trade intents

## 12.2 Trade Intent

Trade Intent is a future structured object that should include:
- trader identity
- owner / institution binding
- venue
- chain
- market
- side
- asset in / asset out
- amount
- slippage / price bounds
- policy reference
- execution mode
- expiry
- nonce

## 12.3 Venue Access Layer

Future AFAL-compatible venue access may include:
- DEX adapters
- aggregator adapters
- RFQ systems
- broker / CEX bridge adapters
- internal matching systems

The long-term model is:

**Trade Intent → Policy Check → Venue Adapter → Execution → Receipt**

---

# 13. MVP Scope

## 13.1 In Scope

Phase 1 includes:
- Owner DID
- Agent DID
- Ownership Credential
- KYC/KYB Credential
- Authority Credential
- Policy Credential
- account model
- mandate model
- payment intent
- resource intent
- stablecoin settlement
- challenge / trusted surface hooks

## 13.2 Out of Scope

Phase 1 does not include:
- full exchange / order book
- advanced reputation network
- multi-chain deployment
- complex asset management
- broad consumer wallet application
- full AP2 or x402 integration
- complete venue access layer

## 13.3 MVP Scenarios

Primary MVP scenarios:
1. agent-to-agent API/tool payment and settlement
2. merchant agent paying service agents

---

# 14. Roadmap

## 14.1 Phase 1
Build the foundational substrate:
- DID
- VC
- account
- mandate
- payment/resource intents
- settlement
- challenge hooks

## 14.2 Phase 2
Expand into:
- compute budgets
- provider access
- internal ledger
- batch settlement
- stronger trusted-surface flows
- developer-facing SDKs

## 14.3 Phase 3
Expand into:
- trade intents
- quote interfaces
- venue access
- structured execution
- future market infrastructure

---

# 15. Risks

## Key Risks
- identity spoofing
- credential misuse
- over-automation without sufficient challenge
- weak revocation semantics
- treasury compromise
- policy misconfiguration
- settlement ambiguity
- regulatory and privacy conflicts
- premature complexity in trading layers

## Mitigation Themes
- modular architecture
- clear schemas
- explicit mandates
- trusted-surface challenge
- receipts and audit logs
- limited MVP scope
- phased rollout

---

# 16. Strategic Positioning

AFAL is not:
- just a wallet
- just a payment app
- just an exchange
- just a DID system

AFAL is:

**the financial action layer for agent-native internet**

It provides the substrate for:
- identity
- authority
- treasury
- payments
- resource settlement
- future market access

This positions AFAL as a potential foundational layer in Web4 agent finance, analogous not to a single application, but to a protocol and execution substrate.

---

# 17. Conclusion

The future of financial infrastructure will require systems that treat agents as first-class financial actors.

That future cannot safely begin with autonomous trading venues or unconstrained machine payments.

It must begin with:
- identity
- authority
- accounts
- intents
- settlement
- auditability

AFAL is designed as this starting point.

By combining:
- agent identity
- mandate-based authority
- programmable treasury
- payment and resource settlement
- structured financial capability exposure

AFAL aims to become the substrate for Web4 agent-native financial markets.
