# AFAL Payment Rail Stub

This service is the external payment rail boundary used by AFAL demos. By default it returns seeded mock settlements. It can also run in wallet-confirmed mode for a MetaMask/Base Sepolia demo.

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

## Demo Limitations

This is a testnet bridge from AFAL to a human-confirmed wallet transaction. It is not yet a production payment rail:

- No on-chain receipt verification is performed yet.
- The browser registers the `txHash`; production must verify sender, recipient, token, amount, chain, and finality server-side.
- MetaMask approval is human-in-the-loop. A fully autonomous agent wallet requires a separate custody or smart-account boundary.
