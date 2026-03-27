# Trusted Surface

## Purpose

The `app/trusted-surface/` folder contains the human approval surface for AFAL.

A trusted surface is the interface through which high-risk or policy-sensitive actions can be reviewed, challenged, approved, or rejected by a human operator.

Phase 1 uses a lightweight web trusted surface. It is an approval surface, not a general consumer application.

## Phase 1 Decisions

- first trusted surface: web approval app
- challenge and approval state are off-chain first
- payment and resource actions share the same challenge and approval object model
- approval outputs are structured AFAL objects, not ad hoc UI callbacks

## Canonical Flow

```text
payment/resource intent
  -> AMN authorization decision
  -> challenge-required
  -> challenge record + approval context
  -> trusted-surface review
  -> approval result
  -> updated authorization decision
  -> settlement
  -> receipt
```

## Challenge State Machine

```text
not-required
  -> required
  -> pending-approval
  -> approved
```

Alternative end states:

- `rejected`
- `expired`
- `cancelled`

## Approval Context Object

The trusted surface consumes `ApprovalContext` from `docs/specs/afal-approval-challenge-schema.md`.

Minimum fields that must be displayed to the human reviewer:

- action type
- subject agent DID
- payer/requester account
- payee or provider identity
- asset and amount, or resource quantity and max spend
- chain or settlement rail
- purpose / description
- mandate reference
- policy reference
- challenge reason
- risk signals
- expiration time

## Approval Result Object

The trusted surface must return a structured approval result containing:

- `challengeRef`
- `actionRef`
- `result`
- `approvedBy`
- `approvalChannel`
- `stepUpAuthUsed`
- optional reviewer comment
- `approvalReceiptRef`
- `decidedAt`

## Callback / Output Contract

The trusted surface does not execute settlement directly.

Its job is to:

1. read `ChallengeRecord` and `ApprovalContext`
2. produce `ApprovalResult`
3. hand control back to AMN / AFAL orchestration

Required callback behavior:

- on approve: mark challenge `approved`, emit `ApprovalResult`, allow orchestration to continue
- on reject: mark challenge `rejected`, emit `ApprovalResult`, stop execution
- on expiry: mark challenge `expired`, stop execution

Phase 1 local runtime now persists this state in an AMN approval session so the challenge can survive process restarts and later be resumed.

The concrete integration contract for this flow now lives in:

- [docs/specs/trusted-surface-callback-contract.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/specs/trusted-surface-callback-contract.md#L1)

After approval and resume, downstream receiver-side agents can independently confirm the final settled action through AFAL's read-side route:

- `POST /actions/get`

## Phase 1 UX Rules

The first implementation should optimize for:

- clarity of what is being approved
- clarity of risk signals
- explicit identity and mandate references
- auditability of who approved what and when

It should not optimize for:

- polished consumer wallet UX
- dashboard breadth
- large design system investment
- multi-role admin complexity

## Immediate Implementation Artifacts

Phase 1 work in this folder should produce:

- challenge flow documentation
- approval context object notes
- approval result object notes
- state transition notes
- lightweight placeholder UI scaffold later
- minimal trusted-surface stub for callback and resume testing

## Local Stub

A minimal stub now exists at:

- [stub.ts](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/app/trusted-surface/stub.ts#L1)

It is a small integration helper, not a UI.

It can:

- read a persisted approval session
- construct a structured `ApprovalResult`
- submit the approval result back to AFAL
- optionally resume the approved action into settlement

The bilateral runtime-agent harnesses then use AFAL's read-side action query to let `payee-agent` and `provider-agent` confirm final outcomes without touching internal state directly.

Example usage against the local durable HTTP server:

```bash
node --import tsx/esm app/trusted-surface/stub.ts \
  --base-url http://127.0.0.1:3212 \
  --approval-session-ref aps-chall-0001
```
