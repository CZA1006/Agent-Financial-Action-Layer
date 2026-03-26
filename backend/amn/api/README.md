# AMN API Adapter

`backend/amn/api/` provides a thin request/response adapter above the AMN admin ports.

## Purpose

- expose stable function-shaped handlers before introducing HTTP transport
- separate mandate and challenge request envelopes from store and service logic
- make authorization and approval behavior testable through a contract-like surface

## Current Capabilities

- `getMandate`
- `evaluateAuthorization`
- `createChallengeRecord`
- `buildApprovalContext`
- `recordApprovalResult`
- `finalizeAuthorization`

## Notes

- this layer defaults to the seeded in-memory AMN service
- unknown mandate or action references map to `404 not-found`
- approval and challenge handling remains callback-shaped and off-chain first
