import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createMockAfalPorts } from "../mock";
import { AfalRuntimeService, createAfalRuntimeService } from "./runtime";

test("AFAL runtime service executes both canonical flows through default orchestrators", async () => {
  const service = createAfalRuntimeService();

  const payment = await service.executePaymentFlow({
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    intent: paymentFlowFixtures.paymentIntentCreated,
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
  });
  const resource = await service.executeResourceSettlementFlow({
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    intent: resourceFlowFixtures.resourceIntentCreated,
    resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
    resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
  });

  assert.equal(payment.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  assert.equal(
    resource.resourceReceipt.receiptId,
    resourceFlowFixtures.resourceReceipt.receiptId
  );
});

test("AFAL runtime service keeps a shared seeded port bundle when one is provided", async () => {
  const ports = createMockAfalPorts();
  const service = new AfalRuntimeService({ ports });

  const payment = await service.executePaymentFlow({
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    intent: paymentFlowFixtures.paymentIntentCreated,
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
  });
  const resource = await service.executeResourceSettlementFlow({
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    intent: resourceFlowFixtures.resourceIntentCreated,
    resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
    resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
  });

  assert.equal(service.ports, ports);
  assert.equal(payment.finalDecision.result, "approved");
  assert.equal(resource.finalDecision.result, "approved");
});

test("AFAL runtime service exposes module-service command entrypoints", async () => {
  const service = createAfalRuntimeService();

  const payment = await service.executePayment({
    capability: "executePayment",
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resource = await service.invoke({
    capability: "settleResourceUsage",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  assert.equal(payment.finalDecision.result, "approved");
  assert.equal(resource.finalDecision.result, "approved");
});
