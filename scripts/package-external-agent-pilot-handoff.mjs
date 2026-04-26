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

function requireArg(flag) {
  const value = getArg(flag);
  if (!value) {
    throw new Error(`Missing required argument ${flag}`);
  }
  return value;
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
  const bundlePath = resolve(requireArg("--bundle-json"));
  const outputRoot = resolve(
    getArg("--output-dir") ?? join(repoRoot, "dist", "external-agent-pilot-handoff")
  );
  const pilotRoot = join(outputRoot, "pilot");
  const sourcePilotRoot = resolve(repoRoot, "samples/standalone-external-agent-pilot");
  const docsToCopy = [
    "docs/product/external-agent-pilot-repo-external-runbook.md",
    "docs/product/external-engineer-pilot-handoff.md",
    "docs/product/external-engineer-message-template.md",
    "docs/product/external-agent-repo-external-validation-plan.md",
    "docs/product/external-agent-validation-round-checklist.md",
    "docs/product/external-pilot-findings-template.md",
    "docs/specs/external-agent-auth-contract.md",
    "docs/specs/receiver-settlement-callback-contract.md",
  ];

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(sourcePilotRoot, pilotRoot, { recursive: true });

  const externalReadme = await readFile(join(sourcePilotRoot, "README.external.md"), "utf8");
  await writeFile(join(pilotRoot, "README.md"), externalReadme, "utf8");
  await rm(join(pilotRoot, "README.external.md"), { force: true });

  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  const envText = renderEnvText(bundle, {
    callbackUrl: getArg("--callback-url"),
    callbackHost: getArg("--callback-host"),
    callbackPort: getArg("--callback-port"),
    callbackArtifactsDir: getArg("--callback-artifacts-dir"),
  });

  await writeFile(join(outputRoot, ".env"), envText, "utf8");
  await writeFile(join(pilotRoot, ".env"), envText, "utf8");
  await writeFile(join(outputRoot, "bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  for (const relativePath of docsToCopy) {
    await copyFile(repoRoot, outputRoot, relativePath);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceBundle: "bundle.json",
    outputDir: ".",
    pilotDir: "pilot",
    envPath: ".env",
    docsDir: "docs",
    clientId: bundle.clientId ?? bundle.auth?.clientId ?? "",
    subjectDid: bundle.subjectDid ?? "",
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
      : "Unknown error while packaging external-agent pilot handoff";
  console.error(`[package:external-agent-pilot-handoff] ${message}`);
  process.exitCode = 1;
}
