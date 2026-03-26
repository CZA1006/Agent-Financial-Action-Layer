import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { SqliteAtsStore } from "../../ats";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { createSeededSqliteAfalHttpServer, handleAfalNodeHttpRequest } from "./sqlite-server";
import { AFAL_HTTP_ROUTES } from "./types";

export interface SqliteAfalHttpPaymentDemoSummary {
  dataDir: string;
  request: {
    method: "POST";
    path: typeof AFAL_HTTP_ROUTES.executePayment;
    requestRef: string;
    monetaryBudgetRef: string;
  };
  response: {
    statusCode: number;
    ok: boolean;
    capability: "executePayment";
  };
  persisted: {
    budgetId: string;
    consumedAmount?: string;
    receiptId?: string;
  };
}

export interface SqliteAfalHttpPaymentDemoResult {
  summary: SqliteAfalHttpPaymentDemoSummary;
  responseBody: unknown;
}

function assertDemo(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`SQLite AFAL HTTP demo failed: ${message}`);
  }
}

export async function runSeededSqliteHttpPaymentDemo(
  dataDir: string
): Promise<SqliteAfalHttpPaymentDemoResult> {
  const sqlite = createSeededSqliteAfalHttpServer(dataDir);
  const bodyText = JSON.stringify({
    requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  const response = await handleAfalNodeHttpRequest(sqlite, {
    method: "POST",
    url: AFAL_HTTP_ROUTES.executePayment,
    bodyText,
  });

  const responseBody = JSON.parse(response.bodyText) as { ok?: boolean };

  const atsStore = new SqliteAtsStore({ filePath: sqlite.paths.ats });
  const outputStore = new JsonFileAfalOutputStore({ filePath: sqlite.paths.afalOutputs });
  const budget = await atsStore.getMonetaryBudget(paymentFlowFixtures.monetaryBudgetInitial.budgetId);
  const receipt = await outputStore.getReceipt(paymentFlowFixtures.paymentReceipt.receiptId);

  assertDemo(response.statusCode === 200, "payment HTTP response was not 200");
  assertDemo(responseBody.ok === true, "payment HTTP response did not return ok=true");
  assertDemo(
    budget?.consumedAmount === paymentFlowFixtures.monetaryBudgetFinal.consumedAmount,
    "SQLite ATS budget state was not updated"
  );
  assertDemo(
    receipt?.receiptId === paymentFlowFixtures.paymentReceipt.receiptId,
    "AFAL receipt was not written"
  );

  return {
    summary: {
      dataDir,
      request: {
        method: "POST",
        path: AFAL_HTTP_ROUTES.executePayment,
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
      response: {
        statusCode: response.statusCode,
        ok: responseBody.ok === true,
        capability: "executePayment",
      },
      persisted: {
        budgetId: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        consumedAmount: budget?.consumedAmount,
        receiptId: receipt?.receiptId,
      },
    },
    responseBody,
  };
}

async function main(): Promise<void> {
  const dataDir =
    process.argv[2] ??
    process.env.AFAL_SQLITE_HTTP_DATA_DIR ??
    mkdtempSync(join(tmpdir(), "afal-sqlite-http-demo-"));
  const result = await runSeededSqliteHttpPaymentDemo(dataDir);
  console.log(JSON.stringify(result.summary, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
