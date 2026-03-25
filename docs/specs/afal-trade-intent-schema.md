# AFAL Trade Intent Schema

## Status

Draft v0.1  
Forward-compatibility specification; not required for full MVP execution.

## Purpose

This document defines the Trade Intent schema used by AFAL.

A Trade Intent is a structured request to perform a trading-related financial action.
It is designed for future AFAL phases in which agents may:
- request quotes
- access execution venues
- submit bounded trade actions
- route across venues
- receive structured receipts

Trade Intent is introduced early so AFAL can design identity, authority, treasury, and settlement layers with future trading compatibility.

---

# 1. Design Goals

Trade Intent must support:

1. explicit trader identity
2. venue-aware execution requests
3. bounded asset and notional scope
4. policy and mandate linkage
5. slippage / price protection
6. challenge and approval semantics
7. structured receipts
8. compatibility with quote and routing layers

---

# 2. Core Model

A Trade Intent represents:
- which agent wants to trade
- on which venue or venue class
- what asset pair or market
- what direction
- what amount or notional
- under which policy / mandate
- under what execution constraints
- whether challenge is required
- how execution and receipt should be tracked

---

# 3. Trade Intent Schema

```json
{
  "intentId": "trdint-0001",
  "intentType": "trade",
  "trader": {
    "agentDid": "did:afal:agent:execution-agent-01",
    "accountId": "acct-agent-003"
  },
  "venue": {
    "venueId": "venue-uniswap",
    "venueType": "dex",
    "chain": "base"
  },
  "market": {
    "baseAsset": "ETH",
    "quoteAsset": "USDC"
  },
  "side": "buy",
  "quantity": "1.25",
  "notionalLimit": "2500.00",
  "executionConstraints": {
    "limitPrice": "2000.00",
    "maxSlippageBps": 50,
    "timeInForce": "IOC"
  },
  "mandateRef": "mnd-0003",
  "policyRef": "pol-0003",
  "executionMode": "pre-authorized",
  "challengeState": "not-required",
  "status": "created",
  "expiresAt": "2026-03-24T12:05:00Z",
  "nonce": "n-2001",
  "createdAt": "2026-03-24T12:00:00Z"
}
```

---

# 4. Field Definitions

## `intentId`
- unique trade intent identifier

## `intentType`
- fixed value: `trade`

## `trader`
The agent and account requesting the trade.

### Required fields
- `agentDid`
- `accountId`

## `venue`
Describes the execution target.

### Suggested fields
- `venueId`
- `venueType`
- `chain`

### Example `venueType`
- `dex`
- `aggregator`
- `rfq`
- `cex-bridge`
- `internal`

## `market`
Defines the trading market.

### Required fields
- `baseAsset`
- `quoteAsset`

## `side`
Allowed values:
- `buy`
- `sell`

## `quantity`
- trade size in base asset units

## `notionalLimit`
- optional quote-denominated notional cap

## `executionConstraints`
Optional object for execution protection.

### Suggested fields
- `limitPrice`
- `maxSlippageBps`
- `timeInForce`

### Example `timeInForce`
- `IOC`
- `FOK`
- `GTC`

## `mandateRef`
- reference to trade mandate

## `policyRef`
- reference to policy or credential

## `executionMode`
Allowed values:
- `human-in-the-loop`
- `pre-authorized`
- `fully-agent-native`

## `challengeState`
Allowed values:
- `not-required`
- `required`
- `pending`
- `passed`
- `failed`

## `status`
Allowed values:
- `created`
- `evaluating`
- `quote-requested`
- `challenge-required`
- `approved`
- `rejected`
- `routing`
- `executing`
- `partially-filled`
- `filled`
- `cancelled`
- `failed`
- `expired`

## `expiresAt`
- expiration timestamp

## `nonce`
- anti-replay field

## `createdAt`
- creation timestamp

---

# 5. Optional Extended Fields

```json
{
  "quoteRef": "quote-1001",
  "routeRef": "route-1001",
  "receiptRef": "trdrcpt-0001",
  "metadata": {
    "strategyId": "strat-01",
    "riskBucket": "low"
  }
}
```

### Meaning
- `quoteRef`: link to quote data
- `routeRef`: link to routing plan
- `receiptRef`: final trade receipt
- `metadata`: contextual execution info

---

# 6. Validation Rules

A Trade Intent is valid only if:

1. trader identity exists and is active
2. trader account exists and is usable
3. mandate is active
4. policy is valid
5. venue is allowed
6. assets are allowed
7. side is valid
8. quantity is positive
9. nonce is unused
10. current time is before `expiresAt`

---

# 7. Authorization Rules

Before execution, the system should evaluate:

1. trader DID status
2. trader account state
3. trade authority credential
4. trade mandate scope
5. venue access policy
6. asset allow-list
7. size / notional limits
8. challenge thresholds
9. treasury balance / collateral availability

---

# 8. Challenge Rules

Challenge may be required when:
- a new venue is accessed
- a new asset is traded
- size exceeds threshold
- price impact exceeds threshold
- policy requires challenge
- leverage would be introduced
- execution leaves whitelisted venue boundaries

---

# 9. Lifecycle

Suggested flow:

```text
created
  -> evaluating
  -> quote-requested
  -> approved
  -> routing
  -> executing
  -> filled
```

Challenge path:

```text
created
  -> evaluating
  -> challenge-required
  -> pending
  -> approved
  -> routing
  -> executing
  -> filled
```

Alternative end states:
- `partially-filled`
- `cancelled`
- `failed`
- `expired`

---

# 10. Quote and Routing Linkage

Trade Intent should be designed to work with future:
- quote objects
- routing objects
- venue adapters
- execution receipts

This allows AFAL to support:

**Trade Intent → Policy Check → Quote / Route → Execution → Receipt**

without changing the identity / treasury foundation.

---

# 11. Receipt Linkage

A completed trade should produce a receipt containing:
- intent id
- trader
- venue
- market
- side
- filled quantity
- execution price
- fees
- tx hash or venue execution reference
- authorization decision reference
- settlement reference

---

# 12. Minimal APIs

## Creation
- createTradeIntent

## Evaluation
- evaluateTradeIntent

## Challenge
- triggerTradeChallenge
- resolveTradeChallenge

## Routing / Execution
- requestQuote
- routeTradeIntent
- executeTradeIntent

## Read
- getTradeIntent
- getTradeReceipt

---

# 13. MVP Note

Trade Intent is part of AFAL’s forward-compatible schema set, but full trade execution is not required in Phase 1.

Recommended MVP treatment:
- define schema
- define policy hooks
- do not yet implement full venue execution

---

# 14. Open Questions

1. Which venue class should be supported first after MVP?
2. Is `notionalLimit` mandatory in v1?
3. Should quote objects be embedded or referenced?
4. How should partially-filled states be modeled in the receipt layer?
5. Should venue access be handled only via mandates or also via dedicated credentials?

---

# 15. Summary

Trade Intent is the future structured execution object for AFAL’s market-access layer.

It ensures that future agent trading can be:
- identity-linked
- policy-bound
- venue-aware
- challenge-ready
- auditable
- compatible with payment and settlement infrastructure
