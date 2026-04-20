# DID / VC References

## Status
Working reference set

This file collects the core DID / VC references that inform AIP design and the lightweight `did:key` execution profile used in local demos and interoperability discussions.

Phase 1 note:

- AFAL uses an internal `did:afal:*` namespace
- AFAL remains forward-compatible with stricter DID / VC patterns later
- AFAL can also use `did:key` as a self-certifying execution identity for bilateral authentication and off-chain proof verification

## Core Standards

- W3C DID Core: <https://www.w3.org/TR/did-core/>
- W3C Verifiable Credentials Data Model 1.1: <https://www.w3.org/TR/vc-data-model/>
- W3C Controlled Identifiers: <https://www.w3.org/TR/cid-1.0/>

## DID Method And Key Material

- `did:key` method specification: <https://w3c-ccg.github.io/did-method-key/>
- Multibase draft reference: <https://datatracker.ietf.org/doc/html/draft-multiformats-multibase-03>
- Multicodec table reference: <https://github.com/multiformats/multicodec>

## Verification Suites

- Ed25519 Signature 2020 cryptosuite context: <https://w3id.org/security/suites/ed25519-2020/v1>
- Data Integrity overview: <https://www.w3.org/TR/vc-data-integrity/>

## Status And Revocation

- VC Status List 2021: <https://www.w3.org/TR/vc-status-list/>

## AFAL Design Relevance

These references matter to AFAL in three different ways:

- they anchor the long-term AIP direction to DID / VC standards
- they justify `did:key` as a practical Phase 1 execution identity
- they provide a clean upgrade path from local off-chain verification toward richer managed identity infrastructure
