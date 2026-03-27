import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { runApprovalAgent, type ApprovalAgentResult } from "./approval-agent";
import { createAfalHttpClient } from "./http-client";
import {
  startPayeeCallbackAgent,
  type PayeeCallbackAgentResult,
} from "./payee-callback-agent";
import { runPayerPaymentAgent, type PayerAgentResult } from "./payer-agent";
import {
  startSeededSqliteAfalHttpServer,
  type RunningSeededSqliteAfalHttpServer,
} from "../../backend/afal/http/sqlite-server";
import {
  HttpSettlementNotificationPort,
  SqliteSettlementNotificationOutboxStore,
} from "../../backend/afal/notifications";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { getSeededSqliteAfalPaths } from "../../backend/afal/service";

const DEFAULT_OPERATOR_TOKEN = "operator-secret";

export interface NotificationAdminDemoResult {
  summary: {
    baseUrl: string;
    operatorTokenHeader: string;
    operatorTokenValue: string;
    notificationId: string;
    failedStatusBeforeWorker: string;
    finalStatusAfterWorker: string;
    redelivered: number;
    payeeAgentId: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  payer: PayerAgentResult;
  approval: ApprovalAgentResult;
  payee: PayeeCallbackAgentResult;
  deliveryBeforeWorker: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["getNotificationDelivery"]>>;
  workerStatusBefore: Awaited<
    ReturnType<ReturnType<typeof createAfalHttpClient>["getNotificationWorkerStatus"]>
  >;
  workerRun: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["runNotificationWorker"]>>;
  deliveryAfterWorker: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["getNotificationDelivery"]>>;
  audit: {
    listed: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["listAdminAuditEntries"]>>;
    workerRunEntry: Awaited<
      ReturnType<ReturnType<typeof createAfalHttpClient>["getAdminAuditEntry"]>
    >;
  };
}

export async function runNotificationAdminDemo(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
  operatorToken?: string;
  payeeFailFirstAttempts?: number;
  notificationWorkerIntervalMs?: number;
}): Promise<NotificationAdminDemoResult> {
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let tempDataDir: string | undefined;
  let payeeAgent:
    | Awaited<ReturnType<typeof startPayeeCallbackAgent>>
    | undefined;

  try {
    payeeAgent = await startPayeeCallbackAgent({
      failFirstAttempts: args?.payeeFailFirstAttempts ?? 1,
    });

    if (!args?.dataDir) {
      tempDataDir = await mkdtemp(join(tmpdir(), "afal-notification-admin-demo-"));
    }

    const operatorToken = args?.operatorToken ?? DEFAULT_OPERATOR_TOKEN;
    const dataDir = args?.dataDir ?? tempDataDir;
    if (!dataDir) {
      throw new Error("notification admin demo requires a dataDir");
    }

    server = await startSeededSqliteAfalHttpServer({
      dataDir,
      host: args?.host,
      port: args?.port,
      notifications: new HttpSettlementNotificationPort({
        paymentCallbackUrls: {
          [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: payeeAgent.callbackUrl,
        },
        redeliveryBaseDelayMs: 0,
        outboxStore: new SqliteSettlementNotificationOutboxStore({
          filePath: getSeededSqliteAfalPaths(dataDir).afalNotificationOutbox,
        }),
      }),
      notificationWorker: {
        intervalMs: args?.notificationWorkerIntervalMs,
        start: false,
      },
      operatorAuth: {
        token: operatorToken,
      },
    });

    const client = createAfalHttpClient(server.url, {
      operatorToken,
    });

    const payer = await runPayerPaymentAgent(client, {
      requestRef: "req-demo-payment-approval-001",
    });
    const approval = await runApprovalAgent(client, {
      approvalSessionRef: payer.summary.approvalSessionRef,
      requestRefPrefix: "req-demo-payment-approval",
    });

    const notificationId = `notif-${payer.summary.actionRef}`;
    const deliveryBeforeWorker = await client.getNotificationDelivery({
      requestRef: "req-demo-notification-delivery-get-001",
      notificationId,
    });
    const workerStatusBefore = await client.getNotificationWorkerStatus({
      requestRef: "req-demo-notification-worker-status-001",
    });
    const workerRun = await client.runNotificationWorker({
      requestRef: "req-demo-notification-worker-run-001",
    });
    const payee = await payeeAgent.waitForNotification();
    const deliveryAfterWorker = await client.getNotificationDelivery({
      requestRef: "req-demo-notification-delivery-get-002",
      notificationId,
    });
    const listed = await client.listAdminAuditEntries({
      requestRef: "req-demo-admin-audit-list-001",
    });
    const workerRunEntry = await client.getAdminAuditEntry({
      requestRef: "req-demo-admin-audit-get-001",
      auditId: "admin-audit-req-demo-notification-worker-run-001",
    });

    return {
      summary: {
        baseUrl: server.url,
        operatorTokenHeader: "x-afal-operator-token",
        operatorTokenValue: operatorToken,
        notificationId,
        failedStatusBeforeWorker: deliveryBeforeWorker.status,
        finalStatusAfterWorker: deliveryAfterWorker.status,
        redelivered: workerRun.redelivered,
        payeeAgentId: payee.summary.agentId,
        settlementRef: payee.summary.settlementRef,
        receiptRef: payee.summary.receiptRef,
      },
      payer,
      approval,
      payee,
      deliveryBeforeWorker,
      workerStatusBefore,
      workerRun,
      deliveryAfterWorker,
      audit: {
        listed,
        workerRunEntry,
      },
    };
  } finally {
    if (server) {
      await server.close();
    }
    if (payeeAgent) {
      await payeeAgent.close();
    }
    if (tempDataDir) {
      await rm(tempDataDir, { recursive: true, force: true });
    }
  }
}

function parseArgs(argv: string[]): {
  dataDir?: string;
  host?: string;
  port?: number;
  operatorToken?: string;
  payeeFailFirstAttempts?: number;
  notificationWorkerIntervalMs?: number;
} {
  const result: {
    dataDir?: string;
    host?: string;
    port?: number;
    operatorToken?: string;
    payeeFailFirstAttempts?: number;
    notificationWorkerIntervalMs?: number;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--data-dir") {
      result.dataDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--host") {
      result.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--port") {
      const raw = argv[index + 1];
      result.port = raw ? Number(raw) : undefined;
      index += 1;
      continue;
    }
    if (arg === "--operator-token") {
      result.operatorToken = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--payee-fail-first-attempts") {
      const raw = argv[index + 1];
      result.payeeFailFirstAttempts = raw ? Number(raw) : undefined;
      index += 1;
      continue;
    }
    if (arg === "--notification-worker-interval-ms") {
      const raw = argv[index + 1];
      result.notificationWorkerIntervalMs = raw ? Number(raw) : undefined;
      index += 1;
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runNotificationAdminDemo(args);
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
