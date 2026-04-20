import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ExternalAgentClientService,
  SqliteExternalAgentClientStore,
} from "../../backend/afal/clients";
import { startProviderServiceStubServer, type RunningProviderServiceStubServer } from "../../app/provider-service/server";
import {
  startSeededSqliteAfalHttpServer,
  type RunningSeededSqliteAfalHttpServer,
} from "../../backend/afal/http/sqlite-server";
import { getSeededSqliteAfalPaths } from "../../backend/afal/service/sqlite";
import { HttpResourceProviderAdapter } from "../../backend/afal/settlement/http-adapters";
import {
  startTrustedSurfaceStubServer,
  type RunningTrustedSurfaceStubServer,
} from "../../app/trusted-surface/server";
import { resourceFlowFixtures } from "../../sdk/fixtures";
import { runApprovalAgentViaTrustedSurfaceService } from "./approval-agent";
import { writePilotArtifacts } from "./artifacts";
import { createAfalHttpClient } from "./http-client";
import { loadEnvFileIntoProcess, requestOpenRouterResourceDecision } from "./openrouter";

const PROVIDER_SERVICE_TOKEN = "provider-service-secret";
const AFAL_EXTERNAL_SERVICE_ID = "afal-runtime";
const PROVIDER_SERVICE_SIGNING_KEY = "provider-service-signing-secret";

export interface OpenRouterResourcePilotResult {
  summary: {
    stage: "external-agent-openrouter-resource-pilot";
    dataDir: string;
    baseUrl: string;
    trustedSurfaceUrl: string;
    integrationDb: string;
    model: string;
    clientId: string;
    subjectDid: string;
    requestRef: string;
    llmDecision: "request_resource_approval" | "abort";
    approvalResult?: "approved" | "rejected" | "expired" | "cancelled";
    finalIntentStatus?: string;
    usageReceiptRef?: string;
    settlementRef?: string;
    receiptRef?: string;
    providerUsageAttempts?: number;
    providerSettlementAttempts?: number;
  };
  auth: {
    clientId: string;
    requiredHeaders: string[];
  };
  llm: {
    rawContent: string;
    rationale: string;
  };
  resource?: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["requestResourceApproval"]>>;
  approval?: Awaited<
    ReturnType<typeof runApprovalAgentViaTrustedSurfaceService>
  >;
  actionStatus?: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["getActionStatus"]>>;
}

function readOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function createRequestRef(): string {
  return `req-openrouter-resource-${Date.now()}`;
}

export async function runOpenRouterResourcePilot(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
  trustedSurfaceHost?: string;
  trustedSurfacePort?: number;
  envFile?: string;
  model?: string;
  approvalResult?: "approved" | "rejected" | "expired" | "cancelled";
  confirmUsageFailuresBeforeSuccess?: number;
  settleResourceUsageFailuresBeforeSuccess?: number;
  artifactsDir?: string;
}): Promise<OpenRouterResourcePilotResult> {
  await loadEnvFileIntoProcess(args?.envFile);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY must be set in the environment or .env");
  }

  const model = args?.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";
  let tempDataDir: string | undefined;
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let trustedSurface: RunningTrustedSurfaceStubServer | undefined;
  let providerService: RunningProviderServiceStubServer | undefined;

  try {
    const dataDir = args?.dataDir
      ? resolve(args.dataDir)
      : await mkdtemp(join(tmpdir(), "afal-openrouter-resource-pilot-"));
    if (!args?.dataDir) {
      tempDataDir = dataDir;
    }

    if (
      (args?.confirmUsageFailuresBeforeSuccess ?? 0) > 0 ||
      (args?.settleResourceUsageFailuresBeforeSuccess ?? 0) > 0
    ) {
      providerService = await startProviderServiceStubServer({
        port: 0,
        failurePlan: {
          confirmUsageFailuresBeforeSuccess: args?.confirmUsageFailuresBeforeSuccess,
          settleResourceUsageFailuresBeforeSuccess: args?.settleResourceUsageFailuresBeforeSuccess,
        },
        auth: {
          token: PROVIDER_SERVICE_TOKEN,
          signingKey: PROVIDER_SERVICE_SIGNING_KEY,
        },
      });
    }

    server = await startSeededSqliteAfalHttpServer({
      dataDir,
      host: args?.host,
      port: args?.port ?? 0,
      externalClientAuth: {
        enabled: true,
      },
      resourceAdapter: providerService
        ? new HttpResourceProviderAdapter({
            baseUrl: providerService.url,
            retry: {
              maxAttempts: 3,
              backoffMs: 0,
            },
            auth: {
              token: PROVIDER_SERVICE_TOKEN,
              serviceId: AFAL_EXTERNAL_SERVICE_ID,
              signingKey: PROVIDER_SERVICE_SIGNING_KEY,
            },
          })
        : undefined,
    });
    trustedSurface = await startTrustedSurfaceStubServer({
      afalBaseUrl: server.url,
      host: args?.trustedSurfaceHost,
      port: args?.trustedSurfacePort ?? 0,
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

    const provisionedClient = await externalClientService.provisionClient({
      clientId: "ext-agent-openrouter-resource-01",
      tenantId: "tenant-sandbox-openrouter-01",
      agentId: "openrouter-resource-agent-01",
      subjectDid: resourceFlowFixtures.resourceIntentCreated.requester.agentDid,
      mandateRefs: [resourceFlowFixtures.resourceMandate.mandateId],
      resourceBudgetRefs: [resourceFlowFixtures.resourceBudgetInitial.budgetId],
      resourceQuotaRefs: [resourceFlowFixtures.resourceQuotaInitial.quotaId],
      resourceProviderDid: resourceFlowFixtures.resourceIntentCreated.provider.providerDid,
    });

    const requestRef = createRequestRef();
    const llm = await requestOpenRouterResourceDecision({
      apiKey,
      model,
      title: "AFAL OpenRouter Resource Pilot",
      referer: "https://github.com/CZA1006/Agent-Financial-Action-Layer",
    });

    if (llm.decision.decision === "abort") {
      const result: OpenRouterResourcePilotResult = {
        summary: {
          stage: "external-agent-openrouter-resource-pilot",
          dataDir,
          baseUrl: server.url,
          trustedSurfaceUrl: trustedSurface.url,
          integrationDb: getSeededSqliteAfalPaths(dataDir).integrationDb,
          model,
          clientId: provisionedClient.clientId,
          subjectDid: provisionedClient.subjectDid,
          requestRef,
          llmDecision: llm.decision.decision,
          approvalResult: args?.approvalResult ?? "approved",
        },
        auth: {
          clientId: provisionedClient.clientId,
          requiredHeaders: [
            "x-afal-client-id",
            "x-afal-request-timestamp",
            "x-afal-request-signature",
          ],
        },
        llm: {
          rawContent: llm.rawContent,
          rationale: llm.decision.rationale,
        },
      };
      await writePilotArtifacts(args?.artifactsDir, {
        result,
        summary: result.summary,
        auth: result.auth,
        llm: result.llm,
      });
      return result;
    }

    const client = createAfalHttpClient(server.url, {
      externalClientAuth: {
        clientId: provisionedClient.clientId,
        signingKey: provisionedClient.auth.signingKey,
      },
    });

    const resource = await client.requestResourceApproval({
      requestRef,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    });

    const approval = await runApprovalAgentViaTrustedSurfaceService(trustedSurface.url, {
      approvalSessionRef: resource.approvalSession.approvalSessionId,
      requestRefPrefix: "req-openrouter-resource-approval",
      result: args?.approvalResult ?? "approved",
      comment:
        args?.approvalResult && args.approvalResult !== "approved"
          ? "Rejected via OpenRouter resource pilot"
          : "Approved via OpenRouter resource pilot",
      resumeAction: (args?.approvalResult ?? "approved") === "approved",
    });

    const actionStatus = await client.getActionStatus({
      requestRef: `${requestRef}-status`,
      actionRef: resource.intent.intentId,
    });

    const result: OpenRouterResourcePilotResult = {
      summary: {
        stage: "external-agent-openrouter-resource-pilot",
        dataDir,
        baseUrl: server.url,
        trustedSurfaceUrl: trustedSurface.url,
        integrationDb: getSeededSqliteAfalPaths(dataDir).integrationDb,
        model,
        clientId: provisionedClient.clientId,
        subjectDid: provisionedClient.subjectDid,
        requestRef,
        llmDecision: llm.decision.decision,
        approvalResult: args?.approvalResult ?? "approved",
        finalIntentStatus: actionStatus.intent.status,
        usageReceiptRef:
          actionStatus.actionType === "resource"
            ? actionStatus.usageConfirmation?.usageReceiptRef
            : undefined,
        settlementRef: actionStatus.intent.settlementRef,
        receiptRef:
          actionStatus.actionType === "resource"
            ? actionStatus.resourceReceipt?.receiptId
            : undefined,
        providerUsageAttempts: providerService?.state.confirmUsageAttempts,
        providerSettlementAttempts: providerService?.state.settleResourceUsageAttempts,
      },
      auth: {
        clientId: provisionedClient.clientId,
        requiredHeaders: [
          "x-afal-client-id",
          "x-afal-request-timestamp",
          "x-afal-request-signature",
        ],
      },
      llm: {
        rawContent: llm.rawContent,
        rationale: llm.decision.rationale,
      },
      resource,
      approval,
      actionStatus,
    };
    await writePilotArtifacts(args?.artifactsDir, {
      result,
      summary: result.summary,
      auth: result.auth,
      llm: result.llm,
      resource,
      approval,
      actionStatus,
    });
    return result;
  } finally {
    if (providerService) {
      await providerService.close();
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
  const result = await runOpenRouterResourcePilot({
    dataDir: readOption(argv, "--data-dir"),
    host: readOption(argv, "--host"),
    port: readOption(argv, "--port") ? Number(readOption(argv, "--port")) : undefined,
    trustedSurfaceHost: readOption(argv, "--trusted-surface-host"),
    trustedSurfacePort: readOption(argv, "--trusted-surface-port")
      ? Number(readOption(argv, "--trusted-surface-port"))
      : undefined,
    envFile: readOption(argv, "--env-file"),
    model: readOption(argv, "--model"),
    approvalResult: (readOption(argv, "--approval-result") as
      | "approved"
      | "rejected"
      | "expired"
      | "cancelled"
      | undefined) ?? undefined,
    confirmUsageFailuresBeforeSuccess: readOption(argv, "--confirm-usage-failures-before-success")
      ? Number(readOption(argv, "--confirm-usage-failures-before-success"))
      : undefined,
    settleResourceUsageFailuresBeforeSuccess: readOption(
      argv,
      "--settle-resource-usage-failures-before-success"
    )
      ? Number(readOption(argv, "--settle-resource-usage-failures-before-success"))
      : undefined,
    artifactsDir: readOption(argv, "--artifacts-dir"),
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
