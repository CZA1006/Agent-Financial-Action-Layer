# ATS API Adapter

`backend/ats/api/` provides a thin request/response adapter above the ATS admin ports.

## Purpose

- expose stable function-shaped handlers before introducing HTTP transport
- separate ATS request envelopes and failure mapping from store and service logic
- make account and budget behavior testable through a contract-like surface

## Current Capabilities

- `getAccountState`
- `getMonetaryBudgetState`
- `getResourceBudgetState`
- `getResourceQuotaState`
- `freezeAccount`
- `consumeMonetaryBudget`
- `consumeResourceBudget`
- `consumeResourceQuota`

## Notes

- this layer defaults to the seeded in-memory ATS service
- unknown account, budget, or quota refs map to `404 not-found`
- budget or quota exhaustion errors map to `409 budget-exceeded`
