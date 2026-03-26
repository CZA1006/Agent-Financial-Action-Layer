import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { createAfalRuntimeService } from "../service";
import { createAfalApiServiceAdapter } from "./service-adapter";

test("AFAL API service adapter delegates payment and resource requests through the module service", async () => {
  const adapter = createAfalApiServiceAdapter(createAfalRuntimeService());

  const payment = await adapter.handleExecutePayment({
    capability: "executePayment",
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resource = await adapter.handleSettleResourceUsage({
    capability: "settleResourceUsage",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  assert.equal(payment.ok, true);
  assert.equal(resource.ok, true);
});
