import test from "node:test";
import assert from "node:assert/strict";

import { runAgentRuntimeTool, type AgentRuntimeToolRunners } from "./agent-runtime-tool";

const runners: AgentRuntimeToolRunners = {
  async requestPayment(args) {
    return {
      called: "requestPayment",
      message: args.message,
      walletDemoUrl: args.walletDemoUrl,
      waitForReceipt: args.waitForReceipt,
    };
  },
  async approveResume(args) {
    return {
      called: "approveResume",
      approvalSessionRef: args.approvalSessionRef,
      comment: args.comment,
    };
  },
  async providerGate(args) {
    return {
      called: "providerGate",
      actionRef: args.actionRef,
      expectedTxHash: args.expectedTxHash,
      deliverService: true,
    };
  },
  async waitForWalletConfirmation(args) {
    return {
      actionRef: args.actionRef,
      txHash: "0xwallet",
      from: "0xpayer",
      to: "0xpayee",
      tokenAddress: "0xtoken",
      amount: "0.01",
      asset: "USDC",
      chain: "base-sepolia",
      chainId: 84532,
      confirmedAt: "2026-04-30T00:00:00.000Z",
      status: "ok",
    };
  },
};

test("agent runtime tool dispatches request-payment commands", async () => {
  const result = await runAgentRuntimeTool(
    [
      "request-payment",
      "--base-url",
      "http://afal.test",
      "--client-id",
      "client-001",
      "--signing-key",
      "secret",
      "--message",
      "Pay 0.01 USDC",
      "--wallet-demo-url",
      "http://wallet.test",
      "--wait-for-receipt",
    ],
    runners
  );

  assert.equal(result.command, "request-payment");
  assert.deepEqual(result.result, {
    called: "requestPayment",
    message: "Pay 0.01 USDC",
    walletDemoUrl: "http://wallet.test",
    waitForReceipt: true,
  });
});

test("agent runtime tool dispatches approve-resume commands", async () => {
  const result = await runAgentRuntimeTool(
    [
      "approve-resume",
      "--base-url",
      "http://afal.test",
      "--approval-session-ref",
      "aps-chall-0001",
      "--comment",
      "approved",
    ],
    runners
  );

  assert.equal(result.command, "approve-resume");
  assert.deepEqual(result.result, {
    called: "approveResume",
    approvalSessionRef: "aps-chall-0001",
    comment: "approved",
  });
});

test("agent runtime tool dispatches provider-gate commands", async () => {
  const result = await runAgentRuntimeTool(
    [
      "provider-gate",
      "--base-url",
      "http://afal.test",
      "--client-id",
      "client-001",
      "--signing-key",
      "secret",
      "--action-ref",
      "payint-0001",
      "--expected-tx-hash",
      "0xabc",
    ],
    runners
  );

  assert.equal(result.command, "provider-gate");
  assert.deepEqual(result.result, {
    called: "providerGate",
    actionRef: "payint-0001",
    expectedTxHash: "0xabc",
    deliverService: true,
  });
});

test("agent runtime tool orchestrates pay-and-gate commands", async () => {
  const result = await runAgentRuntimeTool(
    [
      "pay-and-gate",
      "--base-url",
      "http://afal.test",
      "--client-id",
      "client-001",
      "--signing-key",
      "secret",
      "--message",
      "Pay 0.01 USDC",
      "--wallet-demo-url",
      "http://wallet.test/wallet-demo",
      "--wallet-confirmation-timeout-ms",
      "1000",
      "--wallet-confirmation-poll-interval-ms",
      "10",
      "--comment",
      "approved",
    ],
    {
      ...runners,
      async requestPayment(args) {
        return {
          tool: "afal.request_payment",
          status: "pending_approval",
          actionRef: "payint-0001",
          approvalSessionRef: "aps-chall-0001",
          payeeAddress: "0xpayee",
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          walletUrl: `${args.walletDemoUrl}?actionRef=payint-0001`,
        };
      },
      async approveResume(args) {
        return {
          called: "approveResume",
          approvalSessionRef: args.approvalSessionRef,
          comment: args.comment,
          txHash: "0xwallet",
        };
      },
      async providerGate(args) {
        return {
          tool: "afal.provider_receipt_gate",
          actionRef: args.actionRef,
          deliverService: true,
          reason: "ok",
          checks: {
            actionTypePayment: true,
            intentSettled: true,
            settlementPresent: true,
            paymentReceiptFinal: true,
            receiptSettlementMatches: true,
            payeeMatches: true,
            amountMatches: true,
            assetMatches: true,
            chainMatches: true,
            txHashMatches: true,
          },
          evidence: {
            txHash: args.expectedTxHash,
            amount: args.expectedAmount,
            asset: args.expectedAsset,
            chain: args.expectedChain,
            settlementAddress: args.expectedPayeeAddress,
          },
        };
      },
    }
  );

  assert.equal(result.command, "pay-and-gate");
  assert.equal((result.result as { deliverService: boolean }).deliverService, true);
  assert.equal((result.result as { actionRef: string }).actionRef, "payint-0001");
});

test("agent runtime tool rejects unknown commands", async () => {
  await assert.rejects(
    runAgentRuntimeTool(["pay-directly"], runners),
    /First argument must be one of/
  );
});
