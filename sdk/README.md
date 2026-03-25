# SDK

## Purpose

The `sdk/` folder contains shared AFAL types, client-facing interfaces, and future SDK utilities.

In Phase 1, this folder is **not** intended to become a full-featured developer SDK yet.  
Its primary role is to establish a stable, schema-aligned object model across AIP, AMN, ATS, and AFAL.

---

## Phase 1 Role

The first priority of `sdk/` is to provide:

- shared type definitions
- schema-aligned interfaces
- reusable request / response objects
- stable object naming across modules

This means the earliest implementation work in `sdk/` should focus on:
- `sdk/types/`
- `sdk/fixtures/`
- common interfaces
- object consistency across docs and code

---

## What Belongs Here

Examples of code or artifacts that belong in `sdk/`:

- DID / identity types
- credential types
- mandate types
- payment intent types
- resource intent types
- trade intent types
- receipt and decision object types
- typed flow fixtures
- lightweight client wrappers (later)
- serialization helpers (later)

Suggested subfolders:
- `sdk/aip/`
- `sdk/amn/`
- `sdk/ats/`
- `sdk/afal/`
- `sdk/types/`
- `sdk/fixtures/`

---

## What Does Not Belong Here Yet

The following should **not** be the focus of `sdk/` in Phase 1:

- large client SDK packaging work
- production-ready language bindings
- multi-language SDK generation
- wallet integrations
- full API client implementations
- broad helper utility sprawl

---

## Working Principle

**Types first, wrappers later.**

The SDK layer should follow the schemas in:
- `docs/specs/`
- `docs/architecture/`

It should not invent new object models independently.

---

## Immediate Next Step

Phase 1 should start by implementing:
- shared types under `sdk/types/`
- stable naming for AIP / AMN / ATS / AFAL objects
- minimal interface contracts for future backend and contract integration
