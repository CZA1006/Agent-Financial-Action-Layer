import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function copyFile(sourceRoot, outputRoot, relativePath) {
  const sourcePath = join(sourceRoot, relativePath);
  const outputPath = join(outputRoot, relativePath);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await cp(sourcePath, outputPath);
}

async function main() {
  const repoRoot = process.cwd();
  const sourceRoot = resolve(repoRoot, "samples/standalone-external-agent-pilot");
  const outputRoot = resolve(
    getArg("--output-dir") ?? resolve(repoRoot, "dist/standalone-external-agent-pilot-skeleton")
  );

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  await copyFile(sourceRoot, outputRoot, ".env.example");
  await copyFile(sourceRoot, outputRoot, ".gitignore");
  await copyFile(sourceRoot, outputRoot, "package.json");
  await copyFile(sourceRoot, outputRoot, "tsconfig.json");

  const externalReadme = await readFile(join(sourceRoot, "README.external.md"), "utf8");
  await writeFile(join(outputRoot, "README.md"), externalReadme, "utf8");

  await cp(join(sourceRoot, "src"), join(outputRoot, "src"), { recursive: true });

  const exportedFiles = [
    ".env.example",
    ".gitignore",
    "README.md",
    "package.json",
    "tsconfig.json",
    "src/",
  ];

  process.stdout.write(
    `${JSON.stringify(
      {
        outputDir: outputRoot,
        exportedFiles,
      },
      null,
      2
    )}\n`
  );
}

await main();
