# Samples

This directory contains the first external-agent pilot kit samples.

For a Claude Code payment-agent workspace that forces all payment prompts through AFAL before service delivery, use:

- [claude-code-agent/README.md](./claude-code-agent/README.md)
- [claude-code-agent/CLAUDE.md](./claude-code-agent/CLAUDE.md)

For a portable Claude Code / MCP integration where the agent discovers AFAL as tools, use:

- [afal-mcp-server/README.md](./afal-mcp-server/README.md)

For a repo-external / extractable consumer kit, use:

- [standalone-external-agent-pilot/README.md](./standalone-external-agent-pilot/README.md)
- [external-engineer-pilot-handoff.md](../docs/product/external-engineer-pilot-handoff.md)

To export that pilot as a repo-external skeleton:

```bash
npm run export:external-agent-pilot
```

Default output:

- `dist/standalone-external-agent-pilot-skeleton/`

To validate the exported skeleton structure from inside the monorepo:

```bash
npm run validate:external-agent-pilot-export
```

To turn a provisioning bundle into external-repo `.env` text:

```bash
npm run render:external-agent-bundle-env -- \
  --input /tmp/afal-external-bundle.json \
  --output /tmp/afal-external-agent.env
```

## External Agent Client

- [payment-client.ts](./external-agent-client/payment-client.ts)
- [resource-client.ts](./external-agent-client/resource-client.ts)

These scripts show the minimum signed-request path into AFAL's public API.

They are intended to be used alongside the sandbox callback registration routes:

- `POST /integrations/callbacks/register`
- `POST /integrations/callbacks/get`
- `POST /integrations/callbacks/list`

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
