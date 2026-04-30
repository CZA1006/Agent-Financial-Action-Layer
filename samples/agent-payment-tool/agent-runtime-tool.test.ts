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
  });
});

test("agent runtime tool rejects unknown commands", async () => {
  await assert.rejects(
    runAgentRuntimeTool(["pay-directly"], runners),
    /First argument must be one of/
  );
});
