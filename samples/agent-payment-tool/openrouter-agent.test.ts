import test from "node:test";
import assert from "node:assert/strict";

import { parseAgentPaymentToolDecision } from "./openrouter-agent";

test("parseAgentPaymentToolDecision accepts fenced tool-call JSON", () => {
  const decision = parseAgentPaymentToolDecision(`\`\`\`json
{
  "tool": "afal_request_payment",
  "arguments": {
    "message": "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service"
  },
  "rationale": "The user requested a payment, so AFAL must govern the action."
}
\`\`\``);

  assert.equal(decision.tool, "afal_request_payment");
  assert.equal(decision.arguments.message.includes("0.01 USDC"), true);
  assert.equal(decision.rationale.includes("AFAL"), true);
});

test("parseAgentPaymentToolDecision rejects non-AFAL payment bypasses", () => {
  assert.throws(
    () =>
      parseAgentPaymentToolDecision(
        '{"tool":"direct_wallet_send","arguments":{"message":"pay"},"rationale":"skip AFAL"}'
      ),
    /afal_request_payment/
  );
});
