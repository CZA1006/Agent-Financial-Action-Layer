# Roadmap — 12 Weeks

## Purpose

This document defines the initial 12-week execution roadmap for AFAL Phase 1.

The goal of this phase is **not** to build a complete trading system or consumer product.  
The goal is to build the minimum viable substrate for:

- identity
- credentials
- mandates
- treasury / accounts
- payment and resource intents
- stablecoin settlement
- challenge / trusted-surface hooks

---

## Week 1–2: Repository, Architecture, and Schema Freeze

### Goals
- finalize repo structure
- finalize architecture documents
- finalize core module boundaries
- freeze Phase 1 scope
- complete first-pass schema drafts

### Deliverables
- `README.md`
- architecture docs for AIP / AMN / ATS / AFAL
- specs for:
  - DID
  - VC
  - Mandate
  - Payment Intent
  - Resource Intent
  - Trade Intent (forward-compatible only)
- backlog and open questions files

### Success Criteria
- repo structure is stable
- no major ambiguity about module boundaries
- Codex can work from a clear documentation base

---

## Week 3–4: AIP Foundation

### Goals
- define identity service boundaries
- implement initial shared types for:
  - Owner DID
  - Institution DID
  - Agent DID
  - Ownership VC
  - KYC/KYB VC
  - Authority / Policy VC
- define verification flow
- define revocation / freeze lifecycle

### Deliverables
- `sdk/types/` first-pass type definitions
- `backend/aip/` scaffolding
- AIP service README / interface definitions
- identity and credential verification plan

### Success Criteria
- AIP object model is stable enough to support mandates and accounts
- identity / credential flows are internally consistent

---

## Week 5–6: ATS Foundation

### Goals
- define account hierarchy
- define treasury model
- define budget model
- define settlement account concept
- design ERC-4337-compatible smart account strategy

### Deliverables
- ATS architecture refinement
- account model spec
- treasury allocation model
- `backend/ats/` scaffolding
- `contracts/ats/` interface draft
- resource budget model

### Success Criteria
- the system can clearly represent owner treasury, agent operating account, and settlement account
- budgets are modeled for both money and resource usage

---

## Week 7–8: AMN Foundation

### Goals
- define mandate management flow
- define policy evaluation flow
- define challenge semantics
- define trusted-surface integration points

### Deliverables
- mandate verification plan
- challenge state model
- decision output model
- `backend/amn/` scaffolding
- `contracts/amn/` interface draft

### Success Criteria
- payment and resource actions can be evaluated against mandates and policies
- challenge becomes a formal result, not an afterthought

---

## Week 9–10: AFAL Action Layer

### Goals
- define action orchestration flow
- align intents with identity, mandate, and treasury state
- scaffold payment and resource execution services

### Deliverables
- `backend/afal/` scaffolding
- action router outline
- payment intent evaluation flow
- resource intent evaluation flow
- receipt model draft

### Success Criteria
- payment and resource intents can flow through:
  - create
  - evaluate
  - authorize
  - execute / settle
  - receipt

---

## Week 11–12: Demo and Integration Pass

### Goals
- validate one or two MVP scenarios
- ensure end-to-end object consistency
- demonstrate AFAL as a structured financial action layer

### Recommended MVP Scenarios
1. agent-to-agent API/tool payment and settlement
2. merchant agent paying service agents

### Deliverables
- one end-to-end demo flow
- integration notes
- known gaps list
- post-MVP roadmap refinement

### Success Criteria
- AFAL can demonstrate a working flow using:
  - identity
  - mandate
  - treasury
  - payment/resource intent
  - receipt / audit output

---

## Non-Goals in the First 12 Weeks

The following are explicitly out of scope:
- full exchange / orderbook
- complex venue adapters
- multi-chain infrastructure
- advanced fiat bridge
- full reputation layer
- complete browser / consumer product
- production-grade distributed infrastructure

---

## Summary

By the end of 12 weeks, AFAL should have:
- stable docs
- stable schemas
- stable module boundaries
- scaffolding for AIP / AMN / ATS / AFAL
- one or two end-to-end MVP flows
- a strong base for post-MVP implementation
