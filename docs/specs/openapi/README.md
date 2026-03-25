# OpenAPI Publish Path

`docs/specs/openapi/` is the stable publication path for AFAL OpenAPI artifacts.

## Purpose

- provide a framework-agnostic, versionable location for generated OpenAPI documents
- give downstream tooling a stable path that does not depend on draft filenames
- separate editable draft specs from published contract artifacts

## Current Artifact

- `latest.yaml` — stable YAML publication path copied from `docs/specs/afal-http-openapi-draft.yaml`
- `latest.json` — generated from `docs/specs/afal-http-openapi-draft.yaml` via `npm run export:openapi`
- `manifest.json` — metadata for the current published OpenAPI artifacts, including generation time and git commit
- `index.html` — static Swagger UI preview bound to `./latest.json`
- `versioning-policy.md` — rules for version bumps, breaking changes, and future snapshot publication
- `releases/` — immutable version snapshots published from the current stable artifacts
- `releases/index.json` — generated catalog of published immutable snapshots
- `releases/release-notes-template.md` — template for per-release compatibility notes

## Preview

- run `npm run preview:openapi`
- open `http://127.0.0.1:3210`

## Snapshot Publish

- run `npm run snapshot:openapi -- 0.1.0`
- this creates `docs/specs/openapi/releases/v0.1.0/`
- the publish step also refreshes `docs/specs/openapi/releases/index.json`
- the publish step also creates `docs/specs/openapi/releases/v0.1.0/release-notes.md` from the template
