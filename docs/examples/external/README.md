# External Service Examples

This directory contains canonical examples for the current AFAL-to-external-service contract.

These are not AFAL HTTP API requests.

They describe the outbound service-to-service calls that AFAL currently makes to:

- the payment rail stub
- the provider usage / settlement stub

Available examples:

- `payment-rail.execute-payment.request.sample.json` — canonical authenticated payment rail request with signed metadata placeholder
- `provider-service.confirm-usage.request.sample.json` — canonical authenticated provider usage request with signed metadata placeholder

These examples are intended for:

- contract review of the current external adapter boundary
- validating header names and signature placeholder fields
- documenting the current local-development service auth model
