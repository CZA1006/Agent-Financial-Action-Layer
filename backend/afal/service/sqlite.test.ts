import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { SqliteAmnStore } from "../../amn";
import { SqliteAtsStore } from "../../ats";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { JsonFileAfalSettlementStore } from "../settlement/file-store";
import { SqliteAfalIntentStore } from "../state";
import { createSeededSqliteAfalBundle, getSeededSqliteAfalPaths } from "./sqlite";

test("seeded SQLite AFAL runtime persists ATS and AFAL intent state across restarts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-sqlite-runtime-"));

  try {
    const first = createSeededSqliteAfalBundle(dir);

    await first.runtime.executePayment({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });
    await first.runtime.settleResourceUsage({
      capability: "settleResourceUsage",
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intent: resourceFlowFixtures.resourceIntentCreated,
        resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
        resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    const second = createSeededSqliteAfalBundle(dir);
    const paths = getSeededSqliteAfalPaths(dir);

    const atsStore = new SqliteAtsStore({ filePath: paths.ats });
    const amnStore = new SqliteAmnStore({ filePath: paths.amn });
    const intentStore = new SqliteAfalIntentStore({ filePath: paths.afalIntents });
    const settlementStore = new JsonFileAfalSettlementStore({ filePath: paths.afalSettlement });
    const outputStore = new JsonFileAfalOutputStore({ filePath: paths.afalOutputs });

    const paymentBudget = await atsStore.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const approvalSessions = await amnStore.listApprovalSessions();
    const paymentIntent = await intentStore.getPaymentIntent(
      paymentFlowFixtures.paymentIntentCreated.intentId
    );
    const resourceIntent = await intentStore.getResourceIntent(
      resourceFlowFixtures.resourceIntentCreated.intentId
    );
    const paymentSettlement = await settlementStore.getSettlement(
      paymentFlowFixtures.settlementRecord.settlementId
    );
    const paymentReceipt = await outputStore.getReceipt(
      paymentFlowFixtures.paymentReceipt.receiptId
    );

    assert.equal(second.runtime.ports, second.ports);
    assert.equal(paths.integrationDb, paths.ats);
    assert.equal(paths.integrationDb, paths.amn);
    assert.equal(paths.integrationDb, paths.afalIntents);
    assert.equal(paths.integrationDb, paths.afalAdminAudit);
    assert.equal(paths.integrationDb, paths.afalNotificationOutbox);
    assert.equal(
      paymentBudget?.consumedAmount,
      paymentFlowFixtures.monetaryBudgetFinal.consumedAmount
    );
    assert.equal(approvalSessions.length, 2);
    assert.ok(approvalSessions.every((session) => session.status === "finalized"));
    assert.equal(paymentIntent?.status, "settled");
    assert.equal(resourceIntent?.status, "settled");
    assert.equal(
      paymentSettlement?.settlementId,
      paymentFlowFixtures.settlementRecord.settlementId
    );
    assert.equal(paymentReceipt?.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
