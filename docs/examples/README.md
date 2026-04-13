# Examples

This folder contains canonical AFAL examples derived from the Phase 1 schema set.

These documents are intended to bridge:

- whitepaper direction
- schema definitions
- backend orchestration
- SDK fixtures
- future demo scenarios

Phase 1 priority:

- `did-key-agent-auth-flow.md` — executable `did:key + Ed25519 + VC` identity and bilateral authentication flow for local demos and interop bootstrap
- `mvp-agent-payment-flow.md` — canonical agent-to-agent API/tool payment flow in USDC on Base
- `mvp-resource-settlement-flow.md` — canonical resource purchase and provider settlement flow in USDC on Base
- `callback/payment-settled.notification.sample.json` — canonical payee-side settlement callback payload
- `callback/resource-settled.notification.sample.json` — canonical provider-side settlement callback payload
- `external/payment-rail.execute-payment.request.sample.json` — canonical authenticated outbound payment rail request with signed metadata placeholder
- `external/provider-service.confirm-usage.request.sample.json` — canonical authenticated outbound provider usage request with signed metadata placeholder
- `http/request-payment-approval.request.json` — canonical HTTP request body for `POST /capabilities/request-payment-approval`
- `http/request-payment-approval.response.sample.json` — canonical pending-approval success response for `POST /capabilities/request-payment-approval`
- `http/get-action-status.payment.request.json` — canonical payment action status request for `POST /actions/get`
- `http/get-action-status.payment.response.sample.json` — canonical settled payment action status response for `POST /actions/get`
- `http/get-action-status.resource.request.json` — canonical resource action status request for `POST /actions/get`
- `http/get-action-status.resource.response.sample.json` — canonical settled resource action status response for `POST /actions/get`
- `http/get-notification-delivery.request.json` — canonical notification delivery lookup request for `POST /notification-deliveries/get`
- `http/get-notification-delivery.response.sample.json` — canonical notification delivery record response for `POST /notification-deliveries/get`
- `http/list-notification-deliveries.request.json` — canonical notification delivery list request for `POST /notification-deliveries/list`
- `http/list-notification-deliveries.response.sample.json` — canonical notification delivery list response for `POST /notification-deliveries/list`
- `http/get-admin-audit-entry.request.json` — canonical notification admin audit lookup request for `POST /admin-audit/get`
- `http/get-admin-audit-entry.response.sample.json` — canonical notification admin audit record response for `POST /admin-audit/get`
- `http/list-admin-audit-entries.request.json` — canonical notification admin audit list request for `POST /admin-audit/list`
- `http/list-admin-audit-entries.response.sample.json` — canonical notification admin audit list response for `POST /admin-audit/list`
- `http/get-notification-worker-status.request.json` — canonical worker status request for `POST /notification-worker/get`
- `http/get-notification-worker-status.response.sample.json` — canonical worker status response for `POST /notification-worker/get`
- `http/start-notification-worker.request.json` — canonical worker start request for `POST /notification-worker/start`
- `http/start-notification-worker.response.sample.json` — canonical worker start response for `POST /notification-worker/start`
- `http/stop-notification-worker.request.json` — canonical worker stop request for `POST /notification-worker/stop`
- `http/stop-notification-worker.response.sample.json` — canonical worker stop response for `POST /notification-worker/stop`
- `http/get-approval-session.request.json` — canonical HTTP request body for `POST /approval-sessions/get`
- `http/get-approval-session.response.sample.json` — canonical session read response for `POST /approval-sessions/get`
- `http/apply-approval-result.request.json` — canonical HTTP request body for `POST /approval-sessions/apply-result`
- `http/apply-approval-result.response.sample.json` — canonical approval callback success response for `POST /approval-sessions/apply-result`
- `http/request-payment-approval.request.json` + `http/resume-approved-action.request.json` — together describe the async approval path that `npm run demo:http-async` exercises
- `http/execute-payment.request.json` — canonical HTTP request body for `POST /capabilities/execute-payment`
- `http/execute-payment.response.sample.json` — canonical success response body for `POST /capabilities/execute-payment`
- `http/execute-payment.bad-request.response.sample.json` — canonical transport validation failure for `POST /capabilities/execute-payment`
- `http/execute-payment.authorization-expired.response.sample.json` — canonical payment approval expiry failure
- `http/execute-payment.authorization-rejected.response.sample.json` — canonical payment rejection failure
- `http/resume-approved-action.request.json` — canonical HTTP request body for `POST /approval-sessions/resume-action`
- `http/resume-approved-action.response.sample.json` — canonical resumed-action success response for `POST /approval-sessions/resume-action`
- `http/redeliver-notification.request.json` — canonical notification redelivery request for `POST /notification-deliveries/redeliver`
- `http/redeliver-notification.response.sample.json` — canonical notification redelivery success response for `POST /notification-deliveries/redeliver`
- `http/run-notification-worker.request.json` — canonical worker-cycle trigger request for `POST /notification-worker/run`
- `http/run-notification-worker.response.sample.json` — canonical worker-cycle trigger response for `POST /notification-worker/run`
- `http/resume-approved-action.authorization-expired.response.sample.json` — canonical resume failure after expired approval
- `http/resume-approved-action.authorization-rejected.response.sample.json` — canonical resume failure after rejected approval
- `http/settle-resource-usage.request.json` — canonical HTTP request body for `POST /capabilities/settle-resource-usage`
- `http/settle-resource-usage.response.sample.json` — canonical success response body for `POST /capabilities/settle-resource-usage`
- `http/settle-resource-usage.provider-failure.response.sample.json` — canonical provider failure response for resource settlement
