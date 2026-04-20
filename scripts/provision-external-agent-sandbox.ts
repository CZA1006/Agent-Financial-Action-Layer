import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ExternalAgentClientService,
  SqliteExternalAgentClientStore,
} from "../backend/afal/clients";
import { getSeededSqliteAfalPaths } from "../backend/afal/service/sqlite";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function getListArg(flag: string): string[] | undefined {
  const value = getArg(flag);
  if (!value) {
    return undefined;
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function requireArg(flag: string): string {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument ${flag}`);
  }
  return value;
}

async function main(): Promise<void> {
  const dataDir = resolve(requireArg("--data-dir"));
  const outputPath = getArg("--output") ? resolve(getArg("--output")!) : undefined;
  const paths = getSeededSqliteAfalPaths(dataDir);
  const store = new SqliteExternalAgentClientStore({
    filePath: paths.afalExternalClients,
    seed: {
      clients: [],
      replayRecords: [],
    },
  });
  const service = new ExternalAgentClientService({ store });

  const client = await service.provisionClient({
    clientId: requireArg("--client-id"),
    tenantId: requireArg("--tenant-id"),
    agentId: requireArg("--agent-id"),
    subjectDid: requireArg("--subject-did"),
    mandateRefs: getListArg("--mandate-refs") ?? [requireArg("--mandate-ref")],
    monetaryBudgetRefs: getListArg("--monetary-budget-refs"),
    resourceBudgetRefs: getListArg("--resource-budget-refs"),
    resourceQuotaRefs: getListArg("--resource-quota-refs"),
    paymentPayeeDid: getArg("--payment-payee-did"),
    resourceProviderDid: getArg("--resource-provider-did"),
    paymentSettlementUrl: getArg("--payment-callback-url"),
    resourceSettlementUrl: getArg("--resource-callback-url"),
  });

  const bundle = {
    stage: "external-agent-sandbox",
    dataDir,
    integrationDb: paths.integrationDb,
    afalBaseUrl: getArg("--afal-base-url") ?? "http://127.0.0.1:3213",
    clientId: client.clientId,
    tenantId: client.tenantId,
    agentId: client.agentId,
    subjectDid: client.subjectDid,
    mandateRefs: client.mandateRefs,
    monetaryBudgetRefs: client.monetaryBudgetRefs ?? [],
    resourceBudgetRefs: client.resourceBudgetRefs ?? [],
    resourceQuotaRefs: client.resourceQuotaRefs ?? [],
    paymentPayeeDid: client.paymentPayeeDid,
    resourceProviderDid: client.resourceProviderDid,
    callbackRegistration: client.callbackRegistration,
    auth: {
      clientId: client.clientId,
      signingKey: client.auth.signingKey,
      requiredHeaders: [
        "x-afal-client-id",
        "x-afal-request-timestamp",
        "x-afal-request-signature",
      ],
      signatureFormula: "sha256(`${clientId}:${requestRef}:${timestamp}:${signingKey}`)",
    },
  };

  const serialized = JSON.stringify(bundle, null, 2);
  if (outputPath) {
    await writeFile(outputPath, `${serialized}\n`, "utf8");
  }

  process.stdout.write(`${serialized}\n`);
}

await main();
