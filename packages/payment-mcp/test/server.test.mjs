import assert from "node:assert/strict";
import test from "node:test";

import { extractMcpMessages, handleMcpRequest } from "../src/server.mjs";

test("standalone payment MCP lists AFAL tools", async () => {
  const response = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(response.result.tools.some((tool) => tool.name === "afal_pay_and_gate"), true);
});

test("standalone payment MCP dispatches pay-and-gate through injectable tools", async () => {
  const response = await handleMcpRequest(
    {
      jsonrpc: "2.0",
      id: "call-1",
      method: "tools/call",
      params: {
        name: "afal_pay_and_gate",
        arguments: {
          message:
            "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service",
        },
      },
    },
    {
      env: {
        AFAL_BASE_URL: "http://127.0.0.1:3213",
        AFAL_CLIENT_ID: "client-test",
        AFAL_SIGNING_KEY: "secret",
        AFAL_PAYMENT_MODE: "agent-wallet",
      },
      tools: {
        afal_pay_and_gate: async (_env, args) => ({
          tool: "afal.pay_and_gate",
          status: "settled",
          message: args.message,
          deliverService: true,
        }),
      },
    }
  );
  assert.equal(response.result.isError, false);
  const payload = JSON.parse(response.result.content[0].text);
  assert.equal(payload.deliverService, true);
});

test("standalone payment MCP extracts newline and content-length messages", () => {
  const one = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" });
  const two = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const framed = `Content-Length: ${two.length}\r\n\r\n${two}`;
  const extracted = extractMcpMessages(`${one}\n${framed}`);
  assert.deepEqual(extracted.messages, [one, two]);
  assert.equal(extracted.rest, "");
});
