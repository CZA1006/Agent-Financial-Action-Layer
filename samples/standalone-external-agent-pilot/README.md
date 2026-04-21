# AFAL Standalone External Agent Pilot

This directory is the first extractable external-consumer kit for AFAL.

It is intentionally standalone:

- no imports from `backend/`
- no imports from `sdk/fixtures`
- no imports from `agents/test-harness`

The goal is to simulate what an outside team would do when consuming AFAL as a sandbox service.

For the broader handoff context, see:

- [External Engineer Pilot Handoff](../../docs/product/external-engineer-pilot-handoff.md)
- [External Engineer Message Template](../../docs/product/external-engineer-message-template.md)

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

If this directory is being used by a second engineer, the preferred workflow is:

- AFAL team runs the sandbox
- AFAL team provisions the client
- external engineer only consumes the public surface from this directory

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

Minimum `.env` fields:

- `AFAL_BASE_URL`
- `AFAL_CLIENT_ID`
- `AFAL_SIGNING_KEY`

Usually also needed:

- `AFAL_MONETARY_BUDGET_REF`
- `AFAL_RESOURCE_BUDGET_REF`
- `AFAL_RESOURCE_QUOTA_REF`
- `AFAL_PAYMENT_CALLBACK_URL`
- `AFAL_RESOURCE_CALLBACK_URL`

If the engineer cannot tell where those values come from, the AFAL team has not provided a clean enough handoff bundle yet.

## Register Callbacks

```bash
npm run callbacks:register
```

Expected result:

- a successful JSON response
- `callbackRegistration` populated with the registered URLs
- no need to hand-build signed headers manually

Optional readback:

```bash
npm run callbacks:get
npm run callbacks:list
```

The engineer should save these outputs when reporting feedback.

## Run the Standalone Receiver

```bash
npm run callback:receiver
```

The receiver listens on `POST /callbacks/action-settled`.

Expected startup output:

```text
callback receiver listening on http://127.0.0.1:3401/callbacks/action-settled
```

The engineer should keep this terminal open while submitting payment and resource requests.

## Send Payment / Resource Requests

```bash
npm run payment
npm run resource
```

These scripts submit:

- `POST /capabilities/request-payment-approval`
- `POST /capabilities/request-resource-approval`

They intentionally stop at the public AFAL request boundary. Approval completion and settlement still occur on the AFAL side.

Expected result for both commands:

- HTTP success
- capability result indicates `pending-approval`
- output includes enough state to identify the pending action

For this pilot, that is sufficient.
The external engineer does not need to implement a custom agent runtime yet.

## What To Send Back

The external engineer should send back:

1. output from `callbacks:register`
2. output from `callbacks:get` or `callbacks:list`
3. output from `payment`
4. output from `resource`
5. one callback payload example, if received
6. a short friction report

Recommended friction report format:

```text
Step:
What I tried:
What was confusing:
What I expected:
Suggested fix:
```

## Extraction Guidance

To turn this into a true external repo:

1. copy this directory into a new repo
2. keep only `package.json`, `.env.example`, `README.md`, and `src/`
3. point `AFAL_BASE_URL` to a running AFAL sandbox instance

If that copied repo still works, AFAL is behaving like an actual external integration surface rather than an internal monorepo convenience.

This is the intended bridge toward a future consumer-facing SDK or package surface.

That future package surface should not be designed until this standalone consumer path has been tested by someone outside the implementation loop.
