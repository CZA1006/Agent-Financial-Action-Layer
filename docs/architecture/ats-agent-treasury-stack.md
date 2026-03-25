# ATS — Agent Treasury Stack

## Purpose

ATS (Agent Treasury Stack) is the account, treasury, and budget control layer of AFAL.

Its role is to define:
- how agents hold and access financial resources
- how owners and institutions provision capital to agents
- how sub-accounts are structured
- how budgets are enforced
- how resources are allocated and replenished
- how settlement accounts differ from operating accounts

If AIP answers **“who is this agent?”**  
and AMN answers **“what is this agent allowed to do?”**,  
then ATS answers:

**“what financial and resource capacity does this agent actually have?”**

---

## Why ATS Exists

A wallet address alone is not a treasury system.

In Web4 agent finance, agents need more than a balance:
- they need bounded operating accounts
- they need treasury allocations
- they need resource budgets
- they need account separation
- they need settlement pathways
- they need emergency controls

Without ATS:
- all funds sit in one undifferentiated balance
- there is no budget discipline
- spending and settlement are mixed
- treasury and execution risk are tightly coupled
- agent autonomy becomes unsafe

ATS exists to create a structured, controllable treasury model for agents.

---

## Core Design Goals

ATS is designed to provide:

1. **Programmable financial accounts**
2. **Treasury separation**
3. **Agent-specific operating budgets**
4. **Money + compute/resource budget support**
5. **Sub-account and role separation**
6. **Controlled settlement paths**
7. **Emergency freeze and recovery**
8. **Compatibility with smart-account infrastructure**

---

## Scope

ATS includes:

- account model
- treasury model
- budget model
- sub-account structure
- smart account strategy
- resource allocation model
- withdrawal controls
- settlement account structure

ATS does **not** include:
- identity creation
- credential issuance
- mandate issuance
- policy logic itself
- challenge UI
- market venue routing

Those are handled by other modules.

---

## Why a Wallet Is Not Enough

A basic wallet can:
- hold tokens
- sign transactions
- send tokens

But ATS requires more:

- role separation
- budget allocation
- programmable execution boundaries
- resource accounting
- withdrawal controls
- treasury reconciliation
- future trading segregation

In short:

A wallet is a container.  
ATS is an operating financial structure.

---

## Account Hierarchy

AFAL recommends at least three treasury/account layers.

### 1. Owner / Institution Treasury
The root capital pool.

This account:
- holds primary capital
- funds lower layers
- should not be directly exposed to operational agents
- may require stronger governance and challenge rules

### 2. Agent Operating Account
The primary execution account for a given agent.

This account:
- receives bounded budget from treasury
- is used for payments and resource consumption
- may later support bounded trading actions
- is controlled by account policy and mandate checks

### 3. Settlement / Withdrawal Account
Dedicated path for reconciliation and controlled external transfers.

This account:
- supports settlement finalization
- receives collected flows or netted balances
- may be separated from execution accounts
- may enforce stricter withdrawal and bridging rules

---

## Treasury Model

ATS should support a treasury model in which:
- treasury capital is not equivalent to freely spendable capital
- agents receive bounded allocations
- treasury may reclaim or reassign budget
- resource quotas and stablecoin balances may coexist

### Treasury responsibilities
- provisioning
- top-ups
- caps
- freezes
- reallocation
- budgeting by role, task, or resource class

---

## Smart Account Strategy

ATS is designed to be compatible with ERC-4337 style smart accounts.

Desired properties:
- programmable validation
- modular execution rules
- session keys
- gas abstraction
- account abstraction
- safe delegation

### Why ERC-4337-style accounts are relevant
They allow:
- agent execution without raw EOAs
- module-based policy control
- future integration with sponsored transactions
- safer account behavior for machine actors

ATS should remain implementation-flexible, but smart accounts are the preferred foundation.

---

## Budget Model

ATS must support multiple budget classes.

### 1. Monetary Budget
Examples:
- stablecoin spending limit
- daily payment cap
- service payment quota

### 2. Resource Budget
Examples:
- inference token quota
- API call budget
- tool usage credits
- provider-specific credits

### 3. Risk Budget
Examples:
- future trading notional cap
- exposure cap
- position cap
- strategy budget

Budget must be:
- assignable
- measurable
- enforceable
- reviewable
- revocable

---

## Token Economy Integration

ATS is where token economy becomes operational.

The treasury should not only hold money.  
It should also manage other allocatable economic resources.

### Three resource classes in ATS

#### Money
- stablecoins
- crypto settlement assets

#### Compute
- inference tokens
- model credits
- tool quotas
- API budgets

#### Authority-linked budget
- action rights tied to resource classes
- replenishment permissions
- conversion rights

This makes ATS a **multi-resource treasury layer**, not only a wallet system.

---

## Treasury Controls

ATS should support the following controls:

### Spend Controls
- single-action limit
- daily limit
- cumulative period limit

### Asset Controls
- stablecoin whitelist
- token whitelist
- future trading asset restrictions

### Counterparty Controls
- approved payee list
- approved providers
- future venue whitelist

### Chain / Network Controls
- allowed chains
- allowed settlement rails
- bridge restrictions

### Withdrawal Controls
- no withdrawal
- challenge-required withdrawal
- treasury-only withdrawal

### Resource Controls
- provider-specific quotas
- model-specific quotas
- refill rules
- auto-replenishment thresholds

---

## Account Types

ATS may later support multiple account classes.

### Treasury Account
Capital source account.

### Operating Account
Agent action account.

### Settlement Account
Clearing and reconciliation account.

### Escrow Account (Future)
For conditional release and staged settlement.

### Strategy Account (Future)
For risk-bounded trading systems.

### Resource Budget Account
For compute and provider credits.

---

## Funding Flows

Typical flows may include:

### Treasury → Agent Operating Account
Budget top-up

### Agent Operating Account → Service Counterparty
Payment execution

### Agent Operating Account → Provider Settlement
Resource settlement

### Agent Operating Account → Settlement Account
Net or periodic transfer

### Resource Budget Pool → Provider Allocation
Quota allocation for non-money resource usage

---

## Replenishment Model

ATS should support explicit replenishment behavior.

Examples:
- manual top-up only
- threshold-based top-up
- policy-based automatic refill
- no refill after quota exhaustion

This is especially relevant when integrating token economy concepts:
- compute budget may auto-refill from treasury
- stablecoin budget may not
- high-risk categories may require challenge before refill

---

## Separation of Execution and Withdrawal

This is one of the most important treasury safety principles.

An agent may be allowed to:
- spend for service execution
- pay known counterparties
- consume budgeted resources

But that should not imply permission to:
- freely withdraw treasury capital
- bridge funds to unknown chains
- transfer all balances out of the system

ATS should enforce this separation at the account and policy layers.

---

## Settlement Considerations

ATS should work with AFAL’s settlement modes:

### 1. Real-time On-Chain Settlement
Best for:
- large-value
- external transfers
- highly trusted finality cases

### 2. Batch / Aggregated Settlement
Best for:
- repeated small actions
- API usage billing
- provider settlements

### 3. Internal Ledger Settlement
Best for:
- frequent internal or intra-platform interactions
- sub-account treasury accounting
- low-friction agent-to-agent accounting

ATS must provide the account model that supports all three.

---

## Audit and Reconciliation

Treasury systems must support reconciliation.

ATS should track:
- treasury allocations
- account balances
- budget consumption
- refill events
- freeze events
- transfer events
- settlement outputs

This allows:
- operator visibility
- treasury control
- incident investigation
- later accounting and reporting

---

## Minimal MVP Requirements

Phase 1 ATS should support:

- owner / institution treasury concept
- agent operating account
- basic settlement account model
- smart-account-compatible account factory design
- spend caps
- asset restrictions
- counterparty restrictions
- basic resource budget model
- freeze / pause hooks

### Out of Scope for MVP
- full multi-account accounting ledger
- advanced rebalancing
- institutional net settlement engine
- derivatives collateral engine
- complex strategy portfolio layer

---

## Suggested Interfaces

### Account actions
- createAgentAccount
- createSettlementAccount
- getAccountState
- freezeAccount
- unfreezeAccount

### Treasury actions
- allocateBudget
- reduceBudget
- topUpBudget
- setResourceQuota
- setReplenishmentPolicy

### Control actions
- setSpendLimit
- setAssetWhitelist
- setCounterpartyWhitelist
- setWithdrawalRules

---

## Open Questions

1. What is the minimum account hierarchy required for MVP?
2. Which treasury controls must be enforced on-chain vs off-chain?
3. How should compute budgets be represented in the first implementation?
4. How should replenishment logic be expressed?
5. Should settlement account creation be automatic or explicit?
6. What level of ERC-4337 support is required in Phase 1?

---

## Summary

ATS is the treasury and account substrate of AFAL.

It transforms simple wallets into structured financial operating systems for agents by providing:
- treasury hierarchy
- programmable accounts
- budget controls
- resource allocations
- settlement structure
- execution / withdrawal separation

Without ATS, AFAL would only define identities and mandates.

With ATS, AFAL gains practical financial capacity and control.