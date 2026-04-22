# External Agent Pilot Export Validation

## Purpose

This document defines the next validation step after AFAL's standalone pilot became exportable as a repo-external skeleton.

The goal is to answer a stricter question than the in-repo onboarding smoke:

- can AFAL produce a clean consumer-facing starter that still makes sense outside the monorepo

This is the bridge between:

- standalone pilot inside the repo

and:

- true repo-external consumer validation

---

## Export Command

From the repo root:

```bash
npm run export:external-agent-pilot
```

Default output:

- `dist/standalone-external-agent-pilot-skeleton/`

That output contains only:

- `.env.example`
- `.gitignore`
- `README.md`
- `package.json`
- `tsconfig.json`
- `src/`

No AFAL backend modules are exported.

---

## Repo-External Validation Command

For a repo-contained validation pass, run:

```bash
bash scripts/check-external-agent-pilot-export.sh
```

This checks:

- the export command completes
- the expected files exist
- the exported README no longer points back into monorepo-only paths

If you also want to test dependency installation and TypeScript compilation in the exported skeleton:

```bash
bash scripts/check-external-agent-pilot-export.sh --with-install
```

If you want to inspect the generated output directory afterward:

```bash
bash scripts/check-external-agent-pilot-export.sh --with-install --keep-output
```

---

## True External Validation

The stronger path is still:

1. export the skeleton
2. copy it into a separate repo or separate workspace
3. run `npm install`
4. run `npx tsc --noEmit`
5. wire in a real AFAL sandbox bundle
6. execute:
   - `npm run callback:receiver`
   - `npm run callbacks:register`
   - `npm run callbacks:get`
   - `npm run callbacks:list`
   - `npm run payment`
   - `npm run resource`

If the AFAL team already has a provisioning JSON bundle, they should first render `.env` text with:

```bash
npm run render:external-agent-bundle-env -- \
  --input /tmp/afal-external-bundle.json \
  --output /tmp/afal-external-agent.env
```

Success means:

- the exported skeleton installs without monorepo context
- the exported skeleton compiles without monorepo context
- the external engineer can use it with only the AFAL sandbox bundle

---

## What This Still Does Not Prove

Even after export validation passes, AFAL still does not yet prove:

- a published npm package boundary
- multi-language SDK support
- hosted onboarding automation
- production secrets handling
- production callback verification

This step only proves that the current pilot kit is disciplined enough to leave the monorepo cleanly.
