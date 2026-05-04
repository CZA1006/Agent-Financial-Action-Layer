# Roadmap — 6 Months

## Purpose

This document provides the medium-term roadmap for AFAL after the first 12-week phase.

It is intentionally higher-level than the 12-week roadmap and focuses on major expansion directions.

---

## Month 1–2: Foundation Layer Stabilization

Focus:
- complete Phase 1 documentation and schema alignment
- stabilize AIP / AMN / ATS boundaries
- stabilize payment and resource intent model
- establish one MVP scenario
- keep the externally validated SQLite/GCP sandbox repeatable

Main themes:
- identity and credential consistency
- mandate and challenge flow
- account and budget model
- stablecoin settlement baseline

---

## Month 3–4: Operationalization

Focus:
- expand backend services beyond scaffolding
- add stronger trusted-surface support
- support budget allocation and replenishment
- improve audit and receipt model
- strengthen resource settlement model
- productize the AFAL MCP/SDK boundary for Claude Code, OpenRouter, and custom agents

Main themes:
- payment and resource flows become more executable
- internal ledger and batch settlement become clearer
- token economy support becomes more concrete
- agent payment prompts route through AFAL before any downstream payment rail executes

Potential additions:
- compute budget credential support
- provider access support
- settlement reconciliation model
- better action orchestration
- dedicated `@afal/payment-mcp` or SDK package
- stable hosted sandbox and public tester provisioning flow

---

## Month 5–6: Forward-Compatible Market Access

Focus:
- prepare AFAL for future market access
- refine Trade Intent
- define quote and routing object relationships
- begin venue access planning without full market implementation
- pilot one downstream machine-payment rail such as Coinbase x402 behind AFAL approval

Main themes:
- structured trade requests
- venue / provider access policy
- future quote / route / execution compatibility

Potential additions:
- quote object draft
- route object draft
- venue access mandate refinement
- early adapter interfaces

---

## Strategic Goal by Month 6

By the end of 6 months, AFAL should be positioned as:

- a documented identity / authority / treasury substrate
- a structured action layer for payment and resource settlement
- an agent payment control plane that Claude Code / MCP-capable agents can call before payment execution
- a forward-compatible base for future market access and trading
- a credible Web4 agent financial infrastructure project

---

## Still Out of Scope by Month 6

Even by month 6, the following may remain out of scope unless priorities change:
- full exchange
- full consumer wallet app
- broad multi-chain rollout
- advanced reputation market
- production-scale compute marketplace
- complete fiat integration stack

---

## Summary

The 6-month roadmap is about turning AFAL from:
- a strong architecture and schema project

into:
- a minimally operational financial action substrate
- with clear expansion paths toward market access, structured trade flows, and broader Web4 agent finance
