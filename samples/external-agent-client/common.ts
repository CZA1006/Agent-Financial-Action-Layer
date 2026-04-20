import { createHash } from "node:crypto";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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
) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}
