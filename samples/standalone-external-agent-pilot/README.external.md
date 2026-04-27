# AFAL Standalone External Agent Pilot

This directory is a repo-external consumer skeleton for AFAL's sandbox-facing HTTP surface.

It is intentionally narrow.
Its job is to prove that an outside engineer can consume AFAL without importing AFAL runtime code.

## What This Skeleton Covers

- signed external-client requests
- callback registration over AFAL's public API
- one payment approval request
- one resource approval request
- one minimal callback receiver

## What You Need From The AFAL Team

Before this skeleton is useful, the AFAL team must give you:

1. one running AFAL sandbox base URL
2. one provisioned client bundle
3. the expected callback URL you should register

At minimum, you need these values:

- `AFAL_BASE_URL`
- `AFAL_CLIENT_ID`
- `AFAL_SIGNING_KEY`
- `AFAL_MONETARY_BUDGET_REF`
- `AFAL_RESOURCE_BUDGET_REF`
- `AFAL_RESOURCE_QUOTA_REF`
- `AFAL_PAYMENT_CALLBACK_URL`
- `AFAL_RESOURCE_CALLBACK_URL`

If the AFAL team cannot provide those values as one clean bundle, the onboarding surface is still too implicit.

## Setup

```bash
cd pilot
npm install
```

Optional but recommended:

```bash
npx tsc --noEmit
npm run preflight
```

`npm run preflight` verifies both AFAL reachability and whether the bundled
external-client credentials are accepted by AFAL. If it fails with
`Unknown external agent client`, ask the AFAL team for a bundle provisioned
against the same deployed sandbox instance named by `AFAL_BASE_URL`.

## Environment

Expected `.env` fields:

```bash
AFAL_BASE_URL=http://127.0.0.1:3213
AFAL_CLIENT_ID=client-demo-001
AFAL_SIGNING_KEY=replace-with-signing-key

AFAL_MONETARY_BUDGET_REF=budg-money-001
AFAL_RESOURCE_BUDGET_REF=budg-res-001
AFAL_RESOURCE_QUOTA_REF=quota-001

AFAL_PAYMENT_CALLBACK_URL=http://127.0.0.1:3401/callbacks/action-settled
AFAL_RESOURCE_CALLBACK_URL=http://127.0.0.1:3401/callbacks/action-settled

CALLBACK_RECEIVER_HOST=127.0.0.1
CALLBACK_RECEIVER_PORT=3401
CALLBACK_RECEIVER_ARTIFACTS_DIR=./artifacts/callbacks
```

## Minimal Validation Path

Start from inside `pilot/`.

Start the callback receiver:

```bash
npm run callback:receiver
```

In a second terminal:

```bash
npm run tunnel:start
```

The preferred tunnel tool is `cloudflared`; it supports anonymous HTTPS tunnels
and does not require an account for this pilot path. If `ngrok` is used instead,
configure a verified account and authtoken first.

On macOS:

```bash
brew install cloudflared
```

Take the public HTTPS callback URL from your tunnel and update:

- `AFAL_PAYMENT_CALLBACK_URL`
- `AFAL_RESOURCE_CALLBACK_URL`

Then run:

```bash
npm run callbacks:register
npm run callbacks:get
npm run callbacks:list
npm run payment
npm run resource
```

Expected results:

- callback registration succeeds
- callback readback returns the same URLs
- payment request returns `pending-approval`
- resource request returns `pending-approval`

## Scripts

- `npm run preflight`
- `npm run callback:receiver`
- `npm run tunnel:start`
- `npm run callbacks:register`
- `npm run callbacks:get`
- `npm run callbacks:list`
- `npm run payment`
- `npm run resource`

## Extraction Contract

This skeleton is intentionally self-contained:

- no imports from AFAL backend modules
- no imports from AFAL internal fixtures
- no imports from AFAL internal test harnesses

If you need to add those imports to make this repo work, the AFAL consumer boundary is not stable enough yet.
