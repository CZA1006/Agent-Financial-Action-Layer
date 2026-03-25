import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createMockAfalPorts, createMockPaymentFlowOrchestrator, createMockResourceFlowOrchestrator } from "../mock";
import { createAfalApiHandlers, handleExecutePayment, handleSettleResourceUsage } from "./handlers";

describe("AFAL API adapter", () => {
  test("returns a success envelope for executePayment", async () => {
    const response = await handleExecutePayment({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.statusCode, 200);
      assert.equal(response.data.finalDecision.result, "approved");
      assert.equal(response.data.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
    }
  });

  test("maps credential verification failure to a 403 response", async () => {
    const basePorts = createMockAfalPorts();
    const orchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        aip: {
          resolveIdentity: (subjectDid) => basePorts.aip.resolveIdentity(subjectDid),
          verifyCredential: async (credentialId) =>
            credentialId === paymentFlowFixtures.policyCredential.id
              ? false
              : basePorts.aip.verifyCredential(credentialId),
        },
      })
    );

    const response = await handleExecutePayment(
      {
        capability: "executePayment",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
      orchestrator
    );

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 403);
      assert.equal(response.error.code, "credential-verification-failed");
    }
  });

  test("maps payment approval expiry to a 409 response", async () => {
    const orchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        trustedSurface: {
          requestApproval: async (context) => ({
            ...paymentFlowFixtures.approvalResult,
            challengeRef: context.challengeRef,
            actionRef: context.actionRef,
            result: "expired",
            approvalReceiptRef: undefined,
          }),
        },
      })
    );

    const response = await handleExecutePayment(
      {
        capability: "executePayment",
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      },
      orchestrator
    );

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 409);
      assert.equal(response.error.code, "authorization-expired");
    }
  });

  test("maps provider usage confirmation failure to a 502 response", async () => {
    const orchestrator = createMockResourceFlowOrchestrator(
      createMockAfalPorts({
        resourceSettlement: {
          confirmResourceUsage: async () => {
            throw new Error("Provider usage confirmation failed");
          },
          settleResourceUsage: async () => {
            throw new Error("resource settlement should not run");
          },
        },
      })
    );

    const response = await handleSettleResourceUsage(
      {
        capability: "settleResourceUsage",
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        },
      },
      orchestrator
    );

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 502);
      assert.equal(response.error.code, "provider-failure");
    }
  });

  test("supports generic capability dispatch", async () => {
    const handlers = createAfalApiHandlers();

    const paymentResponse = await handlers.invokeCapability({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    const resourceResponse = await handlers.invokeCapability({
      capability: "settleResourceUsage",
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intent: resourceFlowFixtures.resourceIntentCreated,
        resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
        resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    assert.equal(paymentResponse.ok, true);
    assert.equal(resourceResponse.ok, true);
  });
});
