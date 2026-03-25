# AFAL — Agent Financial Action Layer

AFAL is a Web4 financial action layer for agent-native identity, authority, accounts, payments, settlement, and future market access.

AFAL is composed of:
- **AIP** — Agent Identity Passport
- **AMN** — Agent Mandate Network
- **ATS** — Agent Treasury Stack

Together, these modules form the substrate for agent financial actions across payments, resource settlement, and future crypto-native trading.

## Project Thesis

Future financial markets will increasingly be agent-driven.

Before building full agent trading venues or consumer-facing wallets, AFAL focuses on the foundational substrate for:

1. agent identity
2. agent authority
3. agent accounts / treasury
4. payment and resource settlement
5. later: trade intents and venue access

## Phase 1 Focus

- Owner DID
- Agent DID
- Ownership Credential
- KYC/KYB Credential
- Authority Credential
- Policy Credential
- Account / treasury model
- Payment Intent
- Resource Intent
- Stablecoin settlement
- Challenge / trusted surface hooks

## Repository Structure

- `docs/` — whitepaper, architecture, specs, roadmap, references
- `contracts/` — on-chain modules
- `backend/` — off-chain services
- `sdk/` — shared types and client libraries
- `app/` — trusted surface and future app components
- `tasks/` — milestone planning and open questions
