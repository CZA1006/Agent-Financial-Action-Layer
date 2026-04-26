import { mkdir, readFile, rm, writeFile, cp } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

import { renderEnvText } from "./render-external-agent-bundle-env.mjs";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function rewritePackagedMarkdownLinks(sourceText, sourceRoot, sourceRelativePath) {
  return sourceText.replace(/\]\(([^)]+)\)/g, (_match, target) => {
    if (!target.startsWith("/")) {
      return `](${target})`;
    }

    const repoName = basename(sourceRoot).toLowerCase();
    const segments = target.split("/").filter(Boolean);
    const repoIndex = segments.findIndex((segment) => segment.toLowerCase() === repoName);
    if (repoIndex === -1) {
      return `](${target})`;
    }

    const strippedTarget = segments.slice(repoIndex + 1).join("/");
    const relativeTarget = relative(dirname(sourceRelativePath), strippedTarget);
    return `](${relativeTarget})`;
  });
}

async function copyFile(sourceRoot, outputRoot, relativePath) {
  const sourcePath = join(sourceRoot, relativePath);
  const outputPath = join(outputRoot, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });

  if (relativePath.endsWith(".md")) {
    const sourceText = await readFile(sourcePath, "utf8");
    const rewritten = rewritePackagedMarkdownLinks(sourceText, sourceRoot, relativePath);
    await writeFile(outputPath, rewritten, "utf8");
    return;
  }

  await cp(sourcePath, outputPath);
}

async function main() {
  const repoRoot = process.cwd();
  const outputRoot = resolve(
    getArg("--output-dir") ?? join(repoRoot, "dist", "external-agent-pilot-public-release")
  );
  const pilotRoot = join(outputRoot, "pilot");
  const sourcePilotRoot = resolve(repoRoot, "samples/standalone-external-agent-pilot");
  const docsToCopy = [
    "docs/product/external-agent-pilot-repo-external-runbook.md",
    "docs/product/external-engineer-pilot-handoff.md",
    "docs/product/external-agent-repo-external-validation-plan.md",
    "docs/product/external-agent-validation-round-checklist.md",
    "docs/product/external-pilot-findings-template.md",
    "docs/specs/external-agent-auth-contract.md",
    "docs/specs/receiver-settlement-callback-contract.md",
  ];

  const templateBundle = {
    stage: "external-agent-public-release-template",
    afalBaseUrl: "https://replace-with-afal-base-url",
    clientId: "replace-with-provisioned-client-id",
    tenantId: "replace-with-tenant-id",
    agentId: "replace-with-agent-id",
    subjectDid: "did:afal:agent:payment-agent-01",
    mandateRefs: ["mnd-0001", "mnd-0002"],
    monetaryBudgetRefs: ["budg-money-001"],
    resourceBudgetRefs: ["budg-res-001"],
    resourceQuotaRefs: ["quota-001"],
    paymentPayeeDid: "did:afal:agent:fraud-service-01",
    resourceProviderDid: "did:afal:institution:provider-openai",
    callbackRegistration: {
      paymentSettlementUrl: "http://127.0.0.1:3401/callbacks/action-settled",
      resourceSettlementUrl: "http://127.0.0.1:3401/callbacks/action-settled",
    },
    auth: {
      clientId: "replace-with-provisioned-client-id",
      signingKey: "request-from-afal-team",
      requiredHeaders: [
        "x-afal-client-id",
        "x-afal-request-timestamp",
        "x-afal-request-signature",
      ],
      signatureFormula: "sha256(`${clientId}:${requestRef}:${timestamp}:${signingKey}`)",
    },
  };

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(sourcePilotRoot, pilotRoot, { recursive: true });

  const externalReadme = await readFile(join(sourcePilotRoot, "README.external.md"), "utf8");
  await writeFile(join(pilotRoot, "README.md"), externalReadme, "utf8");
  await rm(join(pilotRoot, "README.external.md"), { force: true });

  for (const relativePath of docsToCopy) {
    await copyFile(repoRoot, outputRoot, relativePath);
  }

  await writeFile(
    join(outputRoot, "README.md"),
    [
      "# AFAL External Agent Pilot Public Release",
      "",
      "This package is release-safe.",
      "It includes the standalone pilot, reference docs, a bundle template, and an `.env` template.",
      "It does not include a live provisioned client or a real signing key.",
      "",
      "Contents:",
      "",
      "- `pilot/`",
      "- `docs/`",
      "- `bundle.template.json`",
      "- `.env.template`",
      "- `manifest.json`",
      "",
      "To run against a real AFAL sandbox, request a provisioned bundle from the AFAL team and replace the template values.",
      "",
    ].join("\n"),
    "utf8"
  );

  await writeFile(
    join(outputRoot, "bundle.template.json"),
    `${JSON.stringify(templateBundle, null, 2)}\n`,
    "utf8"
  );
  await writeFile(join(outputRoot, ".env.template"), renderEnvText(templateBundle), "utf8");
  await writeFile(join(pilotRoot, ".env.template"), renderEnvText(templateBundle), "utf8");

  const manifest = {
    generatedAt: new Date().toISOString(),
    outputDir: ".",
    pilotDir: "pilot",
    docsDir: "docs",
    templateBundlePath: "bundle.template.json",
    envTemplatePath: ".env.template",
    releaseSafe: true,
    includedDocs: docsToCopy,
  };

  await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown error while packaging external-agent public release";
  console.error(`[package:external-agent-pilot-public-release] ${message}`);
  process.exitCode = 1;
}
