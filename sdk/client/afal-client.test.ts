import test from "node:test";
import assert from "node:assert/strict";

import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import { paymentFlowFixtures } from "../fixtures";
import { buildAgentPaymentIntent, createAfalClient, parseAgentPaymentInstruction } from "./index";

test("createAfalClient signs requestPaymentApproval calls", async () => {
  const seen: Array<{
    url: string;
    headers: Headers;
    body: unknown;
  }> = [];
  const client = createAfalClient({
    baseUrl: "http://afal.local/",
    clientId: "client-001",
    signingKey: "secret",
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    fetch: async (url, init) => {
      seen.push({
        url: String(url),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)),
      });
      return Response.json({
        ok: true,
        capability: "requestPaymentApproval",
        requestRef: "req-001",
        statusCode: 200,
        data: {
          intent: paymentFlowFixtures.paymentIntentCreated,
          initialDecision: paymentFlowFixtures.authorizationDecisionInitial,
          challenge: paymentFlowFixtures.challengeRecord,
          approvalContext: paymentFlowFixtures.approvalContext,
          approvalSession: {
            approvalSessionId: "aps-chall-0001",
            schemaVersion: "0.1",
            actionRef: "payint-0001",
            actionType: "payment",
            subjectDid: "did:afal:agent:payment-agent-01",
            mandateRef: "mnd-0001",
            policyRef: "cred-policy-0001",
            priorDecisionRef: "dec-0001",
            challengeRef: "chall-0001",
            approvalContextRef: "ctx-0001",
            trustedSurfaceRef: "trusted-surface:web",
            status: "pending",
            createdAt: "2026-03-24T12:05:06Z",
            updatedAt: "2026-03-24T12:05:06Z",
          },
          capabilityResponse: paymentFlowFixtures.capabilityResponse,
          updatedBudget: paymentFlowFixtures.monetaryBudgetFinal,
        },
      });
    },
  });

  await client.requestPaymentApproval({
    requestRef: "req-001",
    intent: paymentFlowFixtures.paymentIntentCreated,
    monetaryBudgetRef: "budg-money-001",
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.url, `http://afal.local${AFAL_HTTP_ROUTES.requestPaymentApproval}`);
  assert.equal(seen[0]?.headers.get("x-afal-client-id"), "client-001");
  assert.equal(seen[0]?.headers.get("x-afal-request-timestamp"), "2026-04-29T00:00:00.000Z");
  assert.equal(
    seen[0]?.headers.get("x-afal-request-signature"),
    "83d496594087b3748111d541db458eac24d100b5ca1ead11b3b55ec75181e34c"
  );
  assert.deepEqual(seen[0]?.body, {
    requestRef: "req-001",
    input: {
      requestRef: "req-001",
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: "budg-money-001",
    },
  });
});

test("agent payment helper parses a prompt into an AFAL payment intent", () => {
  const instruction = parseAgentPaymentInstruction({
    message:
      "Pay 0.01 USDC to payee agent at 0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94 for fraud detection service",
  });
  const intent = buildAgentPaymentIntent(instruction);

  assert.equal(instruction.amount, "0.01");
  assert.equal(instruction.chain, "base-sepolia");
  assert.equal(intent.amount, "0.01");
  assert.equal(intent.payee.settlementAddress, "0x3c3c15373eCF0f68C7a841Eac56893FfE1952a94");
  assert.equal(intent.purpose.referenceId, "agent-payment-tool");
});
