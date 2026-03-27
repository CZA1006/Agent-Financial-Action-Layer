import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { AfalHttpResponseBody } from "./types";
import { AFAL_HTTP_ROUTES } from "./types";
import {
  createSeededDurableAfalHttpRouter,
  type SeededDurableAfalHttpRouter,
} from "./durable";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3212;

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

export interface SeededDurableAfalHttpServer extends SeededDurableAfalHttpRouter {
  server: Server;
}

export interface RunningSeededDurableAfalHttpServer extends SeededDurableAfalHttpServer {
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
  | "getAdminAuditEntry"
  | "listAdminAuditEntries"
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
  if (pathname === AFAL_HTTP_ROUTES.getActionStatus) {
    return "getActionStatus";
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
  durable: SeededDurableAfalHttpRouter,
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

  const response = await durable.router.handle({
    method: request.method ?? "GET",
    path: pathname,
    body,
    headers: request.headers,
  });

  return stringifyNodeResponse(response.statusCode, response.body);
}

export function createAfalNodeHttpRequestListener(
  durable: SeededDurableAfalHttpRouter
): RequestListener {
  return async (request, response) => {
    try {
      const bodyText = await readRequestBody(request);
      const result = await handleAfalNodeHttpRequest(durable, {
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

export function createSeededDurableAfalHttpServer(
  dataDir: string,
  options?: {
    operatorAuth?: {
      token: string;
      headerName?: string;
    };
  }
): SeededDurableAfalHttpServer {
  const durable = createSeededDurableAfalHttpRouter(dataDir, options);

  return {
    ...durable,
    server: createServer(createAfalNodeHttpRequestListener(durable)),
  };
}

export async function startSeededDurableAfalHttpServer(args?: {
  dataDir?: string;
  host?: string;
  port?: number;
  operatorAuth?: {
    token: string;
    headerName?: string;
  };
}): Promise<RunningSeededDurableAfalHttpServer> {
  const dataDir = args?.dataDir ?? join(process.cwd(), ".afal-durable-http-data");
  const host = args?.host ?? DEFAULT_HOST;
  const port = args?.port ?? DEFAULT_PORT;
  const durable = createSeededDurableAfalHttpServer(dataDir, {
    operatorAuth: args?.operatorAuth,
  });

  await new Promise<void>((resolve, reject) => {
    durable.server.once("error", reject);
    durable.server.listen(port, host, () => {
      durable.server.off("error", reject);
      resolve();
    });
  });

  return {
    ...durable,
    host,
    port,
    url: `http://${host}:${port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        durable.server.close((error) => {
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
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-durable-http-data");
  const host = process.argv[3] ?? DEFAULT_HOST;
  const port = Number(process.argv[4] ?? DEFAULT_PORT);

  const server = await startSeededDurableAfalHttpServer({
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
