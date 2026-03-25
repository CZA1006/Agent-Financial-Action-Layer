<!-- release-notes-status: draft-stub -->

# AFAL OpenAPI Release Notes Template

Use this template when publishing an immutable OpenAPI snapshot under `docs/specs/openapi/releases/vX.Y.Z/`.

Recommended filename:

- `docs/specs/openapi/releases/v0.1.0/release-notes.md`

---

# AFAL OpenAPI Release `vX.Y.Z`

## Summary

Short description of what this release represents.

Example:

- first stable Phase 1 HTTP contract snapshot
- additive update for resource settlement responses
- breaking rename of a capability error code

## Release Metadata

- version: `X.Y.Z`
- release path: `docs/specs/openapi/releases/vX.Y.Z/`
- source draft version: `0.x.y-draft`
- publish date: `YYYY-MM-DD`
- git commit: `<40-char commit>`
- previous release: `vA.B.C` or `none`

## Compatibility Classification

Choose one:

- `breaking`
- `additive`
- `editorial`

Definition:

- `breaking` means an existing consumer may fail, mis-parse, or silently change behavior
- `additive` means existing consumers should continue working and new fields/examples/routes are backward-compatible
- `editorial` means wording, ordering, or comments changed without changing contract meaning

## Breaking Changes

List only changes that require consumer action.

Use `none` if empty.

- none

## Additive Changes

List new backward-compatible capabilities.

Use `none` if empty.

- none

## Editorial Changes

List wording, clarification, or example-only changes.

Use `none` if empty.

- none

## Consumer Impact

State what existing consumers should do.

Examples:

- no action required for existing clients
- regenerate client types before consuming the new response field
- update error handling for renamed enum values before adopting this release

## Route-Level Notes

Document route-specific deltas if applicable.

### `POST /capabilities/execute-payment`

- no change

### `POST /capabilities/settle-resource-usage`

- no change

## Schema-Level Notes

Document important schema or enum changes.

- no change

## Error Semantics

Document status code or error code changes.

- no change

## Verification

Record the checks used when publishing.

```bash
npm run export:openapi
npm run typecheck
npm run test:mock
npm run snapshot:openapi -- X.Y.Z
```

## Published Artifacts

- `openapi.yaml`
- `openapi.json`
- `manifest.json`
- `release-notes.md`

## Migration Notes

If the release is breaking, explain the migration path.

Use `not applicable` if empty.

- not applicable
