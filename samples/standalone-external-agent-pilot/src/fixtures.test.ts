import assert from "node:assert/strict";
import { test } from "node:test";

import { createPaymentRequestTemplate, createResourceRequestTemplate } from "./fixtures";

test("standalone payment and resource fixtures stay aligned to the sandbox subject", () => {
  const payment = createPaymentRequestTemplate();
  const resource = createResourceRequestTemplate();

  assert.equal(payment.input.intent.intentId, "payint-0001");
  assert.equal(resource.input.intent.intentId, "resint-0001");
  assert.equal(payment.input.intent.payer.agentDid, "did:afal:agent:payment-agent-01");
  assert.equal(resource.input.intent.requester.agentDid, "did:afal:agent:payment-agent-01");
  assert.equal(resource.input.intent.resource.quantity, 100000);
});
