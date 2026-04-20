import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function writePilotArtifacts(
  artifactsDir: string | undefined,
  artifacts: Record<string, unknown>
): Promise<void> {
  if (!artifactsDir) {
    return;
  }

  const outputDir = resolve(artifactsDir);
  await mkdir(outputDir, { recursive: true });

  await Promise.all(
    Object.entries(artifacts).map(async ([name, value]) => {
      if (value === undefined) {
        return;
      }

      await writeFile(
        resolve(outputDir, `${name}.json`),
        JSON.stringify(value, null, 2),
        "utf8"
      );
    })
  );
}
