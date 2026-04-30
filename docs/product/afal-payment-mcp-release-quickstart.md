# AFAL Payment MCP Preview Release Quickstart

## Purpose

This document defines the first public-preview path for testing AFAL as an agent payment MCP server.

The current package is still a sandbox preview. It is intended for Claude Code / MCP-capable agent testing against a provisioned AFAL staging sandbox. It is not production payment infrastructure and must not be used with mainnet funds.

## What The Preview Proves

An MCP-capable agent can receive a plain payment prompt, discover the AFAL MCP tool, and complete:

```text
agent prompt
-> MCP tool afal_pay_and_gate
-> AFAL policy / mandate / budget / approval
-> payment rail agent-wallet signer
-> Base Sepolia USDC settlement
-> AFAL final receipt
-> provider gate
-> deliverService=true
```

Latest Claude Code MCP acceptance, captured on 2026-05-01:

```text
prompt: Pay 0.01 USDC to the fraud detection payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94, then only deliver the service if AFAL provider gate passes.
MCP server: afal-payment
MCP tool: afal_pay_and_gate
result: settled
providerGate: passed
deliverService: true
txHash: 0x9e848b428fe6476bcacbb0ce1c2edd0aa36bf6e390b55db210a70b95ef8dde79
```

## Package Shape

The repo now exposes a package binary:

```text
afal-payment-mcp
```

The binary starts the stdio MCP server implemented in:

```text
samples/afal-mcp-server/server.ts
```

Current local command:

```bash
npm run mcp:afal-payment
```

Package/binary command:

```bash
afal-payment-mcp
```

Preview install from a GitHub Release tarball:

```bash
npm install -g ./agent-financial-action-layer-0.1.0.tgz
which afal-payment-mcp
afal-payment-mcp
```

The current preview package intentionally ships the MCP server plus the minimal SDK/runtime files it imports. A later package should split this into a smaller dedicated `@afal/payment-mcp` package.

## Required Environment

The MCP server process needs:

```bash
AFAL_BASE_URL=http://34.44.95.42:3213
AFAL_CLIENT_ID=client-metamask-demo-001
AFAL_SIGNING_KEY=<provisioned external-client signing key>
AFAL_WALLET_DEMO_URL=http://34.44.95.42:3412/wallet-demo
AFAL_PAYMENT_MODE=agent-wallet
```

Do not pass the agent wallet private key to Claude Code or the MCP server. The autonomous wallet key belongs behind `afal-payment-rail` on the VM.

## Claude Code Local Config

Repo-local development config:

```bash
claude mcp add-json afal-payment '{
  "type": "stdio",
  "command": "npm",
  "args": [
    "--prefix",
    "/path/to/agent-financial-action-layer",
    "run",
    "mcp:afal-payment"
  ],
  "env": {
    "AFAL_BASE_URL": "http://34.44.95.42:3213",
    "AFAL_CLIENT_ID": "client-metamask-demo-001",
    "AFAL_SIGNING_KEY": "<current signing key>",
    "AFAL_WALLET_DEMO_URL": "http://34.44.95.42:3412/wallet-demo",
    "AFAL_PAYMENT_MODE": "agent-wallet"
  }
}'
```

Package/binary config after installing a release build:

```bash
claude mcp add-json afal-payment '{
  "type": "stdio",
  "command": "afal-payment-mcp",
  "args": [],
  "env": {
    "AFAL_BASE_URL": "http://34.44.95.42:3213",
    "AFAL_CLIENT_ID": "client-metamask-demo-001",
    "AFAL_SIGNING_KEY": "<current signing key>",
    "AFAL_WALLET_DEMO_URL": "http://34.44.95.42:3412/wallet-demo",
    "AFAL_PAYMENT_MODE": "agent-wallet"
  }
}'
```

Verify:

```bash
claude mcp list
claude mcp get afal-payment
```

Inside Claude Code:

```text
/mcp
```

Expected server status:

```text
afal-payment connected
```

## Test Prompt

```text
Pay 0.01 USDC to the fraud detection payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94, then only deliver the service if AFAL provider gate passes.
```

Expected result:

```text
status: settled
providerGate: passed
deliverService: true
txHash: 0x...
```

## Release Guidance

For a GitHub preview release:

1. Reset and provision staging.
2. Run the Claude Code MCP acceptance prompt.
3. Capture txHash, `deliverService=true`, and provider-gate summary.
4. Run:

```bash
npm run typecheck
npm run test:mock
npm_config_cache=/tmp/afal-npm-cache npm pack
```

5. Attach the generated package tarball to a GitHub prerelease.
6. Include this quickstart and the staging setup instructions in the release notes.

Security rule: public release notes and assets must never contain live `AFAL_SIGNING_KEY` values or agent wallet private keys.

## Production Gaps

Before calling this production-ready, AFAL still needs:

- stable HTTPS staging endpoint
- non-deterministic action refs for repeated demos
- production database backend
- production custody / MPC / smart-account strategy
- production asset registry and finality policy
- provider/x402 middleware that requires AFAL receipt before service delivery
