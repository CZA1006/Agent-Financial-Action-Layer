<!-- release-notes-status: finalized -->

# AFAL OpenAPI Release `v0.1.0`

## Summary

`v0.1.0` is the first immutable OpenAPI snapshot for the AFAL Phase 1 HTTP capability contract.

It establishes the initial stable contract checkpoint for:

- `POST /capabilities/execute-payment`
- `POST /capabilities/settle-resource-usage`

This release gives downstream consumers a versioned artifact to pin to instead of following the moving `latest.yaml` and `latest.json` pointers.

## Release Metadata

- version: `0.1.0`
- release path: `docs/specs/openapi/releases/v0.1.0/`
- source draft version: `0.1.0-draft`
- publish date: `2026-03-25`
- git commit: `6c7b6da140fca52763a45a42e51b31b8ef4d7cfa`
- previous release: `none`
- worktree state at publish time: `dirty`

## Compatibility Classification

- `additive`

Rationale:

- this is the first published snapshot, so there is no prior immutable AFAL OpenAPI release to break
- the release creates a stable consumption target rather than changing an already published versioned contract

## Breaking Changes

- none

## Additive Changes

- introduced the first immutable OpenAPI snapshot under `docs/specs/openapi/releases/v0.1.0/`
- established a stable versioned publication target alongside the moving `latest` artifacts
- published the initial AFAL Phase 1 HTTP contract for payment execution and resource settlement capability flows

## Editorial Changes

- none in the versioned snapshot itself; this release is primarily a publication checkpoint

## Consumer Impact

- consumers can pin to `docs/specs/openapi/releases/v0.1.0/openapi.yaml`
- consumers can pin to `docs/specs/openapi/releases/v0.1.0/openapi.json`
- no migration is required because there is no prior immutable release baseline
- teams that were using `latest.*` may continue to do so, but should prefer `v0.1.0` for stable integrations

## Route-Level Notes

### `POST /capabilities/execute-payment`

- included in the first stable contract snapshot
- request and response envelopes are fixed for the `v0.1.0` release line
- covers payment flow success plus current Phase 1 error cases such as credential failure, authorization rejection, and authorization expiry

### `POST /capabilities/settle-resource-usage`

- included in the first stable contract snapshot
- request and response envelopes are fixed for the `v0.1.0` release line
- covers resource settlement success plus current Phase 1 error cases such as authorization cancellation and provider failure

## Schema-Level Notes

The release freezes the initial Phase 1 schema surface for:

- HTTP request envelopes
- HTTP success and error envelopes
- `PaymentFlowOutput`
- `ResourceFlowOutput`
- `AuthorizationDecision`
- `ChallengeRecord`
- `ApprovalContext`
- `ApprovalResult`
- `SettlementRecord`
- `ActionReceipt`
- `CapabilityResponse`

## Error Semantics

`v0.1.0` stabilizes the current Phase 1 error vocabulary used by the AFAL HTTP and API layers, including:

- `bad-request`
- `not-found`
- `credential-verification-failed`
- `authorization-rejected`
- `authorization-expired`
- `authorization-cancelled`
- `provider-failure`
- `internal-error`

For this release, challenge-required behavior remains represented inside the successful flow payload via authorization and approval objects, rather than as a separate HTTP error response.

## Verification

The snapshot was published from the current stable artifact chain using:

```bash
npm run export:openapi
npm run typecheck
npm run test:mock
npm run snapshot:openapi -- 0.1.0
```

## Published Artifacts

- [openapi.yaml](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/openapi/releases/v0.1.0/openapi.yaml)
- [openapi.json](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/openapi/releases/v0.1.0/openapi.json)
- [manifest.json](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/openapi/releases/v0.1.0/manifest.json)
- [release-notes.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/openapi/releases/v0.1.0/release-notes.md#L1)

## Migration Notes

- not applicable
