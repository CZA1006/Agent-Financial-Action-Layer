import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("package-external-agent-pilot-public-release produces a release-safe package", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "afal-external-public-release-"));

  try {
    const scriptPath = resolve(process.cwd(), "scripts/package-external-agent-pilot-public-release.mjs");
    const { stdout } = await execFileAsync("node", [scriptPath, "--output-dir", outputDir], {
      cwd: process.cwd(),
    });

    const manifest = JSON.parse(stdout) as {
      outputDir: string;
      releaseSafe: boolean;
      templateBundlePath: string;
      envTemplatePath: string;
    };

    assert.equal(manifest.outputDir, outputDir);
    assert.equal(manifest.releaseSafe, true);

    await stat(join(outputDir, "README.md"));
    await stat(join(outputDir, "pilot", "README.md"));
    await stat(join(outputDir, "docs", "product", "external-engineer-pilot-handoff.md"));
    await stat(join(outputDir, "bundle.template.json"));
    await stat(join(outputDir, ".env.template"));
    await stat(join(outputDir, "manifest.json"));

    const packageReadme = await readFile(join(outputDir, "README.md"), "utf8");
    assert.match(packageReadme, /release-safe/i);
    assert.match(packageReadme, /does not include a live provisioned client/i);

    const bundleTemplate = await readFile(join(outputDir, "bundle.template.json"), "utf8");
    assert.match(bundleTemplate, /request-from-afal-team/);
    assert.doesNotMatch(bundleTemplate, /secret-demo-signing-key/);

    const envTemplate = await readFile(join(outputDir, ".env.template"), "utf8");
    assert.match(envTemplate, /AFAL_SIGNING_KEY=request-from-afal-team/);
    assert.match(envTemplate, /AFAL_BASE_URL=https:\/\/replace-with-afal-base-url/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
