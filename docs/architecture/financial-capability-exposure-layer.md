# Financial Capability Exposure Layer

## Purpose

The Financial Capability Exposure Layer defines how AFAL exposes structured financial capabilities to agents.

AFAL is not only:
- a wallet backend
- a payment API
- an identity registry
- a treasury system

AFAL is designed to become a **financial action layer** for agent-native systems.

This means AFAL should expose machine-readable, policy-aware, auditable financial capabilities that agents can invoke directly, instead of relying on raw UI automation or low-level wallet calls.

---

## Why This Layer Exists

Two major industry directions motivate this layer:

### 1. Unified action entry point
Modern AI systems are converging toward unified entry points that combine:
- user intent
- context
- tools
- execution

This suggests that future financial systems should not only expose pages or wallet operations.  
They should expose **actions**.

### 2. Structured capability exposure
Web systems are increasingly moving toward structured interfaces for agents, rather than forcing agents to operate via DOM clicks and brittle UI automation.

For AFAL, this means financial capabilities should be explicitly modeled and invokable as protocol-level actions.

---

## Design Goal

The Financial Capability Exposure Layer should make AFAL usable as a machine-native financial runtime.

It should allow agents to:
- discover what financial actions are available
- understand what inputs are required
- invoke actions under mandate and policy constraints
- receive structured outputs, receipts, and challenge states

---

## Core Principles

1. **Actions are structured objects**
2. **Actions are identity-linked**
3. **Actions are policy-bound**
4. **Actions are mandate-aware**
5. **Actions are challenge-aware**
6. **Actions produce auditable outputs**
7. **Actions should be usable without raw UI automation**

---

## Relationship to Other AFAL Modules

### AIP
Provides:
- identity
- credentials
- subject relationships

The capability layer depends on AIP to know:
- who is acting
- what identity and credentials exist

### AMN
Provides:
- mandates
- policy constraints
- challenge rules
- approval semantics

The capability layer depends on AMN to know:
- whether the requested action is allowed
- whether challenge is needed

### ATS
Provides:
- accounts
- treasury state
- budgets
- resource quotas
- settlement paths

The capability layer depends on ATS to know:
- what capacity exists
- which account or budget should be used

---

## Action Classes

AFAL should distinguish between **declarative** and **imperative** financial actions.

### Declarative Financial Actions
Declarative actions are structured, bounded, relatively stable actions.

They are best for:
- lookup
- creation of standard objects
- state reads
- actions with limited branching

Examples:
- `resolveIdentity`
- `presentCredential`
- `createAgentAccount`
- `getBudgetState`
- `createPaymentIntent`
- `createResourceIntent`
- `authorizeIntent`
- `getReceipt`
- `freezeIdentity`
- `revokeCredential`

### Imperative Financial Actions
Imperative actions are more dynamic, execution-heavy, or routing-sensitive.

They are best for:
- provider-specific execution
- settlement workflows
- quote/routing logic
- future market access

Examples:
- `executePayment`
- `settleUsage`
- `requestQuote`
- `submitTradeIntent`
- `routeTradeIntent`
- `bridgeFunds`
- `rebalanceTreasury`

---

## Initial Capability Set for Phase 1

The first version of this layer should support the following capabilities.

### Identity / Credential Capabilities
- `resolveIdentity`
- `verifyCredential`
- `presentCredential`
- `freezeIdentity`
- `revokeCredential`

### Account / Treasury Capabilities
- `createAgentAccount`
- `getAccountState`
- `getBudgetState`
- `allocateBudget`
- `setResourceQuota`

### Intent Capabilities
- `createPaymentIntent`
- `createResourceIntent`
- `evaluateIntent`
- `authorizeIntent`

### Execution / Settlement Capabilities
- `executePayment`
- `settleUsage`
- `getReceipt`

---

## Input and Output Model

Each capability should have a structured request and structured response.

### Request characteristics
- explicit subject
- references to credentials / mandates / policies
- explicit financial or resource parameters
- nonce / replay protection where relevant
- expiration where relevant

### Response characteristics
- action accepted / rejected / challenge-required
- intent or execution object reference
- decision metadata
- receipt reference if applicable
- audit trace hooks

---

## Challenge Integration

This layer must expose challenge as a first-class result.

A capability invocation should be able to return:

- approved
- rejected
- challenge-required
- pending-approval
- suspended
- expired

This is critical because agent-native finance cannot assume all actions are immediately executable.

---

## Why This Matters for AFAL

Without this layer, AFAL risks becoming:
- only a backend
- only a wallet abstraction
- only a document set for schemas

With this layer, AFAL becomes:
- a structured financial runtime
- an agent-facing action interface
- a bridge between intent and execution
- a system that future assistants, browser agents, enterprise agents, and service agents can integrate against

---

## Phase 1 Scope

In Phase 1, this layer should focus on:
- documenting capability categories
- aligning capabilities with schemas
- ensuring payment and resource flows are action-first
- leaving trade and venue access forward-compatible but not fully implemented

---

## Out of Scope for Phase 1

- full capability registry marketplace
- dynamic capability negotiation across ecosystems
- browser-native or wallet-native execution plugins
- full trade execution adapter network

---

## Summary

The Financial Capability Exposure Layer upgrades AFAL from a set of financial primitives into a structured action layer for agent-native systems.

This is the layer that allows AFAL to become:
- machine-readable
- programmable
- governable
- composable
- future-proof for Web4 agent finance
