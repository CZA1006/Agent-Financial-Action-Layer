import { pathToFileURL } from "node:url";
import { join } from "node:path";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import type { PaymentFlowOutput, ResourceFlowOutput } from "../interfaces";
import {
  createSeededDurableAfalBundle,
  getSeededDurableAfalPaths,
  type SeededDurableAfalPaths,
} from "./durable";

export interface DurableAfalDemoSummary {
  dataDir: string;
  paths: SeededDurableAfalPaths;
  payment: {
    requestRef: string;
    intentId: string;
    result: string;
    settlementId: string;
    receiptId: string;
    consumedAmount?: string;
  };
  resource: {
    requestRef: string;
    intentId: string;
    result: string;
    usageReceiptRef: string;
    settlementId: string;
    receiptId: string;
    usedQuantity?: number;
  };
}

export interface DurableAfalDemoResult {
  summary: DurableAfalDemoSummary;
  payment: PaymentFlowOutput;
  resource: ResourceFlowOutput;
}

function assertDemo(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Durable AFAL demo failed: ${message}`);
  }
}

function buildSummary(args: {
  dataDir: string;
  payment: PaymentFlowOutput;
  resource: ResourceFlowOutput;
}): DurableAfalDemoSummary {
  return {
    dataDir: args.dataDir,
    paths: getSeededDurableAfalPaths(args.dataDir),
    payment: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intentId: args.payment.intent.intentId,
      result: args.payment.finalDecision.result,
      settlementId: args.payment.settlement.settlementId,
      receiptId: args.payment.paymentReceipt.receiptId,
      consumedAmount: args.payment.updatedBudget?.consumedAmount,
    },
    resource: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intentId: args.resource.intent.intentId,
      result: args.resource.finalDecision.result,
      usageReceiptRef: args.resource.usageConfirmation.usageReceiptRef,
      settlementId: args.resource.settlement.settlementId,
      receiptId: args.resource.resourceReceipt.receiptId,
      usedQuantity: args.resource.updatedQuota?.usedQuantity,
    },
  };
}

export async function runSeededDurableAfalDemo(dataDir: string): Promise<DurableAfalDemoResult> {
  const bundle = createSeededDurableAfalBundle(dataDir);

  const payment = await bundle.runtime.executePayment({
    capability: "executePayment",
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });
  const resource = await bundle.runtime.settleResourceUsage({
    capability: "settleResourceUsage",
    requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  });

  assertDemo(payment.intent.status === "settled", "payment intent was not settled");
  assertDemo(resource.intent.status === "settled", "resource intent was not settled");
  assertDemo(
    payment.paymentReceipt.receiptId === paymentFlowFixtures.paymentReceipt.receiptId,
    "payment receipt mismatch"
  );
  assertDemo(
    resource.resourceReceipt.receiptId === resourceFlowFixtures.resourceReceipt.receiptId,
    "resource receipt mismatch"
  );

  return {
    summary: buildSummary({
      dataDir,
      payment,
      resource,
    }),
    payment,
    resource,
  };
}

async function main(): Promise<void> {
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-durable-data");
  const result = await runSeededDurableAfalDemo(dataDir);
  console.log(JSON.stringify(result.summary, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
