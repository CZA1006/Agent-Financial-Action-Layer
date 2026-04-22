import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("render-external-agent-bundle-env converts a provisioning bundle into .env text", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "afal-external-bundle-env-"));

  try {
    const inputPath = join(tempDir, "bundle.json");
    const outputPath = join(tempDir, ".env");

    await writeFile(
      inputPath,
      `${JSON.stringify(
        {
          afalBaseUrl: "http://127.0.0.1:3213",
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

    const scriptPath = resolve(process.cwd(), "scripts/render-external-agent-bundle-env.mjs");
    await execFileAsync("node", [scriptPath, "--input", inputPath, "--output", outputPath], {
      cwd: process.cwd(),
    });

    const envText = await readFile(outputPath, "utf8");
    assert.match(envText, /AFAL_BASE_URL=http:\/\/127\.0\.0\.1:3213/);
    assert.match(envText, /AFAL_CLIENT_ID=client-demo-001/);
    assert.match(envText, /AFAL_SIGNING_KEY=secret-demo-signing-key/);
    assert.match(envText, /AFAL_MONETARY_BUDGET_REF=budg-money-001/);
    assert.match(envText, /AFAL_RESOURCE_BUDGET_REF=budg-res-001/);
    assert.match(envText, /AFAL_RESOURCE_QUOTA_REF=quota-001/);
    assert.match(envText, /AFAL_PAYMENT_CALLBACK_URL=http:\/\/127\.0\.0\.1:3401\/callbacks\/action-settled/);
    assert.match(envText, /# AFAL_SUBJECT_DID=did:afal:agent:payment-agent-01/);
    assert.match(envText, /# AFAL_MANDATE_REFS=mnd-0001,mnd-0002/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
