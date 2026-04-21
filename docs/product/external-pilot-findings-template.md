# External Pilot Findings Template

## Purpose

This document is the standard format for collecting findings from a repo-external AFAL sandbox pilot.

It should be used after:

- the external engineer has run the standalone pilot kit
- the engineer has provided command output, callback samples, and friction notes

The goal is to turn raw feedback into:

- a prioritized findings list
- concrete documentation fixes
- concrete contract fixes
- concrete SDK/package boundary decisions

---

## Metadata

- Pilot date:
- Engineer:
- Environment:
  - OS:
  - Node version:
  - Network assumptions:
- AFAL sandbox base URL:
- Client ID used:
- Standalone pilot commit or snapshot:

---

## Outcome Summary

Mark one:

- `passed`
- `passed-with-friction`
- `blocked`

Short summary:

```text
<2-5 sentences>
```

---

## Executed Steps

Mark each:

- `completed`
- `completed-with-friction`
- `blocked`
- `not-attempted`

### 1. Standalone setup

- Status:
- Notes:

### 2. Callback receiver startup

- Status:
- Notes:

### 3. Callback registration

- Status:
- Notes:

### 4. Callback readback

- Status:
- Notes:

### 5. Payment request

- Status:
- Notes:

### 6. Resource request

- Status:
- Notes:

### 7. Callback delivery observation

- Status:
- Notes:

---

## Findings

Each finding should be recorded in this format.

### Finding

- ID:
- Severity:
  - `critical`
  - `major`
  - `minor`
- Category:
  - `onboarding`
  - `auth-signing`
  - `callback-registration`
  - `request-shape`
  - `response-shape`
  - `error-message`
  - `callback-delivery`
  - `docs-gap`
  - `sample-kit`
- Step:
- What the engineer tried:
- What happened:
- What the engineer expected:
- Why this matters:
- Proposed fix:
- Owner:
- Status:
  - `new`
  - `triaged`
  - `scheduled`
  - `fixed`
  - `wont-fix`

Duplicate this block for every issue.

---

## Top 3 Friction Points

1. ...
2. ...
3. ...

---

## Immediate Fixes

These are the fixes that should be made before asking another external engineer to run the same pilot.

1. ...
2. ...
3. ...

---

## Deferred Fixes

These are useful improvements, but not required before the next external pilot.

1. ...
2. ...
3. ...

---

## Impact On SDK / Package Boundary

Use this section to record what the pilot says about the future consumer-facing SDK or package surface.

Questions to answer:

- which steps should definitely be wrapped by an SDK
- which steps are acceptable as raw HTTP for advanced users
- which callback tasks should move into a starter package
- which auth/signing details should be hidden by a client library
- which AFAL response or error fields are too low-level for direct consumer use

Notes:

```text
<write conclusions here>
```

---

## Evidence Checklist

Attach or link:

- callback registration output
- callback readback output
- payment request output
- resource request output
- one callback payload example
- friction notes from the engineer

If any of these are missing, note why.
