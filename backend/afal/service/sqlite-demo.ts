import { pathToFileURL } from "node:url";
import { join } from "node:path";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import type { PaymentFlowOutput, ResourceFlowOutput } from "../interfaces";
import {
  createSeededSqliteAfalBundle,
  getSeededSqliteAfalPaths,
  type SeededSqliteAfalPaths,
} from "./sqlite";

export interface SqliteAfalDemoSummary {
  dataDir: string;
  paths: SeededSqliteAfalPaths;
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

export interface SqliteAfalDemoResult {
  summary: SqliteAfalDemoSummary;
  payment: PaymentFlowOutput;
  resource: ResourceFlowOutput;
}

function assertDemo(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`SQLite AFAL demo failed: ${message}`);
  }
}

function buildSummary(args: {
  dataDir: string;
  payment: PaymentFlowOutput;
  resource: ResourceFlowOutput;
}): SqliteAfalDemoSummary {
  return {
    dataDir: args.dataDir,
    paths: getSeededSqliteAfalPaths(args.dataDir),
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

export async function runSeededSqliteAfalDemo(dataDir: string): Promise<SqliteAfalDemoResult> {
  const bundle = createSeededSqliteAfalBundle(dataDir);

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
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-sqlite-data");
  const result = await runSeededSqliteAfalDemo(dataDir);
  console.log(JSON.stringify(result.summary, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
