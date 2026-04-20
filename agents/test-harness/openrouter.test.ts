import test from "node:test";
import assert from "node:assert/strict";

import {
  extractJsonObject,
  parseOpenRouterPaymentDecision,
  parseOpenRouterResourceDecision,
} from "./openrouter";

test("extractJsonObject accepts fenced JSON", () => {
  assert.equal(
    extractJsonObject('```json\n{"decision":"request_payment_approval","rationale":"allowed"}\n```'),
    '{"decision":"request_payment_approval","rationale":"allowed"}'
  );
});

test("parseOpenRouterPaymentDecision validates canonical JSON payload", () => {
  assert.deepEqual(
    parseOpenRouterPaymentDecision(
      '{"decision":"request_payment_approval","rationale":"counterparty is allowed and approval is expected"}'
    ),
    {
      decision: "request_payment_approval",
      rationale: "counterparty is allowed and approval is expected",
    }
  );
});

test("parseOpenRouterPaymentDecision rejects invalid decision values", () => {
  assert.throws(
    () =>
      parseOpenRouterPaymentDecision(
        '{"decision":"execute_now","rationale":"incorrect action"}'
      ),
    /OpenRouter decision must be/
  );
});

test("parseOpenRouterResourceDecision validates canonical JSON payload", () => {
  assert.deepEqual(
    parseOpenRouterResourceDecision(
      '{"decision":"request_resource_approval","rationale":"provider and spend are allowed and approval is expected"}'
    ),
    {
      decision: "request_resource_approval",
      rationale: "provider and spend are allowed and approval is expected",
    }
  );
});
