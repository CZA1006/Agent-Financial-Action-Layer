# SDK

## Purpose

The `sdk/` folder contains shared AFAL types, client-facing interfaces, and future SDK utilities.

In Phase 1, this folder is **not** intended to become a full-featured developer SDK yet.  
Its primary role is to establish a stable, schema-aligned object model across AIP, AMN, ATS, and AFAL.

---

## Current Role

The first priority of `sdk/` was to provide:

- shared type definitions
- schema-aligned interfaces
- reusable request / response objects
- stable object naming across modules

Phase 2 has started the first lightweight client boundary:

- `sdk/client/createAfalClient` signs external-client AFAL HTTP requests.
- `sdk/client/createAfalClient().requestPaymentApproval` starts a governed payment.
- `sdk/client/createAfalClient().requestResourceApproval` starts a governed resource action.
- `sdk/client/createAfalClient().getActionStatus` reads payer/payee-verifiable AFAL state.
- `sdk/client/createAfalClient().waitForPaymentReceipt` polls until AFAL has a final payment receipt.
- `sdk/client/agent-payment` provides prompt-style payment helpers for simple agent examples.

This is intentionally small. It is the integration boundary for Claude Code/OpenRouter samples, not a production package yet.

---

## What Belongs Here

Examples of code or artifacts that belong in `sdk/`:

- DID / identity types
- credential types
- mandate types
- payment intent types
- resource intent types
- trade intent types
- receipt and decision object types
- typed flow fixtures
- lightweight client wrappers (later)
- serialization helpers (later)

Suggested subfolders:
- `sdk/aip/`
- `sdk/amn/`
- `sdk/ats/`
- `sdk/afal/`
- `sdk/types/`
- `sdk/fixtures/`

---

## What Does Not Belong Here Yet

The following should **not** be the focus of `sdk/` in Phase 1:

- production-ready language bindings
- multi-language SDK generation
- wallet integrations
- full API client implementations
- broad helper utility sprawl

---

## Working Principle

**Types first, wrappers later.**

The SDK layer should follow the schemas in:
- `docs/specs/`
- `docs/architecture/`

It should not invent new object models independently.

---

## Minimal Agent Tool Shape

The current Phase 2 sample is:

```bash
AFAL_BASE_URL=http://34.44.95.42:3213 \
AFAL_CLIENT_ID=client-metamask-demo-001 \
AFAL_SIGNING_KEY=<provisioned-signing-key> \
npm run tool:afal-payment -- \
  --message "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service" \
  --wallet-demo-url http://34.44.95.42:3412/wallet-demo
```

The command returns a JSON object with `actionRef`, `approvalSessionRef`, and a downstream wallet rail URL. An agent runtime can require this tool before any paid downstream action.
