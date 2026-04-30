# Claude Code AFAL Payment Agent Demo

This sample is the Claude Code entrypoint for the Phase 2 autonomous payment demo.

Goal: give Claude Code a natural-language payment prompt and force the payment path through AFAL before any paid service is delivered.

## What This Proves

The end-to-end flow is:

```text
user prompt
-> Claude Code follows CLAUDE.md
-> npm run tool:afal-agent -- pay-and-gate --payment-mode agent-wallet
-> AFAL requestPaymentApproval
-> AFAL trusted-surface approve/resume
-> payment rail invokes the VM agent wallet signer
-> Base Sepolia USDC transfer is broadcast and verified
-> AFAL records settlement and final payment receipt
-> provider gate validates AFAL receipt evidence
-> deliverService=true
```

Claude Code does not send funds directly. It delegates payment control to AFAL.

## Prerequisites

- VM is running `afal-staging` on port `3213`.
- VM is running `afal-payment-rail` on port `3412`.
- `afal-payment-rail` has `PAYMENT_RAIL_AGENT_WALLET_COMMAND` configured.
- Agent wallet has enough Base Sepolia ETH for gas and enough Base Sepolia USDC.
- AFAL sandbox has been provisioned and `/tmp/afal-metamask-demo-client.json` contains the current `auth.signingKey`.

## Configure Local Environment

From the repo root:

```bash
cp samples/claude-code-agent/.env.example samples/claude-code-agent/.env
```

Edit `samples/claude-code-agent/.env` and set:

```bash
AFAL_SIGNING_KEY=<current auth.signingKey from VM provision output>
```

Then load it in the terminal that will launch Claude Code:

```bash
set -a
source samples/claude-code-agent/.env
set +a
```

## Run With Claude Code

Open Claude Code from the repo root so it can see this sample and the root `package.json` scripts.

Use this prompt:

```text
Using samples/claude-code-agent/CLAUDE.md, pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service. Only deliver the service if AFAL provider gate returns deliverService=true.
```

Claude Code should run:

```bash
AFAL_BASE_URL="${AFAL_BASE_URL}" \
AFAL_CLIENT_ID="${AFAL_CLIENT_ID}" \
AFAL_SIGNING_KEY="${AFAL_SIGNING_KEY}" \
npm run tool:afal-agent -- pay-and-gate \
  --payment-mode agent-wallet \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url "${AFAL_WALLET_DEMO_URL}"
```

Expected terminal result includes:

```json
{
  "result": {
    "status": "settled",
    "providerGate": {
      "deliverService": true
    },
    "deliverService": true
  }
}
```

## Direct Smoke Test Without Claude Code

Run the same command manually:

```bash
AFAL_BASE_URL="${AFAL_BASE_URL}" \
AFAL_CLIENT_ID="${AFAL_CLIENT_ID}" \
AFAL_SIGNING_KEY="${AFAL_SIGNING_KEY}" \
npm run tool:afal-agent -- pay-and-gate \
  --payment-mode agent-wallet \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url "${AFAL_WALLET_DEMO_URL}"
```

## Reset Between Runs

Because the sandbox uses deterministic refs such as `payint-0001`, reset both AFAL SQLite state and payment rail confirmation state before a clean demo.

On the VM:

```bash
cd /opt/afal

sudo systemctl stop afal-payment-rail
sudo rm -f /srv/afal/metamask-demo-001/payment-rail/wallet-confirmations.json
sudo systemctl start afal-payment-rail

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

cat /tmp/afal-metamask-demo-client.json
```

Copy the new `auth.signingKey` into the local `.env`.

## Failure Handling

If payment fails:

- Do not deliver the paid service.
- Check `journalctl -u afal-payment-rail -n 120 --no-pager` on the VM.
- Confirm the agent wallet has Base Sepolia ETH and USDC.
- Confirm `AGENT_WALLET_MAX_USDC_AMOUNT` allows the requested amount.
- Confirm `AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES` includes the payee.
- Re-provision and retry with a fresh `AFAL_SIGNING_KEY`.
