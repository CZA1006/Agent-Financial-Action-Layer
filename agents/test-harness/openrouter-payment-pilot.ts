import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ExternalAgentClientService,
  SqliteExternalAgentClientStore,
} from "../../backend/afal/clients";
import {
  startSeededSqliteAfalHttpServer,
  type RunningSeededSqliteAfalHttpServer,
} from "../../backend/afal/http/sqlite-server";
import { getSeededSqliteAfalPaths } from "../../backend/afal/service/sqlite";
import {
  startTrustedSurfaceStubServer,
  type RunningTrustedSurfaceStubServer,
} from "../../app/trusted-surface/server";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { runApprovalAgentViaTrustedSurfaceService } from "./approval-agent";
import { createAfalHttpClient } from "./http-client";
import { loadEnvFileIntoProcess, requestOpenRouterPaymentDecision } from "./openrouter";

export interface OpenRouterPaymentPilotResult {
  summary: {
    stage: "external-agent-openrouter-payment-pilot";
    dataDir: string;
    baseUrl: string;
    trustedSurfaceUrl: string;
    integrationDb: string;
    model: string;
    clientId: string;
    subjectDid: string;
    requestRef: string;
    llmDecision: "request_payment_approval" | "abort";
    finalIntentStatus?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  auth: {
    clientId: string;
    requiredHeaders: string[];
  };
  llm: {
    rawContent: string;
    rationale: string;
  };
  payment?: Awaited<ReturnType<ReturnType<typeof createAfalHttpClient>["requestPaymentApproval"]>>;
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
  return `req-openrouter-${Date.now()}`;
}

export async function runOpenRouterPaymentPilot(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
  trustedSurfaceHost?: string;
  trustedSurfacePort?: number;
  envFile?: string;
  model?: string;
}): Promise<OpenRouterPaymentPilotResult> {
  await loadEnvFileIntoProcess(args?.envFile);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY must be set in the environment or .env");
  }

  const model = args?.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini";
  let tempDataDir: string | undefined;
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let trustedSurface: RunningTrustedSurfaceStubServer | undefined;

  try {
    const dataDir = args?.dataDir
      ? resolve(args.dataDir)
      : await mkdtemp(join(tmpdir(), "afal-openrouter-payment-pilot-"));
    if (!args?.dataDir) {
      tempDataDir = dataDir;
    }

    server = await startSeededSqliteAfalHttpServer({
      dataDir,
      host: args?.host,
      port: args?.port ?? 0,
      externalClientAuth: {
        enabled: true,
      },
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
      clientId: "ext-agent-openrouter-payment-01",
      tenantId: "tenant-sandbox-openrouter-01",
      agentId: "openrouter-payment-agent-01",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRefs: [paymentFlowFixtures.paymentMandate.mandateId],
      monetaryBudgetRefs: [paymentFlowFixtures.monetaryBudgetInitial.budgetId],
      paymentPayeeDid: paymentFlowFixtures.paymentIntentCreated.payee.payeeDid,
    });

    const requestRef = createRequestRef();
    const llm = await requestOpenRouterPaymentDecision({
      apiKey,
      model,
      title: "AFAL OpenRouter Payment Pilot",
      referer: "https://github.com/CZA1006/Agent-Financial-Action-Layer",
    });

    if (llm.decision.decision === "abort") {
      return {
        summary: {
          stage: "external-agent-openrouter-payment-pilot",
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
    });

    const payment = await client.requestPaymentApproval({
      requestRef,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    });

    const approval = await runApprovalAgentViaTrustedSurfaceService(trustedSurface.url, {
      approvalSessionRef: payment.approvalSession.approvalSessionId,
      requestRefPrefix: "req-openrouter-approval",
    });

    const actionStatus = await client.getActionStatus({
      requestRef: `${requestRef}-status`,
      actionRef: payment.intent.intentId,
    });

    return {
      summary: {
        stage: "external-agent-openrouter-payment-pilot",
        dataDir,
        baseUrl: server.url,
        trustedSurfaceUrl: trustedSurface.url,
        integrationDb: getSeededSqliteAfalPaths(dataDir).integrationDb,
        model,
        clientId: provisionedClient.clientId,
        subjectDid: provisionedClient.subjectDid,
        requestRef,
        llmDecision: llm.decision.decision,
        finalIntentStatus: actionStatus.intent.status,
        settlementRef: actionStatus.intent.settlementRef,
        receiptRef:
          actionStatus.actionType === "payment"
            ? actionStatus.paymentReceipt?.receiptId
            : undefined,
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
      payment,
      approval,
      actionStatus,
    };
  } finally {
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
  const result = await runOpenRouterPaymentPilot({
    dataDir: readOption(argv, "--data-dir"),
    host: readOption(argv, "--host"),
    port: readOption(argv, "--port") ? Number(readOption(argv, "--port")) : undefined,
    trustedSurfaceHost: readOption(argv, "--trusted-surface-host"),
    trustedSurfacePort: readOption(argv, "--trusted-surface-port")
      ? Number(readOption(argv, "--trusted-surface-port"))
      : undefined,
    envFile: readOption(argv, "--env-file"),
    model: readOption(argv, "--model"),
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
