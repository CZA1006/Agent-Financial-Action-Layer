# Backlog

## Purpose

This file tracks work that is known to be valuable, but is not required for the immediate Phase 1 MVP.

The backlog helps prevent scope creep while keeping future expansion visible.

---

# Phase 1 Later

These items are related to the current phase, but do not need to block the initial Codex workflow.

- improve README and repo onboarding flow
- add diagrams for AIP / AMN / ATS relationships
- refine trusted-surface flows
- add JSON schema versions of the markdown specs
- add end-to-end example payloads for the new Phase 1 schemas
- add example approval receipts and settlement receipts

---

# Phase 2 Candidates

These items are reasonable next steps after the initial MVP foundation.

- compute budget credential implementation
- provider access credential implementation
- replenishment policy implementation
- internal ledger design
- batch settlement logic
- reconciliation service design
- resource usage receipt model
- stronger action orchestration layer
- challenge UI / trusted-surface prototype
- improved account factory and treasury allocation logic

---

# Forward-Compatible Market Access

These items support AFAL’s future move toward market participation without requiring immediate implementation.

- quote schema
- route schema
- venue access schema refinement
- quote request action
- route trade intent action
- venue adapter interface
- early DEX / aggregator adapter design
- trade receipt schema refinement

---

# Longer-Term Strategic Backlog

These items are important but clearly beyond the MVP stage.

- multi-chain architecture
- fiat bridge strategy
- broader payment rail routing
- reputation / trust layer
- policy marketplace or policy templates
- compute marketplace model
- service-to-service billing framework
- enterprise operator console
- advanced institution governance model
- external verifier ecosystem

---

# Research Backlog

These items require continued research rather than immediate implementation.

- best first L2 / EVM environment
- best first stablecoin choice
- DID method strategy for Phase 2+
- on-chain vs off-chain anchoring tradeoffs
- AP2 compatibility boundaries
- x402 compatibility opportunities
- resource pricing and conversion model
- cryptographic proof model for later phases

---

# Explicit Non-Goals for Now

These items should not be pulled into the current implementation unless priorities change dramatically.

- full exchange / order book
- advanced market-making engine
- derivatives trading system
- broad consumer-facing wallet product
- full browser automation product
- universal identity network
- fully autonomous unrestricted trading

---

# Backlog Management Rule

If a useful idea appears during implementation but does not directly serve the current phase:
1. do not implement it immediately
2. add it here
3. classify it under the right section
4. keep the current milestone focused
