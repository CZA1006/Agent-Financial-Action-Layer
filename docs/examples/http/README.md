# HTTP Examples

This directory contains canonical AFAL HTTP request examples aligned with the current durable HTTP transport.

Available examples:
- `request-payment-approval.request.json` — canonical Phase 1 top-level pending payment approval request
- `request-payment-approval.response.sample.json` — canonical pending-approval response with approval session
- `get-approval-session.request.json` — canonical trusted-surface session read request
- `get-approval-session.response.sample.json` — canonical trusted-surface session read response
- `apply-approval-result.request.json` — canonical trusted-surface approval callback request
- `apply-approval-result.response.sample.json` — canonical trusted-surface approval callback success response
- `execute-payment.request.json` — canonical Phase 1 payment capability request
- `execute-payment.response.sample.json` — canonical Phase 1 payment success response
- `execute-payment.bad-request.response.sample.json` — transport-level request validation failure
- `execute-payment.authorization-expired.response.sample.json` — payment approval expiry response
- `execute-payment.authorization-rejected.response.sample.json` — payment approval rejection response
- `resume-approved-action.request.json` — canonical AFAL async resume request after approval callback
- `resume-approved-action.response.sample.json` — canonical resumed payment settlement success response
- `resume-approved-action.authorization-expired.response.sample.json` — resume failure after expired approval
- `resume-approved-action.authorization-rejected.response.sample.json` — resume failure after rejected approval
- `settle-resource-usage.request.json` — canonical Phase 1 resource settlement capability request
- `settle-resource-usage.response.sample.json` — canonical Phase 1 resource settlement success response
- `settle-resource-usage.provider-failure.response.sample.json` — provider usage confirmation failure response

These files are intended for:
- local `curl` demos against `npm run serve:durable-http`
- contract review alongside the OpenAPI artifacts
- quick manual verification without reconstructing request bodies from fixtures
- one-shot scripted demos through `scripts/demo-http.sh`
- one-shot async approval demos through `scripts/demo-http-async.sh`

Example usage:

```bash
curl -X POST http://127.0.0.1:3212/capabilities/request-payment-approval \
  -H 'content-type: application/json' \
  -d @docs/examples/http/request-payment-approval.request.json
```

Then the trusted surface can read the session and apply the callback:

```bash
curl -X POST http://127.0.0.1:3212/approval-sessions/get \
  -H 'content-type: application/json' \
  -d @docs/examples/http/get-approval-session.request.json

curl -X POST http://127.0.0.1:3212/approval-sessions/apply-result \
  -H 'content-type: application/json' \
  -d @docs/examples/http/apply-approval-result.request.json
```

Then, after the trusted-surface callback is applied:

```bash
curl -X POST http://127.0.0.1:3212/approval-sessions/resume-action \
  -H 'content-type: application/json' \
  -d @docs/examples/http/resume-approved-action.request.json
```

Scripted usage:

```bash
bash scripts/demo-http.sh payment
bash scripts/demo-http.sh resource
bash scripts/demo-http-async.sh
npm run trusted-surface:stub -- --base-url http://127.0.0.1:3212 --approval-session-ref aps-chall-0001
```
