import { spawnSync } from "node:child_process";

import { getSandboxConfig, loadEnvFileIfPresent, requiredEnv } from "./common";

function commandExists(command: string): boolean {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
  });
  return result.status === 0;
}

async function main(): Promise<void> {
  await loadEnvFileIfPresent();

  const { baseUrl } = getSandboxConfig();
  const paymentCallbackUrl = requiredEnv("AFAL_PAYMENT_CALLBACK_URL");
  const resourceCallbackUrl = requiredEnv("AFAL_RESOURCE_CALLBACK_URL");
  const callbackHost = process.env.CALLBACK_RECEIVER_HOST ?? "127.0.0.1";
  const callbackPort = process.env.CALLBACK_RECEIVER_PORT ?? "3401";

  const response = await fetch(`${baseUrl}/`);
  const bodyText = await response.text();

  if (bodyText.includes("ERR_NGROK_3200")) {
    throw new Error(`AFAL_BASE_URL appears offline at ${baseUrl}`);
  }

  const hasCloudflared = commandExists("cloudflared");
  const hasNgrok = commandExists("ngrok");

  if (!hasCloudflared && !hasNgrok) {
    throw new Error(
      "No tunnel tool detected. Install cloudflared or ngrok before callback registration."
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        afalBaseUrl: baseUrl,
        afalReachable: true,
        rootStatusCode: response.status,
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
        note:
          "If using ngrok, a verified account and configured authtoken may still be required.",
      },
      null,
      2
    )}\n`
  );
}

await main();
