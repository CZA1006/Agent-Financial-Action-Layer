# AFAL Standalone External Agent Pilot

This directory is the first extractable external-consumer kit for AFAL.

It is intentionally standalone:

- no imports from `backend/`
- no imports from `sdk/fixtures`
- no imports from `agents/test-harness`

The goal is to simulate what an outside team would do when consuming AFAL as a sandbox service.

## What It Covers

- signed external-client requests
- callback registration over the public sandbox API
- payment approval request
- resource approval request
- standalone callback receiver

## Prerequisites

1. Start the AFAL SQLite HTTP server in the main repo.
2. Provision one sandbox external client in the main repo.
3. Copy `.env.example` to `.env` and fill in the real values.

Example provisioning flow in the main repo:

```bash
npm run provision:external-agent-sandbox -- \
  --data-dir ./.afal-sqlite-http-data \
  --client-id client-demo-001 \
  --tenant-id tenant-demo-001 \
  --agent-id agent-demo-001 \
  --subject-did did:afal:agent:payment-agent-01 \
  --mandate-ref mnd-0001 \
  --payment-payee-did did:afal:agent:fraud-service-01 \
  --resource-provider-did did:afal:institution:provider-openai
```

## Setup

```bash
cp .env.example .env
npm install
```

## Register Callbacks

```bash
npm run callbacks:register
```

Optional readback:

```bash
npm run callbacks:get
npm run callbacks:list
```

## Run the Standalone Receiver

```bash
npm run callback:receiver
```

The receiver listens on `POST /callbacks/action-settled`.

## Send Payment / Resource Requests

```bash
npm run payment
npm run resource
```

These scripts submit:

- `POST /capabilities/request-payment-approval`
- `POST /capabilities/request-resource-approval`

They intentionally stop at the public AFAL request boundary. Approval completion and settlement still occur on the AFAL side.

## Extraction Guidance

To turn this into a true external repo:

1. copy this directory into a new repo
2. keep only `package.json`, `.env.example`, `README.md`, and `src/`
3. point `AFAL_BASE_URL` to a running AFAL sandbox instance

If that copied repo still works, AFAL is behaving like an actual external integration surface rather than an internal monorepo convenience.
