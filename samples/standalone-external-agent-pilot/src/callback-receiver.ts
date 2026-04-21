import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";

import { loadEnvFileIfPresent } from "./common";

async function main(): Promise<void> {
  await loadEnvFileIfPresent();

  const host = process.env.CALLBACK_RECEIVER_HOST ?? "127.0.0.1";
  const port = Number(process.env.CALLBACK_RECEIVER_PORT ?? "3401");
  const artifactsDir = process.env.CALLBACK_RECEIVER_ARTIFACTS_DIR;

  async function writeArtifact(name: string, payload: unknown): Promise<void> {
    if (!artifactsDir) {
      return;
    }

    const outputDir = resolve(artifactsDir);
    await mkdir(outputDir, { recursive: true });
    await writeFile(resolve(outputDir, `${name}.json`), JSON.stringify(payload, null, 2), "utf8");
  }

  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/callbacks/action-settled") {
      response.statusCode = 404;
      response.end("not-found");
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }

    const bodyText = Buffer.concat(chunks).toString("utf8");
    const body = bodyText ? JSON.parse(bodyText) : null;
    const headers = {
      notificationId: request.headers["x-afal-notification-id"],
      idempotencyKey: request.headers["x-afal-idempotency-key"],
      deliveryAttempt: request.headers["x-afal-delivery-attempt"],
      eventType: request.headers["x-afal-event-type"],
    };

    const artifact = { headers, body };
    await writeArtifact(`callback-${Date.now()}`, artifact);
    process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);

    response.statusCode = 202;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  });

  server.listen(port, host, () => {
    process.stdout.write(
      `callback receiver listening on http://${host}:${port}/callbacks/action-settled\n`
    );
  });
}

await main();
