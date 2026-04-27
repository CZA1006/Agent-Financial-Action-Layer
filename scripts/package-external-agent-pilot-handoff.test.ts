import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("package-external-agent-pilot-handoff produces a single external handoff directory", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "afal-external-handoff-"));
  const repoAlias = join(tempDir, "Agent-Financial-Action-Layer");

  try {
    await symlink(process.cwd(), repoAlias);
    const bundlePath = join(tempDir, "bundle.json");
    const outputDir = join(tempDir, "handoff");

    await writeFile(
      bundlePath,
      `${JSON.stringify(
        {
          afalBaseUrl: "http://127.0.0.1:3213",
          dataDir: "/Users/maintainer/tmp/afal/sqlite-data",
          integrationDb: "/Users/maintainer/tmp/afal/sqlite-data/afal-integration.sqlite",
          clientId: "client-demo-001",
          subjectDid: "did:afal:agent:payment-agent-01",
          mandateRefs: ["mnd-0001", "mnd-0002"],
          monetaryBudgetRefs: ["budg-money-001"],
          resourceBudgetRefs: ["budg-res-001"],
          resourceQuotaRefs: ["quota-001"],
          paymentPayeeDid: "did:afal:agent:fraud-service-01",
          resourceProviderDid: "did:afal:institution:provider-openai",
          auth: {
            clientId: "client-demo-001",
            signingKey: "secret-demo-signing-key",
          },
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const scriptPath = resolve(repoAlias, "scripts/package-external-agent-pilot-handoff.mjs");
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--bundle-json", bundlePath, "--output-dir", outputDir],
      { cwd: repoAlias }
    );

    const manifest = JSON.parse(stdout) as {
      outputDir: string;
      pilotDir: string;
      envPath: string;
      includedDocs: string[];
      clientId: string;
      subjectDid: string;
    };

    assert.equal(manifest.outputDir, ".");
    assert.equal(manifest.clientId, "client-demo-001");
    assert.equal(manifest.subjectDid, "did:afal:agent:payment-agent-01");
    assert.ok(manifest.includedDocs.includes("docs/specs/external-agent-auth-contract.md"));
    assert.ok(
      manifest.includedDocs.includes("docs/product/external-agent-repo-external-validation-plan.md")
    );
    assert.ok(
      manifest.includedDocs.includes("docs/product/external-agent-validation-round-checklist.md")
    );

    await stat(join(outputDir, "pilot", "package.json"));
    await stat(join(outputDir, "pilot", "README.md"));
    await stat(join(outputDir, ".env"));
    await stat(join(outputDir, "pilot", ".env"));
    await stat(join(outputDir, "bundle.json"));
    await stat(join(outputDir, "manifest.json"));
    await stat(join(outputDir, "docs", "product", "external-engineer-pilot-handoff.md"));
    await stat(join(outputDir, "docs", "product", "external-agent-repo-external-validation-plan.md"));
    await stat(join(outputDir, "docs", "product", "external-agent-validation-round-checklist.md"));
    await stat(join(outputDir, "docs", "specs", "receiver-settlement-callback-contract.md"));

    const envText = await readFile(join(outputDir, ".env"), "utf8");
    assert.match(envText, /AFAL_CLIENT_ID=client-demo-001/);
    assert.match(envText, /AFAL_SIGNING_KEY=secret-demo-signing-key/);

    const packagedBundle = await readFile(join(outputDir, "bundle.json"), "utf8");
    assert.doesNotMatch(packagedBundle, /\/Users\/maintainer/);
    assert.doesNotMatch(packagedBundle, /dataDir/);
    assert.doesNotMatch(packagedBundle, /integrationDb/);

    const readme = await readFile(join(outputDir, "pilot", "README.md"), "utf8");
    assert.match(readme, /repo-external consumer skeleton/);
    assert.match(readme, /npm run preflight/);

    const runbook = await readFile(
      join(outputDir, "docs", "product", "external-agent-pilot-repo-external-runbook.md"),
      "utf8"
    );
    assert.doesNotMatch(runbook, /\/Users\/|\/home\/runner\//);

    const packagedManifest = JSON.parse(
      await readFile(join(outputDir, "manifest.json"), "utf8")
    ) as { envPath: string; outputDir: string; pilotDir: string };
    assert.equal(packagedManifest.envPath, ".env");
    assert.equal(packagedManifest.outputDir, ".");
    assert.equal(packagedManifest.pilotDir, "pilot");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
