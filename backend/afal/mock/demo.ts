import { pathToFileURL } from "node:url";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import type { PaymentFlowOutput, ResourceFlowOutput } from "../interfaces";
import {
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "./orchestrator";

export interface MockAfalDemoSummary {
  payment: {
    requestRef: string;
    intentId: string;
    result: string;
    challengeId?: string;
    settlementId: string;
    receiptId: string;
    amount: string;
    asset: string;
  };
  resource: {
    requestRef: string;
    intentId: string;
    result: string;
    challengeId?: string;
    usageReceiptRef: string;
    settlementId: string;
    receiptId: string;
    quantity: number;
    maxSpend: string;
    asset: string;
  };
}

export interface MockAfalDemoResult {
  summary: MockAfalDemoSummary;
  payment: PaymentFlowOutput;
  resource: ResourceFlowOutput;
}

function assertDemo(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Mock AFAL demo failed: ${message}`);
  }
}

function verifyPaymentOutput(output: PaymentFlowOutput): void {
  assertDemo(output.initialDecision.result === "challenge-required", "payment initial decision mismatch");
  assertDemo(output.finalDecision.result === "approved", "payment final decision mismatch");
  assertDemo(
    output.challenge?.challengeId === paymentFlowFixtures.challengeRecord.challengeId,
    "payment challenge id mismatch"
  );
  assertDemo(
    output.settlement.settlementId === paymentFlowFixtures.settlementRecord.settlementId,
    "payment settlement id mismatch"
  );
  assertDemo(
    output.paymentReceipt.receiptId === paymentFlowFixtures.paymentReceipt.receiptId,
    "payment receipt id mismatch"
  );
  assertDemo(output.intent.status === "settled", "payment final intent status mismatch");
}

function verifyResourceOutput(output: ResourceFlowOutput): void {
  assertDemo(output.initialDecision.result === "challenge-required", "resource initial decision mismatch");
  assertDemo(output.finalDecision.result === "approved", "resource final decision mismatch");
  assertDemo(
    output.challenge?.challengeId === resourceFlowFixtures.challengeRecord.challengeId,
    "resource challenge id mismatch"
  );
  assertDemo(
    output.usageConfirmation.usageReceiptRef === resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef,
    "resource usage receipt mismatch"
  );
  assertDemo(
    output.settlement.settlementId === resourceFlowFixtures.settlementRecord.settlementId,
    "resource settlement id mismatch"
  );
  assertDemo(
    output.resourceReceipt.receiptId === resourceFlowFixtures.resourceReceipt.receiptId,
    "resource receipt id mismatch"
  );
  assertDemo(output.intent.status === "settled", "resource final intent status mismatch");
}

function buildSummary(
  payment: PaymentFlowOutput,
  resource: ResourceFlowOutput
): MockAfalDemoSummary {
  return {
    payment: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intentId: payment.intent.intentId,
      result: payment.finalDecision.result,
      challengeId: payment.challenge?.challengeId,
      settlementId: payment.settlement.settlementId,
      receiptId: payment.paymentReceipt.receiptId,
      amount: payment.intent.amount,
      asset: payment.intent.asset,
    },
    resource: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intentId: resource.intent.intentId,
      result: resource.finalDecision.result,
      challengeId: resource.challenge?.challengeId,
      usageReceiptRef: resource.usageConfirmation.usageReceiptRef,
      settlementId: resource.settlement.settlementId,
      receiptId: resource.resourceReceipt.receiptId,
      quantity: resource.intent.resource.quantity,
      maxSpend: resource.intent.pricing.maxSpend,
      asset: resource.intent.pricing.asset,
    },
  };
}

export async function runMockAfalDemo(): Promise<MockAfalDemoResult> {
  const paymentOrchestrator = createMockPaymentFlowOrchestrator();
  const resourceOrchestrator = createMockResourceFlowOrchestrator();

  const payment = await paymentOrchestrator.executePaymentFlow({
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    intent: paymentFlowFixtures.paymentIntentCreated,
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
  });

  const resource = await resourceOrchestrator.executeResourceSettlementFlow({
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    intent: resourceFlowFixtures.resourceIntentCreated,
    resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
    resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
  });

  verifyPaymentOutput(payment);
  verifyResourceOutput(resource);

  return {
    summary: buildSummary(payment, resource),
    payment,
    resource,
  };
}

async function main(): Promise<void> {
  const result = await runMockAfalDemo();
  console.log(JSON.stringify(result.summary, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
