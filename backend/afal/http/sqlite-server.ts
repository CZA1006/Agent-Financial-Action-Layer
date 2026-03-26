import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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
  | "getApprovalSession"
  | "applyApprovalResult"
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
  if (pathname === AFAL_HTTP_ROUTES.getApprovalSession) {
    return "getApprovalSession";
  }
  if (pathname === AFAL_HTTP_ROUTES.applyApprovalResult) {
    return "applyApprovalResult";
  }
  if (pathname === AFAL_HTTP_ROUTES.resumeApprovalSession) {
    return "resumeApprovalSession";
  }
  if (pathname === AFAL_HTTP_ROUTES.resumeApprovedAction) {
    return "resumeApprovedAction";
  }
  return "executePayment";
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

export function createSeededSqliteAfalHttpServer(dataDir: string): SeededSqliteAfalHttpServer {
  const sqlite = createSeededSqliteAfalHttpRouter(dataDir);

  return {
    ...sqlite,
    server: createServer(createAfalNodeHttpRequestListener(sqlite)),
  };
}

export async function startSeededSqliteAfalHttpServer(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
}): Promise<RunningSeededSqliteAfalHttpServer> {
  const dataDir = args?.dataDir ?? join(process.cwd(), ".afal-sqlite-http-data");
  const host = args?.host ?? DEFAULT_HOST;
  const port = args?.port ?? DEFAULT_PORT;
  const sqlite = createSeededSqliteAfalHttpServer(dataDir);

  await new Promise<void>((resolve, reject) => {
    sqlite.server.once("error", reject);
    sqlite.server.listen(port, host, () => {
      sqlite.server.off("error", reject);
      resolve();
    });
  });

  return {
    ...sqlite,
    host,
    port,
    url: `http://${host}:${port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        sqlite.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function main(): Promise<void> {
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-sqlite-http-data");
  const host = process.argv[3] ?? DEFAULT_HOST;
  const port = Number(process.argv[4] ?? DEFAULT_PORT);

  const server = await startSeededSqliteAfalHttpServer({
    dataDir,
    host,
    port,
  });

  console.log(
    JSON.stringify(
      {
        dataDir: server.dataDir,
        host: server.host,
        port: server.port,
        url: server.url,
        paths: server.paths,
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
