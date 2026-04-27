# MetaMask Payment Demo Plan

This demo connects AFAL to a real wallet-confirmed token transfer without using mainnet funds. The intended first rail is Base Sepolia USDC through MetaMask.

## Current Demo Boundary

The demo proves:

- An external agent can create a payment intent through AFAL.
- AFAL can hold the action at trusted-surface approval.
- A payer can send a real ERC-20 transfer from MetaMask on Base Sepolia.
- The payment rail can register the wallet `txHash` for the AFAL action.
- When the trusted-surface approval resumes the action, AFAL can settle against the externally confirmed `txHash`.

The demo does not yet prove production-grade custody or settlement verification. The current payment rail records a browser-submitted `txHash`; a production rail must verify chain, token, sender, recipient, amount, and finality from an RPC provider before returning settlement.

## Prerequisites

- MetaMask installed.
- Base Sepolia selected or addable in MetaMask.
- Base Sepolia ETH for gas.
- Base Sepolia USDC test tokens.
- A payee EVM address, for example a second MetaMask account.

Default Base Sepolia values:

```text
chainId: 84532
chainId hex: 0x14a34
USDC token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## Local Runtime

Start the wallet-confirmed payment rail:

```sh
PAYMENT_RAIL_TOKEN=payment-rail-secret \
PAYMENT_RAIL_SIGNING_KEY=payment-rail-signing-secret \
PAYMENT_RAIL_REQUIRE_WALLET_CONFIRMATION=true \
npm run serve:payment-rail -- 0.0.0.0 3412
```

Start AFAL with the external payment rail adapter:

```sh
AFAL_PAYMENT_RAIL_BASE_URL=http://127.0.0.1:3412 \
AFAL_PAYMENT_RAIL_TOKEN=payment-rail-secret \
AFAL_PAYMENT_RAIL_SIGNING_KEY=payment-rail-signing-secret \
npm run serve:sqlite-http -- /tmp/afal-metamask-demo 0.0.0.0 3213
```

Open the wallet confirmation page:

```text
http://127.0.0.1:3412/wallet-demo
```

## Demo Flow

1. Submit the external-agent payment request to AFAL and capture the returned `actionRef`.
2. Open `/wallet-demo`, enter the same `actionRef`, the payee EVM address, and a small testnet USDC amount.
3. Connect MetaMask and submit the Base Sepolia USDC transfer.
4. The wallet page registers the returned `txHash` with `/wallet-payments/confirm`.
5. Approve the AFAL challenge through the trusted-surface path.
6. AFAL resumes the action and calls the external payment rail.
7. The rail returns a settlement record using the registered wallet `txHash`.
8. AFAL finalizes the payment receipt and downstream settlement callback flow.

## Mainnet Readiness Gap

Do not use this page for mainnet funds yet. Before a mainnet demo, add:

- Server-side RPC verification of the ERC-20 transfer.
- Address allowlisting for payer and payee.
- Small hard caps enforced by AFAL policy and rail verification.
- Chain finality handling and replay protection for reused `txHash` values.
- A dedicated demo wallet with limited funds, not a personal MetaMask wallet.
