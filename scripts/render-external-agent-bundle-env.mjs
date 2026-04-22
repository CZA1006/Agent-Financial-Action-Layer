import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function requireArg(flag) {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument ${flag}`);
  }
  return value;
}

function firstOrFallback(values, fallback = "") {
  return Array.isArray(values) && values.length > 0 ? String(values[0]) : fallback;
}

export function renderEnvText(bundle, options = {}) {
  const callbackUrl = options.callbackUrl ?? "http://127.0.0.1:3401/callbacks/action-settled";
  const callbackHost = options.callbackHost ?? "127.0.0.1";
  const callbackPort = options.callbackPort ?? "3401";
  const callbackArtifactsDir = options.callbackArtifactsDir ?? "./artifacts/callbacks";

  return [
    `AFAL_BASE_URL=${bundle.afalBaseUrl ?? ""}`,
    `AFAL_CLIENT_ID=${bundle.clientId ?? bundle.auth?.clientId ?? ""}`,
    `AFAL_SIGNING_KEY=${bundle.auth?.signingKey ?? ""}`,
    "",
    `AFAL_MONETARY_BUDGET_REF=${firstOrFallback(bundle.monetaryBudgetRefs, "budg-money-001")}`,
    `AFAL_RESOURCE_BUDGET_REF=${firstOrFallback(bundle.resourceBudgetRefs, "budg-res-001")}`,
    `AFAL_RESOURCE_QUOTA_REF=${firstOrFallback(bundle.resourceQuotaRefs, "quota-001")}`,
    "",
    `AFAL_PAYMENT_CALLBACK_URL=${bundle.callbackRegistration?.paymentSettlementUrl ?? callbackUrl}`,
    `AFAL_RESOURCE_CALLBACK_URL=${bundle.callbackRegistration?.resourceSettlementUrl ?? callbackUrl}`,
    "",
    `CALLBACK_RECEIVER_HOST=${callbackHost}`,
    `CALLBACK_RECEIVER_PORT=${callbackPort}`,
    `CALLBACK_RECEIVER_ARTIFACTS_DIR=${callbackArtifactsDir}`,
    "",
    `# Optional reference metadata from AFAL provisioning`,
    `# AFAL_SUBJECT_DID=${bundle.subjectDid ?? ""}`,
    `# AFAL_MANDATE_REFS=${Array.isArray(bundle.mandateRefs) ? bundle.mandateRefs.join(",") : ""}`,
    `# AFAL_PAYMENT_PAYEE_DID=${bundle.paymentPayeeDid ?? ""}`,
    `# AFAL_RESOURCE_PROVIDER_DID=${bundle.resourceProviderDid ?? ""}`,
    "",
  ].join("\n");
}

async function main() {
  const inputPath = resolve(requireArg("--input"));
  const outputPath = getArg("--output") ? resolve(getArg("--output")) : undefined;
  const bundle = JSON.parse(await readFile(inputPath, "utf8"));
  const envText = renderEnvText(bundle, {
    callbackUrl: getArg("--callback-url"),
    callbackHost: getArg("--callback-host"),
    callbackPort: getArg("--callback-port"),
    callbackArtifactsDir: getArg("--callback-artifacts-dir"),
  });

  if (outputPath) {
    await writeFile(outputPath, envText, "utf8");
  }

  process.stdout.write(envText);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await main();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while rendering external-agent env";
    console.error(`[render:external-agent-bundle-env] ${message}`);
    process.exitCode = 1;
  }
}
