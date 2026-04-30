import assert from "node:assert/strict";
import test from "node:test";

import { extractMcpMessages, handleMcpRequest } from "./server";

test("AFAL MCP server lists payment tools", async () => {
  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });

  assert.equal(response?.jsonrpc, "2.0");
  assert.equal(response?.id, 1);
  assert.ok("result" in response!);
  const tools = (response as unknown as { result: { tools: Array<{ name: string }> } }).result.tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "afal_pay_and_gate",
      "afal_request_payment",
      "afal_approve_resume",
      "afal_provider_gate",
    ]
  );
});

test("AFAL MCP pay-and-gate invokes agent runtime with agent-wallet defaults", async () => {
  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: "call-1",
      method: "tools/call",
      params: {
        name: "afal_pay_and_gate",
        arguments: {
          message: "Pay 0.01 USDC",
        },
      },
    },
    {
      env: {
        AFAL_BASE_URL: "http://afal.test",
        AFAL_CLIENT_ID: "client-001",
        AFAL_SIGNING_KEY: "secret",
        AFAL_WALLET_DEMO_URL: "http://wallet.test/wallet-demo",
      },
      async runAgentTool(argv) {
        assert.deepEqual(argv, [
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
          "--payment-mode",
          "agent-wallet",
        ]);
        return {
          tool: "afal.agent_runtime_tool",
          command: "pay-and-gate",
          result: {
            deliverService: true,
          },
        };
      },
    }
  );

  assert.ok(response && "result" in response);
  const text = (response.result as { content: Array<{ text: string }> }).content[0]?.text;
  assert.match(text, /"deliverService": true/);
});

test("AFAL MCP extracts newline and content-length messages", () => {
  const newline = extractMcpMessages('{"id":1}\n{"id":2}\npartial');
  assert.deepEqual(newline.messages, ['{"id":1}', '{"id":2}']);
  assert.equal(newline.rest, "partial");

  const body = '{"jsonrpc":"2.0","id":1,"method":"ping"}';
  const framed = extractMcpMessages(`Content-Length: ${body.length}\r\n\r\n${body}`);
  assert.deepEqual(framed.messages, [body]);
  assert.equal(framed.rest, "");
});
