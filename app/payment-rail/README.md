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

## Demo Limitations

This is a testnet bridge from AFAL to a human-confirmed wallet transaction. It is not yet a production payment rail:

- Server-side receipt verification is available when `PAYMENT_RAIL_VERIFY_ONCHAIN=true`, but it currently targets the Base Sepolia USDC demo shape and does not yet implement a configurable asset registry or finality threshold.
- MetaMask approval is human-in-the-loop. A fully autonomous agent wallet requires a separate custody or smart-account boundary.
- The seeded demo runtime uses `payint-0001`, so reset the SQLite demo data directory before recording repeated full-settlement runs.
