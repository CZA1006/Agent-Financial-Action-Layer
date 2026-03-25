# Contracts

## Purpose

The `contracts/` folder contains AFAL’s on-chain contract layer.

This folder is intended for:
- registry contracts
- status / revocation anchors
- account factory logic
- policy module interfaces
- receipt / attestation registry concepts

In Phase 1, this folder should remain **schema-driven and minimal**.

---

## Phase 1 Role

The goal of `contracts/` in the current phase is **not** to build the full on-chain system.

The goal is to:
- define contract boundaries
- define interface drafts
- scaffold the on-chain modules that AFAL may need
- align smart contract thinking with AIP / AMN / ATS / AFAL specs

---

## What Belongs Here

Examples of code or artifacts that belong in `contracts/`:

- DID registry or DID anchor draft
- credential status / revocation registry draft
- smart account factory draft
- policy module draft
- receipt / attestation registry draft
- interface contracts
- storage model notes
- contract README and design notes

Suggested subfolders:
- `contracts/aip/`
- `contracts/amn/`
- `contracts/ats/`
- `contracts/afal/`

---

## What Does Not Belong Here Yet

The following should **not** be the focus of `contracts/` in Phase 1:

- full production-grade Solidity implementation
- advanced upgradeability frameworks
- multi-chain deployment logic
- full exchange or market contracts
- complicated settlement engines
- premature optimization
- writing contracts before specs are stable

---

## Working Principle

**Contracts follow specs, not the other way around.**

Contract work must be derived from:
- `docs/specs/`
- `docs/architecture/`
- current MVP scope

If schema or module boundaries are still unclear, document the uncertainty first instead of over-implementing.

---

## Immediate Next Step

Phase 1 contract work should prioritize:
- interface definitions
- minimal registry/account scaffolding
- notes on which data belongs on-chain vs off-chain
- narrow, modular contract surfaces
