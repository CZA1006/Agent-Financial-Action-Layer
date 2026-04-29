# MetaMask Agent Payment Demo

This demo connects AFAL to a real wallet-confirmed token transfer without using mainnet funds. The intended first rail is Base Sepolia USDC through MetaMask.

The demo is framed as an agent-payment flow: a user sends a payment instruction to a payer agent, the payer agent asks AFAL to authorize and reserve the action, a trusted-surface approval resumes the action, a wallet-backed payment rail supplies the onchain `txHash`, and a payee-side agent reads AFAL to confirm that it was paid.

Current validated staging result:

- payer agent accepted a natural-language payment prompt
- AFAL created `payint-0001`, reserved `0.01 USDC`, and returned `aps-chall-0001`
- MetaMask sent a real Base Sepolia USDC transfer to the payee address
- AFAL resumed the approved action and marked the intent `settled`
- AFAL issued settlement `stl-wallet-payint-0001` and receipt `rcpt-pay-0001`
- payee agent read AFAL and verified the settled intent, settlement record, receipt, amount, chain, address, and `txHash`
- payment rail verified the wallet `txHash` through Base Sepolia JSON-RPC on staging

Latest verified staging transaction:

```text
0x16d906dd16a67ef91abb384bc68b1ee3a6ec4f8166ead96cc1c4cdfeb73b55fd
```

## Current Demo Boundary

The demo proves:

- An external agent can create a payment intent through AFAL.
- AFAL can hold the action at trusted-surface approval.
- A payer can send a real ERC-20 transfer from MetaMask on Base Sepolia.
- The payment rail can register the wallet `txHash` for the AFAL action.
- The payment rail can reject a submitted `txHash` unless an RPC receipt contains the expected ERC-20 `Transfer` log.
- When the trusted-surface approval resumes the action, AFAL can settle against the externally confirmed `txHash`.

The demo still does not prove production-grade custody. MetaMask remains the signing surface. The staging payment rail now verifies chain, token, sender, recipient, amount, transaction success, and replay protection through `PAYMENT_RAIL_VERIFY_ONCHAIN=true`. Production still needs configurable asset/rail policy, finality thresholds, production RPC reliability, key/custody design, and stronger operator controls.

The important product point is that AFAL is not "the user manually paid in a browser." AFAL is the layer that constrains, authorizes, records, and exposes the agent payment action. MetaMask is only the current safe signing surface for the testnet rail.

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

For server-side Base Sepolia receipt verification, add:

```sh
PAYMENT_RAIL_VERIFY_ONCHAIN=true \
PAYMENT_RAIL_RPC_URL=https://<base-sepolia-rpc-provider>
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

For a clean staging run, reset the demo DB on the VM and provision a fresh external client before the presentation:

```sh
cd /opt/afal
git pull origin main
npm ci
sudo systemctl daemon-reload
sudo systemctl stop afal-staging
rm -rf /srv/afal/metamask-demo-001/sqlite-data
mkdir -p /srv/afal/metamask-demo-001/sqlite-data

npm run provision:external-agent-sandbox -- \
  --data-dir /srv/afal/metamask-demo-001/sqlite-data \
  --client-id client-metamask-demo-001 \
  --tenant-id tenant-metamask-demo-001 \
  --agent-id agent-metamask-demo-001 \
  --subject-did did:afal:agent:payment-agent-01 \
  --mandate-refs mnd-0001,mnd-0002 \
  --monetary-budget-refs budg-money-001 \
  --resource-budget-refs budg-res-001 \
  --resource-quota-refs quota-001 \
  --payment-payee-did did:afal:agent:fraud-service-01 \
  --resource-provider-did did:afal:institution:provider-openai \
  --afal-base-url http://34.44.95.42:3213 \
  --output /tmp/afal-metamask-demo-client.json

sudo systemctl start afal-staging
sudo systemctl restart afal-payment-rail
cat /tmp/afal-metamask-demo-client.json
```

Use the generated `auth.signingKey` as `AFAL_SIGNING_KEY` in the local demo command.

If you want this staging run to reject spoofed wallet confirmations, configure `afal-payment-rail.service` with:

```ini
Environment=PAYMENT_RAIL_VERIFY_ONCHAIN=true
Environment=PAYMENT_RAIL_RPC_URL=https://<base-sepolia-rpc-provider>
```

Then run `sudo systemctl daemon-reload && sudo systemctl restart afal-payment-rail`.

The prompt-driven demo command is:

```sh
AFAL_BASE_URL=http://34.44.95.42:3213 \
AFAL_CLIENT_ID=client-metamask-demo-001 \
AFAL_SIGNING_KEY=<provisioned-signing-key> \
npm run demo:metamask-agent-payment -- \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url http://34.44.95.42:3412/wallet-demo \
  --transcript
```

Use `--transcript` for presentation-friendly output. Omit it, or pass `--json`, when you need the full raw AFAL objects for debugging.

The command prints a timeline with these actors:

- `user`: sends a natural-language payment instruction to the payer agent.
- `payer-agent`: parses amount, payee address, asset, and chain, then signs an external-client AFAL request.
- `afal`: creates the payment intent, checks identity/mandate/policy/budget, reserves budget, and returns an approval session.
- `payment-rail`: gives the user a prefilled MetaMask URL for Base Sepolia USDC.
- `payment-rail`: after the wallet page posts the `txHash`, exposes a readback record at `/wallet-payments/confirmations/:actionRef` so the CLI can show `verification.ok`, `chainId`, `logIndex`, and the verified `txHash`.
- `trusted-surface`: approves the challenge and resumes the AFAL action after wallet confirmation.
- `payee-agent`: reads AFAL action status and confirms settlement/receipt.

Current mock-runtime caveat: the seeded payment runtime accepts only `payint-0001`, so a full settled demo is one-shot per clean SQLite data directory. Reset the demo DB before recording or repeating the presentation.

The expected transcript summary after a successful run includes:

```text
Demo Summary
actionRef: payint-0001
approvalSessionRef: aps-chall-0001
finalIntentStatus: settled
settlementRef: stl-wallet-payint-0001
receiptRef: rcpt-pay-0001
onchainVerification: ok
verifiedChainId: 84532
verifiedLogIndex: 0
txHash: 0x...
```

Detailed steps:

1. Run `demo:metamask-agent-payment` with a prompt-style `--message`.
2. The payer agent submits the signed external-client payment request to AFAL and prints `actionRef` plus `approvalSessionRef`.
3. Open the prefilled wallet URL printed by the command.
4. Connect MetaMask and submit the Base Sepolia USDC transfer.
5. The wallet page registers the returned `txHash` with `/wallet-payments/confirm`.
6. If onchain verification is enabled, the payment rail checks the RPC receipt before accepting the confirmation.
7. Return to the terminal and press Enter.
8. The CLI reads `/wallet-payments/confirmations/:actionRef` and prints the payment rail's wallet confirmation plus onchain verification evidence.
9. The trusted-surface approval agent approves and resumes the AFAL action.
10. AFAL calls the payment rail, receives the wallet-backed settlement, finalizes the receipt, and releases the reservation.
11. The payee-side agent reads `/actions/get` through AFAL and prints the final `settlementRef`, `receiptRef`, amount, chain, payee address, and `txHash`.

For a two-step manual demo, disable automatic approval:

```sh
npm run demo:metamask-agent-payment -- \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --no-auto-approve
```

Then approve separately with:

```sh
node --import tsx/esm agents/test-harness/approval-agent.ts \
  --base-url http://34.44.95.42:3213 \
  --approval-session-ref <approvalSessionRef>
```

## Demo Interpretation

This is still not "the LLM holds a private key." The payer agent is responsible for interpreting the user's payment instruction and asking AFAL for a governed payment action. AFAL is the AI infra layer that provides:

- Identity and external-client authentication for the agent.
- Mandate and policy checks before money moves.
- Budget reservation before approval.
- Trusted-surface checkpoint for human review.
- Payment rail boundary for wallet/onchain execution.
- Settlement and receipt records that the payee agent can verify.

In the current testnet demo, MetaMask is the signing surface for the actual ERC-20 transfer. That is intentional for safety. A production agent-wallet integration would replace the browser confirmation page with a custodial/MPC/session-key wallet adapter, but AFAL's role remains the same: authorize, constrain, audit, settle, and receipt agent-initiated financial actions.

The payee side is also part of the demo. The payee agent does not trust a screenshot or chat message from the payer. It calls AFAL to read the action state and confirms:

- `intent.status` is `settled`
- the settlement record has the expected payee DID, settlement address, asset, amount, chain, and `txHash`
- the payment receipt is final and references the same settlement
- the budget reservation has been released and consumed amount updated

## Mainnet Readiness Gap

Do not use this page for mainnet funds yet. Before a mainnet demo, add:

- Address allowlisting for payer and payee.
- Small hard caps enforced by AFAL policy and rail verification.
- Chain finality handling beyond a single successful receipt.
- Configurable token/asset registry instead of hardcoding the Base Sepolia USDC demo assumptions.
- A dedicated demo wallet with limited funds, not a personal MetaMask wallet.
