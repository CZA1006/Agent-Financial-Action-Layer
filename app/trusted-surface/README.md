# Trusted Surface

## Purpose

The `app/trusted-surface/` folder contains the human approval surface for AFAL.

A trusted surface is the interface through which high-risk or policy-sensitive actions can be reviewed, challenged, approved, or rejected by a human operator.

This folder is not intended to become a full consumer app in Phase 1.

---

## Phase 1 Role

The goal of the trusted surface in the current phase is to:
- define approval flow requirements
- define challenge states
- define what context a human must see before approving an action
- provide a placeholder structure for future implementation

This is a critical part of AMN because challenge and trusted approval are first-class features of AFAL.

---

## What Belongs Here

Examples of code or artifacts that belong in `app/trusted-surface/`:

- README and flow documentation
- approval context object definitions
- challenge state definitions
- mock approval UI notes
- approval / rejection state model
- minimal prototype placeholder (later)

Typical actions that may require trusted-surface interaction:
- high-value payment approval
- new counterparty approval
- new provider approval
- high-risk resource conversion
- future high-risk trade approval

---

## What Does Not Belong Here Yet

The following should **not** be the focus of `app/trusted-surface/` in Phase 1:

- full polished frontend product
- large design system work
- consumer wallet UX
- general-purpose dashboard
- multi-role enterprise portal
- broad app functionality unrelated to challenge / approval

---

## Working Principle

**This is a trusted approval surface, not a full consumer product.**

The trusted surface should stay tightly aligned with:
- AMN challenge logic
- Payment / Resource / future Trade intent flows
- approval / rejection / escalation state models

---

## Immediate Next Step

Phase 1 work should focus on:
- documenting the approval flow
- defining minimum information shown during challenge
- defining approval results and callbacks
- leaving implementation lightweight until the rest of AFAL schemas stabilize
