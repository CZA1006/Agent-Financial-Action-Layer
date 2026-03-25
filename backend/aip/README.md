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
- expose interfaces before implementation
