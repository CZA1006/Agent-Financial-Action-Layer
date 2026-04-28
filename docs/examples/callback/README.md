# Callback Examples

This directory contains canonical outbound callback payloads that AFAL sends to receiver-side integrations after settlement completes.

Available examples:

- `payment-settled.notification.sample.json` — canonical payee-side settlement notification
- `resource-settled.notification.sample.json` — canonical provider-side settlement notification
- `ack.response.sample.json` — minimal receiver-side success response

Current callback transport also includes these headers:

- `x-afal-notification-id`
- `x-afal-idempotency-key`
- `x-afal-delivery-attempt`
- `x-afal-event-type`

These files are intended for:

- callback contract review
- receiver-side integration prototyping
- bilateral runtime-agent harness alignment
- idempotent redelivery handling against a stable callback payload

Related contract:

- [docs/specs/receiver-settlement-callback-contract.md](docs/specs/receiver-settlement-callback-contract.md#L1)
