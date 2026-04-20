import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ExternalAgentClientService,
  SqliteExternalAgentClientStore,
} from "../../backend/afal/clients";
import {
  HttpSettlementNotificationPort,
  SqliteSettlementNotificationOutboxStore,
} from "../../backend/afal/notifications";
import {
  startSeededSqliteAfalHttpServer,
  type RunningSeededSqliteAfalHttpServer,
} from "../../backend/afal/http/sqlite-server";
import { getSeededSqliteAfalPaths } from "../../backend/afal/service/sqlite";
import {
  startTrustedSurfaceStubServer,
  type RunningTrustedSurfaceStubServer,
} from "../../app/trusted-surface/server";
import { resourceFlowFixtures } from "../../sdk/fixtures";
import { runApprovalAgentViaTrustedSurfaceService } from "./approval-agent";
import { createAfalHttpClient } from "./http-client";
import { loadEnvFileIntoProcess, requestOpenRouterResourceDecision } from "./openrouter";
import {
  startProviderCallbackAgent,
  type ProviderCallbackAgentResult,
  type RunningProviderCallbackAgent,
} from "./provider-callback-agent";

const DEFAULT_OPERATOR_TOKEN = "operator-secret";

export interface OpenRouterResourceCallbackRecoveryPilotResult {
  summary: {
    stage: "external-agent-openrouter-resource-callback-recovery-pilot";
    dataDir: string;
    baseUrl: string;
    trustedSurfaceUrl: string;
    integrationDb: string;
    model: string;
    clientId: string;
    subjectDid: string;
    requestRef: string;
    llmDecision: "request_resource_approval" | "abort";
    notificationId?: string;
    failedStatusBeforeWorker?: string;
    finalStatusAfterWorker?: string;
    redelivered?: number;
    usageReceiptRef?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  auth: {
    clientId: string;
    requiredHeaders: string[];
    operatorHeaderName: string;
  };
  llm: {
    rawContent: string;
    rationale: string;
  };
  resource?: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["requestResourceApproval"]>>;
  approval?: Awaited<
    ReturnType<typeof runApprovalAgentViaTrustedSurfaceService>
  >;
  deliveryBeforeWorker?: Awaited<
    ReturnType<ReturnType<typeof createAfalHttpClient>["getNotificationDelivery"]>
  >;
  workerStatusBefore?: Awaited<
    ReturnType<ReturnType<typeof createAfalHttpClient>["getNotificationWorkerStatus"]>
  >;
  workerRun?: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["runNotificationWorker"]>>;
  deliveryAfterWorker?: Awaited<
    ReturnType<ReturnType<typeof createAfalHttpClient>["getNotificationDelivery"]>
  >;
  provider?: ProviderCallbackAgentResult;
}

function readOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function createRequestRef(): string {
  return `req-openrouter-resource-callback-recovery-${Date.now()}`;
}

export async function runOpenRouterResourceCallbackRecoveryPilot(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
  trustedSurfaceHost?: string;
  trustedSurfacePort?: number;
  envFile?: string;
  model?: string;
  operatorToken?: string;
  providerFailFirstAttempts?: number;
}): Promise<OpenRouterResourceCallbackRecoveryPilotResult> {
  await loadEnvFileIntoProcess(args?.envFile);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY must be set in the environment or .env");
  }

  const model = args?.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";
  const operatorToken = args?.operatorToken ?? DEFAULT_OPERATOR_TOKEN;

  let tempDataDir: string | undefined;
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let trustedSurface: RunningTrustedSurfaceStubServer | undefined;
  let providerAgent: RunningProviderCallbackAgent | undefined;

  try {
    const dataDir = args?.dataDir
      ? resolve(args.dataDir)
      : await mkdtemp(join(tmpdir(), "afal-openrouter-resource-callback-recovery-"));
    if (!args?.dataDir) {
      tempDataDir = dataDir;
    }

    providerAgent = await startProviderCallbackAgent({
      failFirstAttempts: args?.providerFailFirstAttempts ?? 1,
    });

    const externalClientService = new ExternalAgentClientService({
      store: new SqliteExternalAgentClientStore({
        filePath: getSeededSqliteAfalPaths(dataDir).afalExternalClients,
        seed: {
          clients: [],
          replayRecords: [],
        },
      }),
    });

    server = await startSeededSqliteAfalHttpServer({
      dataDir,
      host: args?.host,
      port: args?.port ?? 0,
      notifications: new HttpSettlementNotificationPort({
        callbackResolver: externalClientService,
        redeliveryBaseDelayMs: 0,
        outboxStore: new SqliteSettlementNotificationOutboxStore({
          filePath: getSeededSqliteAfalPaths(dataDir).afalNotificationOutbox,
        }),
      }),
      externalClientAuth: {
        enabled: true,
      },
      notificationWorker: {
        start: false,
      },
      operatorAuth: {
        token: operatorToken,
      },
    });
    trustedSurface = await startTrustedSurfaceStubServer({
      afalBaseUrl: server.url,
      host: args?.trustedSurfaceHost,
      port: args?.trustedSurfacePort ?? 0,
    });

    const provisionedClient = await externalClientService.provisionClient({
      clientId: "ext-agent-openrouter-resource-callback-01",
      tenantId: "tenant-sandbox-openrouter-01",
      agentId: "openrouter-resource-agent-01",
      subjectDid: resourceFlowFixtures.resourceIntentCreated.requester.agentDid,
      mandateRefs: [resourceFlowFixtures.resourceMandate.mandateId],
      resourceBudgetRefs: [resourceFlowFixtures.resourceBudgetInitial.budgetId],
      resourceQuotaRefs: [resourceFlowFixtures.resourceQuotaInitial.quotaId],
      resourceProviderDid: resourceFlowFixtures.resourceIntentCreated.provider.providerDid,
      resourceSettlementUrl: providerAgent.callbackUrl,
    });

    const requestRef = createRequestRef();
    const llm = await requestOpenRouterResourceDecision({
      apiKey,
      model,
      title: "AFAL OpenRouter Resource Callback Recovery Pilot",
      referer: "https://github.com/CZA1006/Agent-Financial-Action-Layer",
    });

    if (llm.decision.decision === "abort") {
      return {
        summary: {
          stage: "external-agent-openrouter-resource-callback-recovery-pilot",
          dataDir,
          baseUrl: server.url,
          trustedSurfaceUrl: trustedSurface.url,
          integrationDb: getSeededSqliteAfalPaths(dataDir).integrationDb,
          model,
          clientId: provisionedClient.clientId,
          subjectDid: provisionedClient.subjectDid,
          requestRef,
          llmDecision: llm.decision.decision,
        },
        auth: {
          clientId: provisionedClient.clientId,
          requiredHeaders: [
            "x-afal-client-id",
            "x-afal-request-timestamp",
            "x-afal-request-signature",
          ],
          operatorHeaderName: "x-afal-operator-token",
        },
        llm: {
          rawContent: llm.rawContent,
          rationale: llm.decision.rationale,
        },
      };
    }

    const client = createAfalHttpClient(server.url, {
      externalClientAuth: {
        clientId: provisionedClient.clientId,
        signingKey: provisionedClient.auth.signingKey,
      },
      operatorToken,
    });

    const resource = await client.requestResourceApproval({
      requestRef,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    });

    const approval = await runApprovalAgentViaTrustedSurfaceService(trustedSurface.url, {
      approvalSessionRef: resource.approvalSession.approvalSessionId,
      requestRefPrefix: "req-openrouter-resource-callback-recovery-approval",
      result: "approved",
      comment: "Approved via OpenRouter resource callback recovery pilot",
    });

    const notificationId = `notif-${resource.intent.intentId}`;
    const deliveryBeforeWorker = await client.getNotificationDelivery({
      requestRef: `${requestRef}-delivery-before`,
      notificationId,
    });
    const workerStatusBefore = await client.getNotificationWorkerStatus({
      requestRef: `${requestRef}-worker-status`,
    });
    const workerRun = await client.runNotificationWorker({
      requestRef: `${requestRef}-worker-run`,
    });
    const provider = await providerAgent.waitForNotification();
    const deliveryAfterWorker = await client.getNotificationDelivery({
      requestRef: `${requestRef}-delivery-after`,
      notificationId,
    });

    return {
      summary: {
        stage: "external-agent-openrouter-resource-callback-recovery-pilot",
        dataDir,
        baseUrl: server.url,
        trustedSurfaceUrl: trustedSurface.url,
        integrationDb: getSeededSqliteAfalPaths(dataDir).integrationDb,
        model,
        clientId: provisionedClient.clientId,
        subjectDid: provisionedClient.subjectDid,
        requestRef,
        llmDecision: llm.decision.decision,
        notificationId,
        failedStatusBeforeWorker: deliveryBeforeWorker.status,
        finalStatusAfterWorker: deliveryAfterWorker.status,
        redelivered: workerRun.redelivered,
        usageReceiptRef: provider.summary.usageReceiptRef,
        settlementRef: provider.summary.settlementRef,
        receiptRef: provider.summary.receiptRef,
      },
      auth: {
        clientId: provisionedClient.clientId,
        requiredHeaders: [
          "x-afal-client-id",
          "x-afal-request-timestamp",
          "x-afal-request-signature",
        ],
        operatorHeaderName: "x-afal-operator-token",
      },
      llm: {
        rawContent: llm.rawContent,
        rationale: llm.decision.rationale,
      },
      resource,
      approval,
      deliveryBeforeWorker,
      workerStatusBefore,
      workerRun,
      deliveryAfterWorker,
      provider,
    };
  } finally {
    if (providerAgent) {
      await providerAgent.close();
    }
    if (trustedSurface) {
      await trustedSurface.close();
    }
    if (server) {
      await server.close();
    }
    if (tempDataDir) {
      await rm(tempDataDir, { recursive: true, force: true });
    }
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const result = await runOpenRouterResourceCallbackRecoveryPilot({
    dataDir: readOption(argv, "--data-dir"),
    host: readOption(argv, "--host"),
    port: readOption(argv, "--port") ? Number(readOption(argv, "--port")) : undefined,
    trustedSurfaceHost: readOption(argv, "--trusted-surface-host"),
    trustedSurfacePort: readOption(argv, "--trusted-surface-port")
      ? Number(readOption(argv, "--trusted-surface-port"))
      : undefined,
    envFile: readOption(argv, "--env-file"),
    model: readOption(argv, "--model"),
    operatorToken: readOption(argv, "--operator-token"),
    providerFailFirstAttempts: readOption(argv, "--provider-fail-first-attempts")
      ? Number(readOption(argv, "--provider-fail-first-attempts"))
      : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
