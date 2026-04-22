import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { SettlementNotificationPort } from "../interfaces";
import type { PaymentRailAdapter, ResourceProviderAdapter } from "../settlement";
import {
  SettlementNotificationOutboxWorker,
  type SettlementNotificationRedeliveryPort,
} from "../notifications";
import type { AfalHttpResponseBody } from "./types";
import { AFAL_HTTP_ROUTES } from "./types";
import {
  createSeededSqliteAfalHttpRouter,
  type SeededSqliteAfalHttpRouter,
} from "./sqlite";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3213;

export interface AfalNodeHttpTransportRequest {
  method?: string;
  url?: string;
  bodyText?: string;
  headers?: Record<string, string | undefined>;
}

export interface AfalNodeHttpTransportResponse {
  statusCode: number;
  headers: {
    "content-type": "application/json";
    "content-length": string;
  };
  bodyText: string;
}

export interface SeededSqliteAfalHttpServer extends SeededSqliteAfalHttpRouter {
  server: Server;
  notificationWorker?: SettlementNotificationOutboxWorker;
}

export interface RunningSeededSqliteAfalHttpServer extends SeededSqliteAfalHttpServer {
  host: string;
  port: number;
  url: string;
  close(): Promise<void>;
}

function stringifyNodeResponse(
  statusCode: number,
  body: AfalHttpResponseBody
): AfalNodeHttpTransportResponse {
  const bodyText = JSON.stringify(body);
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(bodyText, "utf8").toString(),
    },
    bodyText,
  };
}

function inferCapability(
  pathname: string
):
  | "requestPaymentApproval"
  | "executePayment"
  | "requestResourceApproval"
  | "settleResourceUsage"
  | "getActionStatus"
  | "registerExternalCallback"
  | "getExternalCallbackRegistration"
  | "listExternalCallbackRegistrations"
  | "getNotificationDelivery"
  | "listNotificationDeliveries"
  | "getNotificationWorkerStatus"
  | "getAdminAuditEntry"
  | "listAdminAuditEntries"
  | "getApprovalSession"
  | "applyApprovalResult"
  | "redeliverNotification"
  | "startNotificationWorker"
  | "stopNotificationWorker"
  | "runNotificationWorker"
  | "resumeApprovalSession"
  | "resumeApprovedAction" {
  if (pathname === AFAL_HTTP_ROUTES.requestPaymentApproval) {
    return "requestPaymentApproval";
  }
  if (pathname === AFAL_HTTP_ROUTES.settleResourceUsage) {
    return "settleResourceUsage";
  }
  if (pathname === AFAL_HTTP_ROUTES.requestResourceApproval) {
    return "requestResourceApproval";
  }
  if (pathname === AFAL_HTTP_ROUTES.getActionStatus) {
    return "getActionStatus";
  }
  if (pathname === AFAL_HTTP_ROUTES.registerExternalCallback) {
    return "registerExternalCallback";
  }
  if (pathname === AFAL_HTTP_ROUTES.getExternalCallbackRegistration) {
    return "getExternalCallbackRegistration";
  }
  if (pathname === AFAL_HTTP_ROUTES.listExternalCallbackRegistrations) {
    return "listExternalCallbackRegistrations";
  }
  if (pathname === AFAL_HTTP_ROUTES.getNotificationDelivery) {
    return "getNotificationDelivery";
  }
  if (pathname === AFAL_HTTP_ROUTES.listNotificationDeliveries) {
    return "listNotificationDeliveries";
  }
  if (pathname === AFAL_HTTP_ROUTES.getNotificationWorkerStatus) {
    return "getNotificationWorkerStatus";
  }
  if (pathname === AFAL_HTTP_ROUTES.getAdminAuditEntry) {
    return "getAdminAuditEntry";
  }
  if (pathname === AFAL_HTTP_ROUTES.listAdminAuditEntries) {
    return "listAdminAuditEntries";
  }
  if (pathname === AFAL_HTTP_ROUTES.getApprovalSession) {
    return "getApprovalSession";
  }
  if (pathname === AFAL_HTTP_ROUTES.applyApprovalResult) {
    return "applyApprovalResult";
  }
  if (pathname === AFAL_HTTP_ROUTES.redeliverNotification) {
    return "redeliverNotification";
  }
  if (pathname === AFAL_HTTP_ROUTES.startNotificationWorker) {
    return "startNotificationWorker";
  }
  if (pathname === AFAL_HTTP_ROUTES.stopNotificationWorker) {
    return "stopNotificationWorker";
  }
  if (pathname === AFAL_HTTP_ROUTES.runNotificationWorker) {
    return "runNotificationWorker";
  }
  if (pathname === AFAL_HTTP_ROUTES.resumeApprovalSession) {
    return "resumeApprovalSession";
  }
  if (pathname === AFAL_HTTP_ROUTES.resumeApprovedAction) {
    return "resumeApprovedAction";
  }
  return "executePayment";
}

function canRunNotificationOutboxWorker(
  port: SettlementNotificationPort | undefined
): port is SettlementNotificationPort & SettlementNotificationRedeliveryPort {
  return Boolean(
    port &&
      "redeliverFailedNotifications" in port &&
      typeof port.redeliverFailedNotifications === "function"
  );
}

function buildNodeBadRequest(pathname: string, message: string): AfalNodeHttpTransportResponse {
  return stringifyNodeResponse(400, {
    ok: false,
    capability: inferCapability(pathname),
    requestRef: "unknown",
    statusCode: 400,
    error: {
      code: "bad-request",
      message,
    },
  });
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function handleAfalNodeHttpRequest(
  sqlite: SeededSqliteAfalHttpRouter,
  request: AfalNodeHttpTransportRequest
): Promise<AfalNodeHttpTransportResponse> {
  const pathname = new URL(request.url ?? "/", `http://${DEFAULT_HOST}`).pathname;
  let body: unknown;

  if (request.bodyText && request.bodyText.trim().length > 0) {
    try {
      body = JSON.parse(request.bodyText);
    } catch {
      return buildNodeBadRequest(pathname, "HTTP request body must be valid JSON");
    }
  }

  const response = await sqlite.router.handle({
    method: request.method ?? "GET",
    path: pathname,
    body,
    headers: request.headers,
  });

  return stringifyNodeResponse(response.statusCode, response.body);
}

export function createAfalNodeHttpRequestListener(
  sqlite: SeededSqliteAfalHttpRouter
): RequestListener {
  return async (request, response) => {
    try {
      const bodyText = await readRequestBody(request);
      const result = await handleAfalNodeHttpRequest(sqlite, {
        method: request.method,
        url: request.url,
        bodyText,
        headers: Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(", ") : value,
          ])
        ),
      });

      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    } catch (error) {
      const result = stringifyNodeResponse(500, {
        ok: false,
        capability: "executePayment",
        requestRef: "unknown",
        statusCode: 500,
        error: {
          code: "internal-error",
          message: error instanceof Error ? error.message : "Unhandled AFAL HTTP server error",
        },
      });

      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    }
  };
}

export function createSeededSqliteAfalHttpServer(
  dataDir: string,
  options?: {
    notifications?: SettlementNotificationPort;
    notificationWorker?: {
      intervalMs?: number;
      start?: boolean;
      onError?: (error: unknown) => void | Promise<void>;
    };
    paymentAdapter?: PaymentRailAdapter;
    resourceAdapter?: ResourceProviderAdapter;
    operatorAuth?: {
      token: string;
      headerName?: string;
    };
    externalClientAuth?: {
      enabled?: boolean;
      maxRequestAgeMs?: number;
      clientIdHeaderName?: string;
      requestTimestampHeaderName?: string;
      signatureHeaderName?: string;
    };
  }
): SeededSqliteAfalHttpServer {
  const worker =
    canRunNotificationOutboxWorker(options?.notifications)
      ? new SettlementNotificationOutboxWorker(options.notifications, {
          intervalMs: options?.notificationWorker?.intervalMs,
          onError: options?.notificationWorker?.onError,
        })
      : undefined;

  const sqlite = createSeededSqliteAfalHttpRouter(dataDir, {
    notifications: options?.notifications,
    notificationWorker: worker,
    paymentAdapter: options?.paymentAdapter,
    resourceAdapter: options?.resourceAdapter,
    operatorAuth: options?.operatorAuth,
    externalClientAuth: options?.externalClientAuth,
  });

  if (worker && options?.notificationWorker?.start !== false) {
    worker.start();
  }

  return {
    ...sqlite,
    server: createServer(createAfalNodeHttpRequestListener(sqlite)),
    notificationWorker: worker,
  };
}

export async function startSeededSqliteAfalHttpServer(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
  notifications?: SettlementNotificationPort;
  notificationWorker?: {
    intervalMs?: number;
    start?: boolean;
    onError?: (error: unknown) => void | Promise<void>;
  };
  paymentAdapter?: PaymentRailAdapter;
  resourceAdapter?: ResourceProviderAdapter;
  operatorAuth?: {
    token: string;
    headerName?: string;
  };
  externalClientAuth?: {
    enabled?: boolean;
    maxRequestAgeMs?: number;
    clientIdHeaderName?: string;
    requestTimestampHeaderName?: string;
    signatureHeaderName?: string;
  };
}): Promise<RunningSeededSqliteAfalHttpServer> {
  const dataDir = args?.dataDir ?? join(process.cwd(), ".afal-sqlite-http-data");
  const host = args?.host ?? DEFAULT_HOST;
  const port = args?.port ?? DEFAULT_PORT;
  const sqlite = createSeededSqliteAfalHttpServer(dataDir, {
    notifications: args?.notifications,
    notificationWorker: args?.notificationWorker,
    paymentAdapter: args?.paymentAdapter,
    resourceAdapter: args?.resourceAdapter,
    operatorAuth: args?.operatorAuth,
    externalClientAuth: args?.externalClientAuth,
  });

  await new Promise<void>((resolve, reject) => {
    sqlite.server.once("error", reject);
    sqlite.server.listen(port, host, () => {
      sqlite.server.off("error", reject);
      resolve();
    });
  });

  const address = sqlite.server.address();
  if (!address || typeof address === "string") {
    throw new Error("AFAL SQLite HTTP server did not bind to a TCP port");
  }

  return {
    ...sqlite,
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
    close: async () => {
      await sqlite.notificationWorker?.stop();
      await new Promise<void>((resolve, reject) => {
        sqlite.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function main(): Promise<void> {
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-sqlite-http-data");
  const host = process.argv[3] ?? DEFAULT_HOST;
  const port = Number(process.argv[4] ?? DEFAULT_PORT);
  const externalClientAuthEnabled =
    process.env.AFAL_EXTERNAL_CLIENT_AUTH === "true" ||
    process.env.AFAL_EXTERNAL_CLIENT_AUTH === "1";
  const externalClientAuthMaxRequestAgeMs = process.env.AFAL_EXTERNAL_CLIENT_AUTH_MAX_REQUEST_AGE_MS
    ? Number(process.env.AFAL_EXTERNAL_CLIENT_AUTH_MAX_REQUEST_AGE_MS)
    : undefined;

  const server = await startSeededSqliteAfalHttpServer({
    dataDir,
    host,
    port,
    externalClientAuth: externalClientAuthEnabled
      ? {
          enabled: true,
          maxRequestAgeMs: Number.isFinite(externalClientAuthMaxRequestAgeMs)
            ? externalClientAuthMaxRequestAgeMs
            : undefined,
        }
      : undefined,
  });

  console.log(
    JSON.stringify(
      {
        dataDir: server.dataDir,
        host: server.host,
        port: server.port,
        url: server.url,
        paths: server.paths,
        externalClientAuth: {
          enabled: externalClientAuthEnabled,
          maxRequestAgeMs:
            Number.isFinite(externalClientAuthMaxRequestAgeMs) &&
            externalClientAuthMaxRequestAgeMs !== undefined
              ? externalClientAuthMaxRequestAgeMs
              : null,
        },
      },
      null,
      2
    )
  );
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
