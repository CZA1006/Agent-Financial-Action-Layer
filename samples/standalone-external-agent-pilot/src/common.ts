import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

export function getSandboxConfig() {
  return {
    baseUrl: requiredEnv("AFAL_BASE_URL").replace(/\/+$/, ""),
    clientId: requiredEnv("AFAL_CLIENT_ID"),
    signingKey: requiredEnv("AFAL_SIGNING_KEY"),
  };
}

export function createSignedHeaders(args: {
  clientId: string;
  signingKey: string;
  requestRef: string;
}) {
  const timestamp = new Date().toISOString();
  return {
    "content-type": "application/json",
    "x-afal-client-id": args.clientId,
    "x-afal-request-timestamp": timestamp,
    "x-afal-request-signature": sha256(
      `${args.clientId}:${args.requestRef}:${timestamp}:${args.signingKey}`
    ),
  };
}

export async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

function applyEnvContents(contents: string): void {
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export async function loadEnvFileIfPresent(path = ".env"): Promise<void> {
  let currentDir = process.cwd();

  while (true) {
    const envPath = resolve(currentDir, path);
    try {
      const contents = await readFile(envPath, "utf8");
      applyEnvContents(contents);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return;
    }
    currentDir = parentDir;
  }
}

export async function printJson(payload: unknown): Promise<void> {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
