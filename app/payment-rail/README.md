# AFAL Payment Rail Stub

This service is the external payment rail boundary used by AFAL demos. By default it returns seeded mock settlements. It can also run in wallet-confirmed mode for the prompt-driven MetaMask/Base Sepolia agent payment demo.

In wallet-confirmed mode, the service has two jobs:

- serve `/wallet-demo`, a small browser page that asks MetaMask to send a Base Sepolia ERC-20 transfer
- expose `/wallet-payments/confirm`, which records the returned `txHash` so AFAL can later settle the matching payment intent through `/payments/execute`
- optionally verify the submitted `txHash` against an EVM JSON-RPC receipt before accepting it

## Wallet-Confirmed Demo Mode

Start the payment rail service:

```sh
PAYMENT_RAIL_TOKEN=payment-rail-secret \
PAYMENT_RAIL_SIGNING_KEY=payment-rail-signing-secret \
PAYMENT_RAIL_REQUIRE_WALLET_CONFIRMATION=true \
PAYMENT_RAIL_WALLET_CONFIRMATIONS_PATH=/tmp/afal-wallet-confirmations.json \
npm run serve:payment-rail -- 0.0.0.0 3412
```

Start AFAL with the external payment rail adapter enabled:

```sh
AFAL_PAYMENT_RAIL_BASE_URL=http://127.0.0.1:3412 \
AFAL_PAYMENT_RAIL_TOKEN=payment-rail-secret \
AFAL_PAYMENT_RAIL_SIGNING_KEY=payment-rail-signing-secret \
npm run serve:sqlite-http -- /tmp/afal-wallet-demo 0.0.0.0 3213
```

Open the wallet page:

```text
http://127.0.0.1:3412/wallet-demo
```

The page defaults to Base Sepolia USDC:

```text
chainId: 84532
token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

Use a testnet-funded MetaMask account only. The demo sends an ERC-20 transfer, registers the returned `txHash` with `/wallet-payments/confirm`, and then AFAL can settle the matching payment intent through `/payments/execute`.

Set `PAYMENT_RAIL_WALLET_CONFIRMATIONS_PATH` in staging. Without it, confirmations are in-memory and a payment rail restart can forget a wallet-confirmed transaction before AFAL resumes the action.

The page also accepts query parameters so a payer agent can hand the user a prefilled approval URL:

```text
http://127.0.0.1:3412/wallet-demo?actionRef=payint-0001&to=0x...&amount=0.01&tokenAddress=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

The staging demo uses this from:

```bash
npm run demo:metamask-agent-payment
```

That command shows the full path:

```text
user prompt -> payer agent -> AFAL approval/session/budget -> wallet rail -> trusted-surface resume -> AFAL settlement/receipt -> payee agent readback
```

## Optional Onchain Verification

For a stronger staging run, enable server-side receipt verification:

```sh
PAYMENT_RAIL_TOKEN=payment-rail-secret \
PAYMENT_RAIL_SIGNING_KEY=payment-rail-signing-secret \
PAYMENT_RAIL_REQUIRE_WALLET_CONFIRMATION=true \
PAYMENT_RAIL_WALLET_CONFIRMATIONS_PATH=/tmp/afal-wallet-confirmations.json \
PAYMENT_RAIL_VERIFY_ONCHAIN=true \
PAYMENT_RAIL_RPC_URL=https://<base-sepolia-rpc-provider> \
npm run serve:payment-rail -- 0.0.0.0 3412
```

When enabled, `/wallet-payments/confirm` rejects the confirmation unless the RPC receipt proves:

- chain ID equals the browser-declared chain ID
- transaction succeeded and is included in a block
- transaction hash matches the submitted `txHash`
- receipt contains an ERC-20 `Transfer` log for the submitted token contract
- indexed `from` and `to` addresses match the wallet confirmation
- transfer amount matches the submitted amount using USDC-style 6 decimal units
- the same `txHash` has not already been registered for a different AFAL action

`/payments/execute` also checks that the accepted wallet confirmation matches the AFAL intent's `actionRef`, asset, amount, chain, and settlement address before returning settlement evidence.

## Agent-Wallet Executor Mode

For autonomous-agent payment tests, the payment rail can call a configured signer/executor during `/payments/execute` instead of waiting for a browser wallet confirmation:

```sh
PAYMENT_RAIL_TOKEN=payment-rail-secret \
PAYMENT_RAIL_SIGNING_KEY=payment-rail-signing-secret \
PAYMENT_RAIL_REQUIRE_WALLET_CONFIRMATION=true \
PAYMENT_RAIL_WALLET_CONFIRMATIONS_PATH=/tmp/afal-wallet-confirmations.json \
PAYMENT_RAIL_AGENT_WALLET_COMMAND=/path/to/agent-wallet-signer \
PAYMENT_RAIL_AGENT_WALLET_COMMAND_TIMEOUT_MS=120000 \
PAYMENT_RAIL_VERIFY_ONCHAIN=true \
PAYMENT_RAIL_RPC_URL=https://<base-sepolia-rpc-provider> \
npm run serve:payment-rail -- 0.0.0.0 3412
```

This repo includes a constrained Base Sepolia USDC signer command for testnet-only runs:

```sh
AGENT_WALLET_PRIVATE_KEY=<base-sepolia-testnet-private-key> \
AGENT_WALLET_RPC_URL=https://sepolia.base.org \
AGENT_WALLET_MAX_USDC_AMOUNT=0.01 \
AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES=0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 \
npm --silent run signer:base-sepolia-usdc
```

When used from the payment rail service, set:

```sh
PAYMENT_RAIL_AGENT_WALLET_COMMAND="npm --silent run signer:base-sepolia-usdc"
```

The signer is deliberately narrow: it only accepts an approved AFAL decision, `USDC`, `base-sepolia`, a positive amount not exceeding `AGENT_WALLET_MAX_USDC_AMOUNT`, and an optional allowlisted payee address.

The command receives this JSON on stdin:

```json
{
  "intent": { "...": "AFAL payment intent" },
  "decision": { "...": "approved AFAL authorization decision" }
}
```

It must print a wallet payment execution JSON object on stdout:

```json
{
  "actionRef": "payint-0001",
  "txHash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "tokenAddress": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "amount": "0.01",
  "asset": "USDC",
  "chain": "base-sepolia",
  "chainId": 84532
}
```

The rail then applies the same AFAL intent matching, duplicate txHash protection, optional onchain verification, wallet-confirmation persistence, settlement, and receipt path used by the MetaMask demo. This is the boundary where a testnet private-key signer, smart-account session key, MPC wallet, or custody provider should be integrated.

## Demo Limitations

This is a testnet bridge from AFAL to a human-confirmed wallet transaction. It is not yet a production payment rail:

- Server-side receipt verification is available when `PAYMENT_RAIL_VERIFY_ONCHAIN=true`, but it currently targets the Base Sepolia USDC demo shape and does not yet implement a configurable asset registry or finality threshold.
- Wallet confirmations persist across restarts only when `PAYMENT_RAIL_WALLET_CONFIRMATIONS_PATH` is configured.
- MetaMask approval is human-in-the-loop. Autonomous operation should use agent-wallet executor mode with a constrained testnet signer first, then a smart-account/session-key or custody boundary for production.
- The seeded demo runtime uses `payint-0001`, so reset the SQLite demo data directory before recording repeated full-settlement runs.
