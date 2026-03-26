# Backend AIP Service Boundary

## Purpose

`backend/aip/` owns identity resolution and credential verification boundaries for Phase 1.

## Objects Owned

- DID records
- owner-agent bindings
- verifiable credential validation results
- freeze / revoke / rotate requests

## Inputs

- DID creation/update requests
- credential issuance and verification requests
- issuer trust checks

## Outputs

- resolved identity record
- credential verification result
- identity lifecycle status

## Notes

- derive shapes from `docs/specs/aip-did-schema.md` and `docs/specs/aip-vc-schema.md`
- keep verification off-chain first in Phase 1
- the current next-stage implementation is an in-memory, storage-backed service skeleton
- the external boundary is now split into:
  - `interfaces.ts` for reader / verification / lifecycle ports
- the adapter layer is now split into:
  - `api/` for request/response handlers above the AIP ports
- storage is now split into:
  - `store.ts` for persistence operations
  - `file-store.ts` for a durable JSON snapshot implementation of the same store boundary
  - `service.ts` for verification and lifecycle logic
- seeded canonical data is split into:
  - `bootstrap.ts` for fixture-backed seed assembly
- this layer now owns:
  - persistent DID record lookup
  - persistent credential record lookup
  - credential verification against lifecycle state and expiration
  - identity freeze and credential revocation state transitions
  - one minimal durable persistence option for local seeded mode via `JsonFileAipStore`
