# Samples

This directory contains the first external-agent pilot kit samples.

## External Agent Client

- [payment-client.ts](./external-agent-client/payment-client.ts)
- [resource-client.ts](./external-agent-client/resource-client.ts)

These scripts show the minimum signed-request path into AFAL's public API.

Required environment:

- `AFAL_BASE_URL`
- `AFAL_CLIENT_ID`
- `AFAL_SIGNING_KEY`

Optional sandbox references:

- `AFAL_MONETARY_BUDGET_REF`
- `AFAL_RESOURCE_BUDGET_REF`
- `AFAL_RESOURCE_QUOTA_REF`

Example:

```bash
AFAL_BASE_URL=http://127.0.0.1:3213 \
AFAL_CLIENT_ID=client-demo-001 \
AFAL_SIGNING_KEY=... \
node --import tsx/esm samples/external-agent-client/payment-client.ts
```

## Callback Receiver

- [server.ts](./callback-receiver/server.ts)

This sample listens on `POST /callbacks/action-settled` and records callback payloads plus AFAL delivery headers.

Optional environment:

- `CALLBACK_RECEIVER_HOST`
- `CALLBACK_RECEIVER_PORT`
- `CALLBACK_RECEIVER_ARTIFACTS_DIR`

Example:

```bash
CALLBACK_RECEIVER_ARTIFACTS_DIR=./.afal-callback-sample \
node --import tsx/esm samples/callback-receiver/server.ts
```
