# AFAL Payment MCP

`@afal/payment-mcp` is the standalone preview package for exposing AFAL payment controls to Claude Code and other MCP-capable agent runtimes.

It is intentionally smaller than the repo-root preview tarball. It does not import monorepo harnesses, TypeScript sources, or `tsx`. The server calls the AFAL HTTP contract directly.

## Tools

- `afal_pay_and_gate`: request AFAL payment approval, approve/resume the action, execute through the configured payment rail, then run provider gate.
- `afal_request_payment`: create an AFAL-governed payment action and return the approval session.
- `afal_approve_resume`: approve and resume an AFAL approval session.
- `afal_provider_gate`: verify AFAL settlement and receipt evidence before service delivery.

## Environment

```bash
AFAL_BASE_URL=http://34.44.95.42:3213
AFAL_CLIENT_ID=client-metamask-demo-001
AFAL_SIGNING_KEY=<provisioned external-client signing key>
AFAL_WALLET_DEMO_URL=http://34.44.95.42:3412/wallet-demo
AFAL_PAYMENT_MODE=agent-wallet
```

Do not pass wallet private keys to this MCP server. Agent-wallet private keys belong behind the AFAL payment rail service.

## Claude Code

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

Prompt:

```text
Pay 0.01 USDC to the fraud detection payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94, then only deliver the service if AFAL provider gate passes.
```

Expected terminal result from Claude:

```text
status: settled
providerGate: passed
deliverService: true
txHash: 0x...
```

## Boundary

This package is still a testnet preview. AFAL remains the policy, mandate, budget, approval, settlement, and receipt layer. The payment rail remains responsible for wallet execution and signer guardrails.
