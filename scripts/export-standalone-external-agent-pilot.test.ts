import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("standalone external-agent pilot export produces a repo-external skeleton", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "afal-standalone-export-"));

  try {
    const repoRoot = process.cwd();
    const scriptPath = resolve(repoRoot, "scripts/export-standalone-external-agent-pilot.mjs");

    const { stdout } = await execFileAsync("node", [scriptPath, "--output-dir", outputDir], {
      cwd: repoRoot,
    });

    const summary = JSON.parse(stdout) as {
      outputDir: string;
      exportedFiles: string[];
    };

    assert.equal(summary.outputDir, outputDir);
    assert.deepEqual(summary.exportedFiles, [
      ".env.example",
      ".gitignore",
      "README.md",
      "package.json",
      "tsconfig.json",
      "src/",
    ]);

    await stat(join(outputDir, "package.json"));
    await stat(join(outputDir, "tsconfig.json"));
    await stat(join(outputDir, ".gitignore"));
    await stat(join(outputDir, "src", "payment-client.ts"));
    await stat(join(outputDir, "src", "resource-client.ts"));

    const readme = await readFile(join(outputDir, "README.md"), "utf8");
    assert.match(readme, /repo-external consumer skeleton/);
    assert.doesNotMatch(readme, /docs\/product\//);
    assert.doesNotMatch(readme, /samples\/standalone-external-agent-pilot/);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
