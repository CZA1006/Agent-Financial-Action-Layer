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
- Institution DID
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

- `docs/` — whitepaper, architecture, specs, examples, roadmap, references
- `contracts/` — on-chain modules
- `backend/` — off-chain services
- `sdk/` — shared types and client libraries
- `app/` — trusted surface and future app components
- `tasks/` — milestone planning and open questions

## Mock Flow Commands

- `npm run demo:mock` — run the canonical payment and resource fixture demo
- `npm run export:openapi` — export the current OpenAPI-style YAML draft to JSON
- `npm run preview:openapi` — serve the static OpenAPI preview page for the stable JSON artifact
- `npm run snapshot:openapi -- 0.1.0` — publish an immutable OpenAPI snapshot release
- `npm run test:mock` — run the mock orchestrator, API adapter, and HTTP transport tests
- `npm run typecheck` — typecheck the current backend and SDK TypeScript surfaces

## Current Contract Layers

- `docs/specs/afal-http-openapi-draft.yaml` — OpenAPI-style draft for the Phase 1 AFAL HTTP surface
- `docs/specs/afal-http-openapi-draft.json` — generated JSON export of the current OpenAPI draft
- `docs/specs/openapi/latest.yaml` — stable publication path for the current OpenAPI YAML artifact
- `docs/specs/openapi/latest.json` — stable publication path for the current OpenAPI JSON artifact
- `docs/specs/openapi/manifest.json` — metadata for the published OpenAPI artifacts
- `docs/specs/openapi/releases/` — immutable version snapshot directory for released OpenAPI artifacts
- `docs/specs/openapi/releases/index.json` — machine-readable catalog of published OpenAPI snapshots
- `docs/specs/openapi/releases/release-notes-template.md` — template for human-readable release and compatibility notes
- `docs/specs/openapi/versioning-policy.md` — versioning and publication rules for OpenAPI artifacts
- `docs/specs/openapi/index.html` — static preview entry for the published OpenAPI artifact
- `backend/afal/mock/` — fixture-backed flow orchestration
- `backend/afal/api/` — capability request/response adapter
- `backend/afal/http/` — framework-free HTTP transport contract
