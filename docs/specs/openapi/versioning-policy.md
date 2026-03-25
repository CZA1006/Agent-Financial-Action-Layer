# AFAL OpenAPI Versioning Policy

## Purpose

This document defines how AFAL versions, publishes, and changes its OpenAPI contract artifacts.

The goal is to make the current Phase 1 contract usable by:
- internal builders
- future client generators
- future HTTP/server adapters
- external reviewers

without forcing consumers to guess whether a change is safe.

---

## Scope

This policy applies to the AFAL OpenAPI publishing chain:

- `docs/specs/afal-http-openapi-draft.yaml`
- `docs/specs/afal-http-openapi-draft.json`
- `docs/specs/openapi/latest.yaml`
- `docs/specs/openapi/latest.json`
- `docs/specs/openapi/manifest.json`
- `docs/specs/openapi/index.html`

It applies to:
- route paths
- HTTP methods
- request envelopes
- response envelopes
- schema shapes
- enum vocabularies
- error codes

It does not define runtime backend deployment policy.

---

## Artifact Roles

### Draft

Draft artifacts are editable working sources.

- `afal-http-openapi-draft.yaml`
- `afal-http-openapi-draft.json`

Draft artifacts may change frequently during design iteration.
They are the source of truth for editing, but they are not the stable consumption target.

### Stable Latest

Stable latest artifacts are the current published contract surface.

- `docs/specs/openapi/latest.yaml`
- `docs/specs/openapi/latest.json`

Downstream tools should prefer these paths over the draft filenames.

### Manifest

`docs/specs/openapi/manifest.json` is the metadata record for the current stable publication.

It records:
- artifact name
- published version string
- OpenAPI version
- generation time
- source artifact paths
- stable artifact paths
- git commit
- git dirty state

### Release Catalog

`docs/specs/openapi/releases/index.json` is the discovery artifact for immutable snapshots.

It records:
- current draft version
- latest snapshot pointer
- ordered published release entries
- per-release artifact paths and git metadata
- release note completion state via `notesStatus` and `notesFinalized`

### Preview

`docs/specs/openapi/index.html` is a human review surface.

It is not a version source.
It should always reflect `latest.json`.

---

## Version String Policy

AFAL uses a contract version string stored in `manifest.json`.

Current format:

- pre-release working state: `0.x.y-draft`
- stable snapshot target: `0.x.y`

### Phase 1 rule

While AFAL remains in Phase 1 and the contract is still moving quickly:

- breaking changes increment the `minor` version
- backward-compatible additions increment the `patch` version
- editorial-only changes may keep the same numeric version and remain `-draft`

Example:

- `0.1.0-draft` -> current working contract
- `0.2.0-draft` -> breaking Phase 1 contract update
- `0.2.1-draft` -> backward-compatible additive update after `0.2.0`

### Post-1.0 rule

Once AFAL declares a stable contract line:

- breaking changes increment `major`
- backward-compatible additions increment `minor`
- backward-compatible fixes increment `patch`

In other words, standard semver starts at `1.0.0`.

---

## What Counts As Breaking

A change is breaking if an existing consumer built against the prior published contract could fail, mis-parse, or silently change behavior.

Breaking changes include:

- removing a route
- renaming a route
- changing an HTTP method
- removing a required request field
- adding a new required request field
- removing a response field that clients may rely on
- changing a field type
- narrowing a field in a way that rejects previously valid values
- renaming enum values
- removing enum values
- changing error code semantics
- changing `requestRef` or envelope behavior in a non-compatible way

Examples in AFAL terms:

- changing `/capabilities/execute-payment` to another path
- renaming `settleResourceUsage` capability
- changing `authorization-expired` to `approval-expired`
- replacing `requestRef` with another correlation field

---

## What Counts As Non-Breaking

Non-breaking changes include:

- adding an optional field
- adding a new response example
- clarifying descriptions
- adding new schemas that do not affect existing routes
- adding a new optional error metadata field
- tightening docs around behavior without changing the actual contract

Examples:

- adding an optional field to `CapabilityResponse`
- adding another `403` example in the OpenAPI draft
- improving descriptions for `challenge-required` semantics

---

## What Counts As Editorial Only

Editorial changes do not affect contract meaning.

Examples:

- fixing grammar
- reordering sections
- improving comments
- changing wording without changing field names, status codes, or examples meaning

Editorial-only changes do not require a numeric version bump by themselves.

---

## Publication Rules

### Rule 1

`latest.yaml` and `latest.json` must always be generated, never hand-edited.

They are publish artifacts, not editing targets.

### Rule 2

`manifest.json` must always be generated together with the stable artifacts.

If `latest.yaml` or `latest.json` changes, `manifest.json` must change too.

### Rule 3

`index.html` must always point to `./latest.json`.

The preview surface must not point at draft paths.

### Rule 4

Before publishing changes to `latest.*`, these commands must pass:

```bash
npm run export:openapi
npm run typecheck
npm run test:mock
```

### Rule 5

If the git worktree is dirty when exporting, that fact may be recorded in `manifest.json`, but a stable tagged release should ideally be published from a clean worktree.

---

## Snapshot Policy

`latest.*` is a moving pointer.

It is useful for:
- current internal integration
- preview
- active design review

It is not enough for long-lived external dependencies.

When AFAL wants a stable reusable contract checkpoint, it should create a version snapshot.

Recommended future path:

- `docs/specs/openapi/releases/v0.1.0/openapi.yaml`
- `docs/specs/openapi/releases/v0.1.0/openapi.json`
- `docs/specs/openapi/releases/v0.1.0/manifest.json`

Policy for snapshots:

- snapshots are immutable
- `latest.*` may move forward
- snapshot manifests should record the exact git commit and published version

This snapshot path is recommended policy even if the repo has not implemented it yet.

The release catalog path is:

- `docs/specs/openapi/releases/index.json`

Whenever a snapshot is published, the catalog must be refreshed so consumers can discover available immutable versions without scanning the filesystem.

### Release Notes

Each published snapshot should also include a human-readable compatibility note:

- `docs/specs/openapi/releases/v0.1.0/release-notes.md`

Use:

- `docs/specs/openapi/releases/release-notes-template.md`

The release note is where AFAL must explicitly classify the release as:

- `breaking`
- `additive`
- `editorial`

The machine-readable catalog is not a substitute for these compatibility notes.
The snapshot publish step may generate the initial stub automatically, but the release owner is still responsible for replacing placeholder content with the actual compatibility assessment before treating the release notes as final.

Release notes should carry one of these status markers near the top of the file:

- `<!-- release-notes-status: draft-stub -->`
- `<!-- release-notes-status: finalized -->`

---

## Change Workflow

Recommended workflow for OpenAPI contract changes:

1. Edit `docs/specs/afal-http-openapi-draft.yaml`.
2. Decide whether the change is breaking, non-breaking, or editorial.
3. Update the target version policy mentally before publishing.
4. Run `npm run export:openapi`.
5. Run `npm run typecheck`.
6. Run `npm run test:mock`.
7. Review:
   - `docs/specs/openapi/latest.yaml`
   - `docs/specs/openapi/latest.json`
   - `docs/specs/openapi/manifest.json`
8. If publishing a snapshot, run `npm run snapshot:openapi -- X.Y.Z`.
9. Add `docs/specs/openapi/releases/vX.Y.Z/release-notes.md` from the template and document compatibility impact.
   - `docs/specs/openapi/index.html`
8. If the change is intended as a stable checkpoint, create a version snapshot in a release path.

---

## Consumer Guidance

Internal AFAL code may reference `latest.*` during active development.

External or long-lived consumers should eventually prefer version snapshots over `latest.*`.

Until snapshot publishing exists, consumers should treat `latest.*` as:

- stable enough for review
- stable enough for current integration experiments
- not guaranteed immutable

---

## Review Checklist

Before accepting an OpenAPI contract change, review:

- Did any route path or method change?
- Did any required request field change?
- Did any required response field change?
- Did any enum value change?
- Did any error code change?
- Did `latest.yaml`, `latest.json`, and `manifest.json` regenerate?
- Does `index.html` still point at `latest.json`?
- Are `typecheck` and `test:mock` green?

---

## Current Phase 1 Status

At the time of writing, AFAL is still in a pre-1.0 contract stage.

This means:

- contract changes should be expected
- breaking changes should still be treated seriously
- `minor` is the practical breaking-change boundary for now
- `latest.*` is the main stable consumption target
- versioned release snapshots are recommended as the next maturity step
