import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { type AgentHarnessClient } from "./http-client";
import { runApprovalAgent, type ApprovalAgentResult } from "./approval-agent";
import {
  startProviderCallbackAgent,
  type ProviderCallbackAgentResult,
} from "./provider-callback-agent";
import {
  runResourceRequesterAgent,
  type ResourceRequesterAgentResult,
} from "./resource-requester-agent";
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
import { resourceFlowFixtures } from "../../sdk/fixtures";
import { getSeededSqliteAfalPaths } from "../../backend/afal/service";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

export interface BilateralResourceHarnessResult {
  summary: {
    baseUrl: string;
    trustedSurfaceUrl?: string;
    requesterAgentId: string;
    approvalAgentId: string;
    providerAgentId: string;
    approvalSessionRef: string;
    actionRef: string;
    finalIntentStatus?: string;
    usageReceiptRef?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  requester: ResourceRequesterAgentResult;
  approval: ApprovalAgentResult;
  provider: ProviderCallbackAgentResult;
}

export async function runBilateralResourceHarness(
  client: AgentHarnessClient,
  options?: {
    requesterRequestRef?: string;
    providerRequestRef?: string;
  }
): Promise<BilateralResourceHarnessResult> {
  const providerAgent = await startProviderCallbackAgent();

  try {
    const requester = await runResourceRequesterAgent(client, {
      requestRef: options?.requesterRequestRef,
    });
    const approval = await runApprovalAgent(client, {
      approvalSessionRef: requester.summary.approvalSessionRef,
      requestRefPrefix: "req-agent-resource-approval",
    });
    const provider = await providerAgent.waitForNotification();

    return {
      summary: {
        baseUrl: "in-process",
        requesterAgentId: requester.summary.agentId,
        approvalAgentId: approval.summary.agentId,
        providerAgentId: provider.summary.agentId,
        approvalSessionRef: requester.summary.approvalSessionRef,
        actionRef: requester.summary.actionRef,
        finalIntentStatus: provider.summary.intentStatus,
        usageReceiptRef: provider.summary.usageReceiptRef,
        settlementRef: provider.summary.settlementRef,
        receiptRef: provider.summary.receiptRef,
      },
      requester,
      approval,
      provider,
    };
  } finally {
    await providerAgent.close();
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

export async function runSpawnedBilateralResourceHarness(args?: {
  baseUrl?: string;
  trustedSurfaceUrl?: string;
  dataDir?: string;
  host?: string;
  port?: number;
  trustedSurfaceHost?: string;
  trustedSurfacePort?: number;
  providerFailFirstAttempts?: number;
  notificationWorkerIntervalMs?: number;
}): Promise<BilateralResourceHarnessResult> {
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let trustedSurface: RunningTrustedSurfaceStubServer | undefined;
  let tempDataDir: string | undefined;
  let providerAgent:
    | Awaited<ReturnType<typeof startProviderCallbackAgent>>
    | undefined;

  try {
    providerAgent = await startProviderCallbackAgent({
      failFirstAttempts: args?.providerFailFirstAttempts,
    });

    if (!args?.baseUrl) {
      if (!args?.dataDir) {
        tempDataDir = await mkdtemp(join(tmpdir(), "afal-agent-resource-bilateral-"));
      }

      server = await startSeededSqliteAfalHttpServer({
        dataDir: args?.dataDir ?? tempDataDir,
        host: args?.host,
        port: args?.port,
        notifications: new HttpSettlementNotificationPort({
          resourceCallbackUrls: {
            [resourceFlowFixtures.resourceIntentCreated.provider.providerDid]:
              providerAgent.callbackUrl,
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
      throw new Error("resource bilateral harness requires either baseUrl or a startable local server");
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

    const requester = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "resource-requester-agent.ts"),
      "--base-url",
      baseUrl,
    ])) as ResourceRequesterAgentResult;

    const approval = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "approval-agent.ts"),
      "--approval-session-ref",
      requester.summary.approvalSessionRef,
      ...(trustedSurfaceUrl
        ? ["--trusted-surface-url", trustedSurfaceUrl]
        : ["--base-url", baseUrl]),
    ])) as ApprovalAgentResult;

    const provider = await providerAgent.waitForNotification();

    return {
      summary: {
        baseUrl,
        trustedSurfaceUrl,
        requesterAgentId: requester.summary.agentId,
        approvalAgentId: approval.summary.agentId,
        providerAgentId: provider.summary.agentId,
        approvalSessionRef: requester.summary.approvalSessionRef,
        actionRef: requester.summary.actionRef,
        finalIntentStatus: provider.summary.intentStatus,
        usageReceiptRef: provider.summary.usageReceiptRef,
        settlementRef: provider.summary.settlementRef,
        receiptRef: provider.summary.receiptRef,
      },
      requester,
      approval,
      provider,
    };
  } finally {
    if (trustedSurface) {
      await trustedSurface.close();
    }
    if (server) {
      await server.close();
    }
    if (providerAgent) {
      await providerAgent.close();
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
  providerFailFirstAttempts?: number;
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
    providerFailFirstAttempts?: number;
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
    if (arg === "--provider-fail-first-attempts") {
      const raw = argv[index + 1];
      result.providerFailFirstAttempts = raw ? Number(raw) : undefined;
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
  const result = await runSpawnedBilateralResourceHarness(args);
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
