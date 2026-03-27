# Whitepaper

This folder contains the working whitepaper for **AFAL — Agent Financial Action Layer**.

## Purpose

The whitepaper is the strategic reference document for AFAL.  
It captures the project thesis, long-term architecture, protocol direction, market positioning, and phased roadmap.

It is **not** the only source of truth for implementation details.  
As the project evolves, implementation-ready details should be extracted into:

- `docs/architecture/`
- `docs/specs/`
- `tasks/`

## Current Files

- `afal-whitepaper-v6.docx` — editable working version
- `afal-whitepaper-v6.pdf` — reading / export version

## Scope of the Whitepaper

The whitepaper currently covers:

- Web4 agent-native financial infrastructure thesis
- AFAL overall architecture
- AIP (Agent Identity Passport)
- AMN (Agent Mandate Network)
- ATS (Agent Treasury Stack)
- DID / VC / account / policy foundation
- payment and resource intents
- settlement design
- AP2-inspired mandate / challenge / trusted surface model
- token economy integration
- OpenAI super app and Google WebMCP strategic implications
- roadmap, risks, and go-to-market considerations

## Working Principle

Use the whitepaper for:

- strategy alignment
- architecture direction
- protocol positioning
- internal discussion
- external narrative preparation

Do **not** rely on the whitepaper alone for implementation.  
Before coding, the relevant sections should be translated into concrete specs and task lists.

## Current Implementation Status

The repository has now moved beyond whitepaper-only or schema-only work.

Current implementation stage:

- late Phase 1 externally integrated runtime slice
- seeded durable local execution across AIP / ATS / AMN / AFAL
- shared SQLite-backed integration database for execution-critical state, admin audit, and notification outbox
- trusted-surface approval callback and resume routes plus an independent trusted-surface review service stub
- bilateral runtime-agent harnesses for payment and resource flows
- receiver callback delivery with durable outbox, worker redelivery, and operator recovery surfaces
- explicit payment-rail/provider adapter boundaries and network-shaped mock external services that AFAL can call over HTTP
- a minimal service-to-service auth boundary for those external services, including signed request metadata placeholders

So the whitepaper should now be read as:

- the long-range strategic and protocol direction

while the concrete current source of implementation truth is:

- `README.md`
- `docs/specs/`
- `docs/examples/`
- `docs/product/`
- `backend/`

## Related Folders

- `docs/architecture/` — module-level architecture docs
- `docs/specs/` — schemas, interfaces, and protocol objects
- `tasks/` — milestones, backlog, and open questions
