# AIP API Adapter

`backend/aip/api/` provides a thin request/response adapter above the AIP admin and verification ports.

## Purpose

- expose stable function-shaped capability handlers before introducing HTTP transport
- keep AIP request envelopes and failure mapping separate from store and service implementation
- make it possible to test AIP behavior through a contract-like surface

## Current Capabilities

- `resolveIdentity`
- `verifyCredential`
- `freezeIdentity`
- `revokeCredential`

## Notes

- this layer defaults to the seeded in-memory AIP service
- `verifyCredential` returns `200` with `valid: false` for known but invalid credentials
- unknown DIDs and unknown credential IDs map to `404 not-found`
