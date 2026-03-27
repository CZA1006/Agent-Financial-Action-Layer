import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { type AgentHarnessClient } from "./http-client";
import { runApprovalAgent, type ApprovalAgentResult } from "./approval-agent";
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
  startTrustedSurfaceStubServer,
  type RunningTrustedSurfaceStubServer,
} from "../../app/trusted-surface/server";
import {
  HttpSettlementNotificationPort,
  SqliteSettlementNotificationOutboxStore,
} from "../../backend/afal/notifications";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { getSeededSqliteAfalPaths } from "../../backend/afal/service";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

export interface BilateralPaymentHarnessResult {
  summary: {
    baseUrl: string;
    trustedSurfaceUrl?: string;
    payerAgentId: string;
    approvalAgentId: string;
    payeeAgentId: string;
    approvalSessionRef: string;
    actionRef: string;
    finalIntentStatus?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  payer: PayerAgentResult;
  approval: ApprovalAgentResult;
  payee: PayeeCallbackAgentResult;
}

export async function runBilateralPaymentHarness(
  client: AgentHarnessClient,
  options?: {
    payerRequestRef?: string;
    payeeRequestRef?: string;
  }
): Promise<BilateralPaymentHarnessResult> {
  const payeeAgent = await startPayeeCallbackAgent();

  try {
    const payer = await runPayerPaymentAgent(client, {
      requestRef: options?.payerRequestRef,
    });
    const approval = await runApprovalAgent(client, {
      approvalSessionRef: payer.summary.approvalSessionRef,
    });
    const payee = await payeeAgent.waitForNotification();

    return {
      summary: {
        baseUrl: "in-process",
        payerAgentId: payer.summary.agentId,
        approvalAgentId: approval.summary.agentId,
        payeeAgentId: payee.summary.agentId,
        approvalSessionRef: payer.summary.approvalSessionRef,
        actionRef: payer.summary.actionRef,
        finalIntentStatus: payee.summary.intentStatus,
        settlementRef: payee.summary.settlementRef,
        receiptRef: payee.summary.receiptRef,
      },
      payer,
      approval,
      payee,
    };
  } finally {
    await payeeAgent.close();
  }
}

async function runJsonProcess(args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Agent subprocess exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`
          )
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(
          new Error(
            `Agent subprocess did not return valid JSON: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  });
}

export async function runSpawnedBilateralPaymentHarness(args?: {
  baseUrl?: string;
  trustedSurfaceUrl?: string;
  dataDir?: string;
  host?: string;
  port?: number;
  trustedSurfaceHost?: string;
  trustedSurfacePort?: number;
  payeeFailFirstAttempts?: number;
  notificationWorkerIntervalMs?: number;
}): Promise<BilateralPaymentHarnessResult> {
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let trustedSurface: RunningTrustedSurfaceStubServer | undefined;
  let tempDataDir: string | undefined;
  let payeeAgent:
    | Awaited<ReturnType<typeof startPayeeCallbackAgent>>
    | undefined;

  try {
    payeeAgent = await startPayeeCallbackAgent({
      failFirstAttempts: args?.payeeFailFirstAttempts,
    });

    if (!args?.baseUrl) {
      if (!args?.dataDir) {
        tempDataDir = await mkdtemp(join(tmpdir(), "afal-agent-payment-bilateral-"));
      }

      server = await startSeededSqliteAfalHttpServer({
        dataDir: args?.dataDir ?? tempDataDir,
        host: args?.host,
        port: args?.port,
        notifications: new HttpSettlementNotificationPort({
          paymentCallbackUrls: {
            [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]: payeeAgent.callbackUrl,
          },
          outboxStore: new SqliteSettlementNotificationOutboxStore({
            filePath: getSeededSqliteAfalPaths(
              args?.dataDir ?? tempDataDir ?? process.cwd()
            ).afalNotificationOutbox,
          }),
        }),
        notificationWorker: {
          intervalMs: args?.notificationWorkerIntervalMs,
        },
      });
    }

    const baseUrl = args?.baseUrl ?? server?.url;
    if (!baseUrl) {
      throw new Error("payment bilateral harness requires either baseUrl or a startable local server");
    }

    trustedSurface =
      args?.trustedSurfaceUrl
        ? undefined
        : await startTrustedSurfaceStubServer({
            afalBaseUrl: baseUrl,
            host: args?.trustedSurfaceHost,
            port: args?.trustedSurfacePort ?? 0,
          });
    const trustedSurfaceUrl = args?.trustedSurfaceUrl ?? trustedSurface?.url;

    const payer = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "payer-agent.ts"),
      "--base-url",
      baseUrl,
    ])) as PayerAgentResult;

    const approval = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "approval-agent.ts"),
      "--approval-session-ref",
      payer.summary.approvalSessionRef,
      ...(trustedSurfaceUrl
        ? ["--trusted-surface-url", trustedSurfaceUrl]
        : ["--base-url", baseUrl]),
    ])) as ApprovalAgentResult;

    const payee = await payeeAgent.waitForNotification();

    return {
      summary: {
        baseUrl,
        trustedSurfaceUrl,
        payerAgentId: payer.summary.agentId,
        approvalAgentId: approval.summary.agentId,
        payeeAgentId: payee.summary.agentId,
        approvalSessionRef: payer.summary.approvalSessionRef,
        actionRef: payer.summary.actionRef,
        finalIntentStatus: payee.summary.intentStatus,
        settlementRef: payee.summary.settlementRef,
        receiptRef: payee.summary.receiptRef,
      },
      payer,
      approval,
      payee,
    };
  } finally {
    if (trustedSurface) {
      await trustedSurface.close();
    }
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
  baseUrl?: string;
  trustedSurfaceUrl?: string;
  dataDir?: string;
  host?: string;
  port?: number;
  trustedSurfaceHost?: string;
  trustedSurfacePort?: number;
  payeeFailFirstAttempts?: number;
  notificationWorkerIntervalMs?: number;
} {
  const result: {
    baseUrl?: string;
    trustedSurfaceUrl?: string;
    dataDir?: string;
    host?: string;
    port?: number;
    trustedSurfaceHost?: string;
    trustedSurfacePort?: number;
    payeeFailFirstAttempts?: number;
    notificationWorkerIntervalMs?: number;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      result.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--data-dir") {
      result.dataDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--trusted-surface-url") {
      result.trustedSurfaceUrl = argv[index + 1];
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
    if (arg === "--trusted-surface-host") {
      result.trustedSurfaceHost = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--trusted-surface-port") {
      const raw = argv[index + 1];
      result.trustedSurfacePort = raw ? Number(raw) : undefined;
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
  const result = await runSpawnedBilateralPaymentHarness(args);
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
