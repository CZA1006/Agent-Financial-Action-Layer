# AFAL MCP Payment Server

This sample exposes AFAL payment control as Model Context Protocol tools for Claude Code or any MCP-capable agent runtime.

It is the portable version of the Claude Code payment demo: the model should call a registered tool, not read local instructions and manually assemble shell commands.

## Tools

- `afal_pay_and_gate`: complete payment flow. Requests AFAL payment approval, resumes the approved action through the payment rail, and runs provider gate. This is the default tool for payment prompts.
- `afal_request_payment`: payer-side intent creation only.
- `afal_approve_resume`: trusted-surface approval/resume.
- `afal_provider_gate`: payee/provider receipt validation.

## Environment

Set these in the MCP server process environment:

```bash
AFAL_BASE_URL=http://34.44.95.42:3213
AFAL_CLIENT_ID=client-metamask-demo-001
AFAL_SIGNING_KEY=<from /tmp/afal-metamask-demo-client.json auth.signingKey>
AFAL_WALLET_DEMO_URL=http://34.44.95.42:3412/wallet-demo
AFAL_PAYMENT_MODE=agent-wallet
```

Do not pass wallet private keys to the MCP server. The autonomous wallet key belongs behind `afal-payment-rail` on the VM and is guarded by the payment rail signer policy.

## Run

From the repo root:

```bash
npm run mcp:afal-payment
```

Package/binary entrypoint:

```bash
afal-payment-mcp
```

Claude Code MCP config shape:

```json
{
  "mcpServers": {
    "afal-payment": {
      "command": "npm",
      "args": ["run", "mcp:afal-payment"],
      "env": {
        "AFAL_BASE_URL": "http://34.44.95.42:3213",
        "AFAL_CLIENT_ID": "client-metamask-demo-001",
        "AFAL_SIGNING_KEY": "<current signing key>",
        "AFAL_WALLET_DEMO_URL": "http://34.44.95.42:3412/wallet-demo",
        "AFAL_PAYMENT_MODE": "agent-wallet"
      }
    }
  }
}
```

After registration, a user prompt can be minimal:

```text
Pay 0.01 USDC to the fraud detection payee agent, then only deliver the service if AFAL provider gate passes.
```

The agent should call `afal_pay_and_gate`. The paid service is deliverable only when the tool result contains `deliverService: true`.

Latest Claude Code MCP acceptance, captured on 2026-05-01:

```text
prompt: Pay 0.01 USDC to the fraud detection payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94, then only deliver the service if AFAL provider gate passes.
tool: afal_pay_and_gate
status: settled
providerGate: passed
deliverService: true
txHash: 0x9e848b428fe6476bcacbb0ce1c2edd0aa36bf6e390b55db210a70b95ef8dde79
```

Release/testing details:

- [AFAL Payment MCP Preview Release Quickstart](../../docs/product/afal-payment-mcp-release-quickstart.md)

## Boundary

MCP makes AFAL discoverable to the agent. It is not the security boundary by itself.

The hard boundary remains:

- AFAL policy, mandate, budget, approval, settlement, and receipt state.
- Payment rail signer controls: max amount, asset, chain, payee allowlist.
- Provider-side receipt gate requiring AFAL settlement evidence before service delivery.
