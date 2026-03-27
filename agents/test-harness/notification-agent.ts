import { createServer, type IncomingMessage } from "node:http";

import type { SettlementNotification } from "../../backend/afal/interfaces";

export interface SettlementNotificationHeaders {
  notificationId?: string;
  idempotencyKey?: string;
  deliveryAttempt?: string;
  eventType?: string;
}

export interface ReceivedSettlementNotification {
  notification: SettlementNotification;
  headers: SettlementNotificationHeaders;
  duplicate: boolean;
}

export interface SettlementNotificationReceiver {
  url: string;
  close(): Promise<void>;
  waitForNotification(timeoutMs?: number): Promise<ReceivedSettlementNotification>;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function startSettlementNotificationReceiver(args?: {
  host?: string;
  path?: string;
  failFirstAttempts?: number;
}): Promise<SettlementNotificationReceiver> {
  const host = args?.host ?? "127.0.0.1";
  const path = args?.path ?? "/callbacks/action-settled";
  let resolveNotification: ((notification: ReceivedSettlementNotification) => void) | undefined;
  let accepted = false;
  let attempts = 0;
  const seenIdempotencyKeys = new Set<string>();

  const notificationPromise = new Promise<ReceivedSettlementNotification>((resolve) => {
    resolveNotification = resolve;
  });

  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== path) {
      response.writeHead(404);
      response.end();
      return;
    }

    try {
      const body = await readBody(request);
      const notification = JSON.parse(body) as SettlementNotification;
      const headers: SettlementNotificationHeaders = {
        notificationId: request.headers["x-afal-notification-id"]?.toString(),
        idempotencyKey: request.headers["x-afal-idempotency-key"]?.toString(),
        deliveryAttempt: request.headers["x-afal-delivery-attempt"]?.toString(),
        eventType: request.headers["x-afal-event-type"]?.toString(),
      };
      const duplicate = headers.idempotencyKey
        ? seenIdempotencyKeys.has(headers.idempotencyKey)
        : false;

      attempts += 1;
      if (!duplicate && attempts <= (args?.failFirstAttempts ?? 0)) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false, retryable: true }));
        return;
      }

      if (headers.idempotencyKey) {
        seenIdempotencyKeys.add(headers.idempotencyKey);
      }

      if (!accepted) {
        accepted = true;
        resolveNotification?.({
          notification,
          headers,
          duplicate,
        });
      }
      response.writeHead(202, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, duplicate }));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : "invalid notification payload",
        })
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("notification receiver did not bind to a TCP port");
  }

  return {
    url: `http://${host}:${address.port}${path}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
    waitForNotification: async (timeoutMs = 3_000) =>
      new Promise<ReceivedSettlementNotification>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timed out waiting for settlement notification after ${timeoutMs}ms`));
        }, timeoutMs);

        notificationPromise.then(
          (notification) => {
            clearTimeout(timeout);
            resolve(notification);
          },
          (error) => {
            clearTimeout(timeout);
            reject(error);
          }
        );
      }),
  };
}
