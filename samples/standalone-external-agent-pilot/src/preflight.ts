import { spawnSync } from "node:child_process";

import {
  createSignedHeaders,
  getSandboxConfig,
  loadEnvFileIfPresent,
  postJson,
  requiredEnv,
} from "./common";
import { AFAL_ROUTES } from "./routes";

function commandExists(command: string): boolean {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
  });
  return result.status === 0;
}

async function main(): Promise<void> {
  await loadEnvFileIfPresent();

  const { baseUrl, clientId, signingKey } = getSandboxConfig();
  const paymentCallbackUrl = requiredEnv("AFAL_PAYMENT_CALLBACK_URL");
  const resourceCallbackUrl = requiredEnv("AFAL_RESOURCE_CALLBACK_URL");
  const callbackHost = process.env.CALLBACK_RECEIVER_HOST ?? "127.0.0.1";
  const callbackPort = process.env.CALLBACK_RECEIVER_PORT ?? "3401";

  const response = await fetch(`${baseUrl}/`);
  const bodyText = await response.text();

  if (bodyText.includes("ERR_NGROK_3200")) {
    throw new Error(`AFAL_BASE_URL appears offline at ${baseUrl}`);
  }

  const requestRef = `req-standalone-preflight-auth-${Date.now()}`;
  const authProbe = await postJson<{
    ok?: boolean;
    statusCode?: number;
    error?: { code?: string; message?: string };
  }>(
    `${baseUrl}${AFAL_ROUTES.listCallbacks}`,
    {
      requestRef,
      input: {},
    },
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  if (!authProbe.ok) {
    throw new Error(
      `AFAL credential preflight failed for client "${clientId}": ${
        authProbe.error?.message ?? `HTTP status ${authProbe.statusCode ?? "unknown"}`
      }`
    );
  }

  const hasCloudflared = commandExists("cloudflared");
  const hasNgrok = commandExists("ngrok");

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        afalBaseUrl: baseUrl,
        afalReachable: true,
        rootStatusCode: response.status,
        authProbe: {
          ok: true,
          clientId,
          statusCode: authProbe.statusCode,
        },
        callbackReceiver: {
          host: callbackHost,
          port: callbackPort,
          paymentCallbackUrl,
          resourceCallbackUrl,
        },
        tunnelTools: {
          cloudflared: hasCloudflared,
          ngrok: hasNgrok,
        },
        note: hasCloudflared
          ? "cloudflared detected; prefer it for anonymous HTTPS callback tunnels."
          : hasNgrok
            ? "ngrok detected, but it may require a verified account and authtoken. Recommended anonymous tunnel path on macOS: brew install cloudflared."
            : "No tunnel tool detected. Recommended anonymous tunnel path on macOS: brew install cloudflared.",
      },
      null,
      2
    )}\n`
  );
}

await main();
