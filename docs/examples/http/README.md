# HTTP Examples

This directory contains canonical AFAL HTTP request examples aligned with the current durable HTTP transport.

Available examples:
- `request-payment-approval.request.json` — canonical Phase 1 top-level pending payment approval request
- `request-payment-approval.response.sample.json` — canonical pending-approval response with approval session
- `get-action-status.payment.request.json` — canonical payment action status query request
- `get-action-status.payment.response.sample.json` — canonical settled payment action status response
- `get-action-status.resource.request.json` — canonical resource action status query request
- `get-action-status.resource.response.sample.json` — canonical settled resource action status response
- `get-notification-delivery.request.json` — canonical notification delivery lookup request
- `get-notification-delivery.response.sample.json` — canonical notification delivery record response
- `list-notification-deliveries.request.json` — canonical notification delivery list request
- `list-notification-deliveries.response.sample.json` — canonical notification delivery list response
- `get-admin-audit-entry.request.json` — canonical notification admin audit lookup request
- `get-admin-audit-entry.response.sample.json` — canonical notification admin audit entry response
- `list-admin-audit-entries.request.json` — canonical notification admin audit list request
- `list-admin-audit-entries.response.sample.json` — canonical notification admin audit list response
- `get-notification-worker-status.request.json` — canonical notification worker status request
- `get-notification-worker-status.response.sample.json` — canonical notification worker status response
- `start-notification-worker.request.json` — canonical notification worker start request
- `start-notification-worker.response.sample.json` — canonical notification worker start response
- `stop-notification-worker.request.json` — canonical notification worker stop request
- `stop-notification-worker.response.sample.json` — canonical notification worker stop response
- `get-approval-session.request.json` — canonical trusted-surface session read request
- `get-approval-session.response.sample.json` — canonical trusted-surface session read response
- `apply-approval-result.request.json` — canonical trusted-surface approval callback request
- `apply-approval-result.response.sample.json` — canonical trusted-surface approval callback success response
- `redeliver-notification.request.json` — canonical notification redelivery request
- `redeliver-notification.response.sample.json` — canonical notification redelivery success response
- `run-notification-worker.request.json` — canonical single worker-cycle trigger request
- `run-notification-worker.response.sample.json` — canonical single worker-cycle trigger response
- `execute-payment.request.json` — canonical Phase 1 payment capability request
- `execute-payment.response.sample.json` — canonical Phase 1 payment success response
- `execute-payment.bad-request.response.sample.json` — transport-level request validation failure
- `execute-payment.authorization-expired.response.sample.json` — payment approval expiry response
- `execute-payment.authorization-rejected.response.sample.json` — payment approval rejection response
- `execute-payment.external-adapter-unavailable.response.sample.json` — transient payment rail unavailability response
- `execute-payment.external-adapter-rejected.response.sample.json` — terminal payment rail rejection response
- `resume-approved-action.request.json` — canonical AFAL async resume request after approval callback
- `resume-approved-action.response.sample.json` — canonical resumed payment settlement success response
- `resume-approved-action.authorization-expired.response.sample.json` — resume failure after expired approval
- `resume-approved-action.authorization-rejected.response.sample.json` — resume failure after rejected approval
- `settle-resource-usage.request.json` — canonical Phase 1 resource settlement capability request
- `settle-resource-usage.response.sample.json` — canonical Phase 1 resource settlement success response
- `settle-resource-usage.provider-failure.response.sample.json` — provider usage confirmation failure response
- `settle-resource-usage.external-adapter-unavailable.response.sample.json` — transient provider dependency unavailability response
- `settle-resource-usage.external-adapter-rejected.response.sample.json` — terminal provider rejection response

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

Receiver-side or provider-side agents can independently confirm final state through the read-side action query:

```bash
curl -X POST http://127.0.0.1:3212/actions/get \
  -H 'content-type: application/json' \
  -d @docs/examples/http/get-action-status.payment.request.json
```

Operators can inspect and redeliver receiver-side settlement callbacks through the notification outbox routes:

```bash
curl -X POST http://127.0.0.1:3212/notification-deliveries/list \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/list-notification-deliveries.request.json

curl -X POST http://127.0.0.1:3212/notification-deliveries/get \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/get-notification-delivery.request.json

curl -X POST http://127.0.0.1:3212/notification-deliveries/redeliver \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/redeliver-notification.request.json

curl -X POST http://127.0.0.1:3212/admin-audit/list \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/list-admin-audit-entries.request.json

curl -X POST http://127.0.0.1:3212/admin-audit/get \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/get-admin-audit-entry.request.json
```

If operator auth is configured on the AFAL HTTP server, these routes require the `x-afal-operator-token` header. The same requirement applies to notification worker control and admin audit reads.

Notification worker status and control are exposed separately:

```bash
curl -X POST http://127.0.0.1:3212/notification-worker/get \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/get-notification-worker-status.request.json

curl -X POST http://127.0.0.1:3212/notification-worker/run \
  -H 'content-type: application/json' \
  -H 'x-afal-operator-token: operator-secret' \
  -d @docs/examples/http/run-notification-worker.request.json
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

Receiver-side settlement callback payload samples live under:

- [docs/examples/callback/README.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/examples/callback/README.md#L1)
