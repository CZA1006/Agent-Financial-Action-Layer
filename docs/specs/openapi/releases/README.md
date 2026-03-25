# OpenAPI Release Snapshots

`docs/specs/openapi/releases/` contains immutable version snapshots of the AFAL OpenAPI contract.

## Purpose

- preserve stable checkpoints independently from `latest.yaml` and `latest.json`
- support downstream consumers that should not track the moving `latest` pointer
- align the repository with the snapshot policy in `versioning-policy.md`

## Publishing

- run `npm run snapshot:openapi -- 0.1.0`
- this publishes a snapshot under `releases/v0.1.0/`
- the publish step also refreshes `releases/index.json`
- the publish step also creates `releases/v0.1.0/release-notes.md` from the template if it does not already exist
- each snapshot contains:
  - `openapi.yaml`
  - `openapi.json`
  - `manifest.json`
  - `release-notes.md`

## Catalog

- `index.json` is the machine-readable release catalog for published snapshots
- it records the known releases, current draft version, and the latest published snapshot pointer
- it also records `notesStatus` and `notesFinalized` so consumers can distinguish a generated stub from a finalized compatibility note

## Release Notes

- use [release-notes-template.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/openapi/releases/release-notes-template.md#L1) when documenting a published snapshot
- recommended path: `docs/specs/openapi/releases/vX.Y.Z/release-notes.md`
- every release note should explicitly classify changes as `breaking`, `additive`, or `editorial`
- use `<!-- release-notes-status: draft-stub -->` for generated placeholders and `<!-- release-notes-status: finalized -->` once the note is reviewed

## Rule

Snapshots should be treated as immutable once published.
