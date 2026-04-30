import test from "node:test";
import assert from "node:assert/strict";

import type { PaymentActionStatusOutput } from "../../backend/afal/interfaces";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { evaluateProviderReceiptGate } from "./provider-receipt-gate";

function buildStatus(overrides?: Partial<PaymentActionStatusOutput>): PaymentActionStatusOutput {
  return {
    actionType: "payment",
    intent: {
      ...paymentFlowFixtures.paymentIntentFinal,
      status: "settled",
      payee: {
        ...paymentFlowFixtures.paymentIntentFinal.payee,
        settlementAddress: "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94",
      },
    },
    finalDecision: paymentFlowFixtures.authorizationDecisionFinal,
    settlement: {
      ...paymentFlowFixtures.settlementRecord,
      settlementId: "stl-wallet-payint-0001",
      amount: "0.01",
      chain: "base-sepolia",
      txHash: "0xabc",
    },
    paymentReceipt: {
      ...paymentFlowFixtures.paymentReceipt,
      receiptId: "rcpt-pay-0001",
      settlementRef: "stl-wallet-payint-0001",
      status: "final",
      evidence: {
        payerAccountRef: "acct-agent-001",
        payeeDid: "did:afal:agent:fraud-service-01",
        amount: "0.01",
        asset: "USDC",
        chain: "base-sepolia",
        txHash: "0xabc",
      },
    },
    ...overrides,
  };
}

test("provider receipt gate allows service delivery only after settled final receipt", () => {
  const result = evaluateProviderReceiptGate({
    actionRef: "payint-0001",
    status: buildStatus(),
    expectedPayeeAddress: "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94",
    expectedAmount: "0.01",
    expectedAsset: "USDC",
    expectedChain: "base-sepolia",
    expectedTxHash: "0xabc",
  });

  assert.equal(result.deliverService, true);
});

test("provider receipt gate rejects pending action even if stale receipt exists", () => {
  const result = evaluateProviderReceiptGate({
    actionRef: "payint-0001",
    status: buildStatus({
      intent: {
        ...paymentFlowFixtures.paymentIntentCreated,
        status: "pending-approval",
      },
    }),
    expectedAmount: "0.01",
    expectedAsset: "USDC",
    expectedChain: "base-sepolia",
  });

  assert.equal(result.deliverService, false);
  assert.equal(result.checks.intentSettled, false);
  assert.match(result.reason, /intentSettled/u);
});

test("provider receipt gate rejects mismatched wallet tx hash", () => {
  const result = evaluateProviderReceiptGate({
    actionRef: "payint-0001",
    status: buildStatus(),
    expectedTxHash: "0xdef",
  });

  assert.equal(result.deliverService, false);
  assert.equal(result.checks.txHashMatches, false);
});
