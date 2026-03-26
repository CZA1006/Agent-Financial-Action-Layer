# Examples

This folder contains canonical AFAL examples derived from the Phase 1 schema set.

These documents are intended to bridge:

- whitepaper direction
- schema definitions
- backend orchestration
- SDK fixtures
- future demo scenarios

Phase 1 priority:

- `mvp-agent-payment-flow.md` — canonical agent-to-agent API/tool payment flow in USDC on Base
- `mvp-resource-settlement-flow.md` — canonical resource purchase and provider settlement flow in USDC on Base
- `http/request-payment-approval.request.json` — canonical HTTP request body for `POST /capabilities/request-payment-approval`
- `http/request-payment-approval.response.sample.json` — canonical pending-approval success response for `POST /capabilities/request-payment-approval`
- `http/request-payment-approval.request.json` + `http/resume-approved-action.request.json` — together describe the async approval path that `npm run demo:http-async` exercises
- `http/execute-payment.request.json` — canonical HTTP request body for `POST /capabilities/execute-payment`
- `http/execute-payment.response.sample.json` — canonical success response body for `POST /capabilities/execute-payment`
- `http/execute-payment.bad-request.response.sample.json` — canonical transport validation failure for `POST /capabilities/execute-payment`
- `http/execute-payment.authorization-expired.response.sample.json` — canonical payment approval expiry failure
- `http/execute-payment.authorization-rejected.response.sample.json` — canonical payment rejection failure
- `http/resume-approved-action.request.json` — canonical HTTP request body for `POST /approval-sessions/resume-action`
- `http/resume-approved-action.response.sample.json` — canonical resumed-action success response for `POST /approval-sessions/resume-action`
- `http/resume-approved-action.authorization-expired.response.sample.json` — canonical resume failure after expired approval
- `http/resume-approved-action.authorization-rejected.response.sample.json` — canonical resume failure after rejected approval
- `http/settle-resource-usage.request.json` — canonical HTTP request body for `POST /capabilities/settle-resource-usage`
- `http/settle-resource-usage.response.sample.json` — canonical success response body for `POST /capabilities/settle-resource-usage`
- `http/settle-resource-usage.provider-failure.response.sample.json` — canonical provider failure response for resource settlement
