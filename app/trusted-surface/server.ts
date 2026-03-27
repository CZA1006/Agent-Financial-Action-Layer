import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { pathToFileURL } from "node:url";

import type { ApprovalResult, IdRef, Timestamp } from "../../sdk/types";
import {
  createTrustedSurfaceHttpClient,
  runTrustedSurfaceStub,
  type TrustedSurfaceStubClient,
  type TrustedSurfaceStubRunResult,
} from "./stub";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3312;

export const TRUSTED_SURFACE_SERVICE_ROUTES = {
  health: "/health",
  reviewApprovalSession: "/approval-sessions/review",
} as const;

export interface TrustedSurfaceServiceReviewInput {
  approvalSessionRef: IdRef;
  requestRefPrefix?: string;
  result?: ApprovalResult["result"];
  approvedBy?: string;
  approvalChannel?: string;
  stepUpAuthUsed?: boolean;
  comment?: string;
  approvalResultId?: IdRef;
  approvalReceiptRef?: IdRef;
  decidedAt?: Timestamp;
  resumeAction?: boolean;
}

export interface TrustedSurfaceServiceReviewRequest {
  requestRef: string;
  input: TrustedSurfaceServiceReviewInput;
}

export interface TrustedSurfaceServiceSuccess<T> {
  ok: true;
  requestRef: string;
  data: T;
}

export interface TrustedSurfaceServiceFailure {
  ok: false;
  requestRef: string;
  statusCode: number;
  error: {
    code: "bad-request" | "not-found" | "method-not-allowed" | "internal-error";
    message: string;
  };
}

export type TrustedSurfaceServiceResponseBody =
  | TrustedSurfaceServiceSuccess<TrustedSurfaceStubRunResult>
  | TrustedSurfaceServiceSuccess<{
      status: "ok";
      service: "trusted-surface-stub";
    }>
  | TrustedSurfaceServiceFailure;

export interface TrustedSurfaceNodeHttpTransportRequest {
  method?: string;
  url?: string;
  bodyText?: string;
}

export interface TrustedSurfaceNodeHttpTransportResponse {
  statusCode: number;
  headers: {
    "content-type": "application/json";
    "content-length": string;
  };
  bodyText: string;
}

export interface RunningTrustedSurfaceStubServer {
  server: Server;
  host: string;
  port: number;
  url: string;
  afalBaseUrl: string;
  close(): Promise<void>;
}

export interface TrustedSurfaceServiceHttpClient {
  reviewApprovalSession(
    request: TrustedSurfaceServiceReviewRequest
  ): Promise<TrustedSurfaceStubRunResult>;
}

function stringifyResponse(
  statusCode: number,
  body: TrustedSurfaceServiceResponseBody
): TrustedSurfaceNodeHttpTransportResponse {
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

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function buildFailure(
  requestRef: string,
  statusCode: number,
  code: TrustedSurfaceServiceFailure["error"]["code"],
  message: string
): TrustedSurfaceNodeHttpTransportResponse {
  return stringifyResponse(statusCode, {
    ok: false,
    requestRef,
    statusCode,
    error: {
      code,
      message,
    },
  });
}

function isReviewRequestBody(body: unknown): body is TrustedSurfaceServiceReviewRequest {
  return Boolean(
    body &&
      typeof body === "object" &&
      "requestRef" in body &&
      typeof body.requestRef === "string" &&
      body.requestRef.length > 0 &&
      "input" in body &&
      body.input &&
      typeof body.input === "object" &&
      "approvalSessionRef" in body.input &&
      typeof body.input.approvalSessionRef === "string" &&
      body.input.approvalSessionRef.length > 0
  );
}

export async function handleTrustedSurfaceNodeHttpRequest(
  client: TrustedSurfaceStubClient,
  request: TrustedSurfaceNodeHttpTransportRequest
): Promise<TrustedSurfaceNodeHttpTransportResponse> {
  const method = request.method ?? "GET";
  const pathname = new URL(request.url ?? "/", `http://${DEFAULT_HOST}`).pathname;

  if (pathname === TRUSTED_SURFACE_SERVICE_ROUTES.health) {
    if (method !== "GET") {
      return buildFailure("health", 405, "method-not-allowed", "health only supports GET");
    }

    return stringifyResponse(200, {
      ok: true,
      requestRef: "health",
      data: {
        status: "ok",
        service: "trusted-surface-stub",
      },
    });
  }

  if (pathname === TRUSTED_SURFACE_SERVICE_ROUTES.reviewApprovalSession) {
    if (method !== "POST") {
      return buildFailure(
        "unknown",
        405,
        "method-not-allowed",
        "reviewApprovalSession only supports POST"
      );
    }

    let body: unknown;
    try {
      body = request.bodyText ? JSON.parse(request.bodyText) : undefined;
    } catch {
      return buildFailure("unknown", 400, "bad-request", "request body must be valid JSON");
    }

    if (!isReviewRequestBody(body)) {
      return buildFailure(
        "unknown",
        400,
        "bad-request",
        "request body must include requestRef and input.approvalSessionRef"
      );
    }

    try {
      const data = await runTrustedSurfaceStub(client, body.input);
      return stringifyResponse(200, {
        ok: true,
        requestRef: body.requestRef,
        data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "trusted-surface review failed";
      const code = /404|not found|unknown/i.test(message) ? "not-found" : "internal-error";
      const statusCode = code === "not-found" ? 404 : 500;
      return buildFailure(body.requestRef, statusCode, code, message);
    }
  }

  return buildFailure("unknown", 404, "not-found", `unknown trusted-surface route: ${pathname}`);
}

export function createTrustedSurfaceRequestListener(
  client: TrustedSurfaceStubClient
): RequestListener {
  return async (request, response) => {
    try {
      const bodyText = await readRequestBody(request);
      const result = await handleTrustedSurfaceNodeHttpRequest(client, {
        method: request.method,
        url: request.url,
        bodyText,
      });

      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    } catch (error) {
      const result = buildFailure(
        "unknown",
        500,
        "internal-error",
        error instanceof Error ? error.message : "Unhandled trusted-surface server error"
      );
      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    }
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as TrustedSurfaceServiceSuccess<T> | TrustedSurfaceServiceFailure;

  if (!body.ok) {
    throw new Error(
      `trusted-surface request failed [${body.statusCode} ${body.error.code}] ${body.error.message}`
    );
  }

  return body.data;
}

export function createTrustedSurfaceServiceHttpClient(
  baseUrl: string
): TrustedSurfaceServiceHttpClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    async reviewApprovalSession(request) {
      const response = await fetch(
        `${normalizedBaseUrl}${TRUSTED_SURFACE_SERVICE_ROUTES.reviewApprovalSession}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );

      return parseResponse<TrustedSurfaceStubRunResult>(response);
    },
  };
}

export async function startTrustedSurfaceStubServer(args: {
  afalBaseUrl: string;
  host?: string;
  port?: number;
}): Promise<RunningTrustedSurfaceStubServer> {
  const host = args.host ?? DEFAULT_HOST;
  const port = args.port ?? DEFAULT_PORT;
  const client = createTrustedSurfaceHttpClient(args.afalBaseUrl);
  const server = createServer(createTrustedSurfaceRequestListener(client));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("trusted-surface stub server did not bind to a TCP port");
  }

  return {
    server,
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
    afalBaseUrl: args.afalBaseUrl,
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
  };
}

function readOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function assertOption(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`Missing required option: ${flag}`);
  }
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const afalBaseUrl = assertOption(readOption(args, "--afal-base-url"), "--afal-base-url");
  const host = readOption(args, "--host") ?? DEFAULT_HOST;
  const port = Number(readOption(args, "--port") ?? DEFAULT_PORT);

  const server = await startTrustedSurfaceStubServer({
    afalBaseUrl,
    host,
    port,
  });

  console.log(
    JSON.stringify(
      {
        host: server.host,
        port: server.port,
        url: server.url,
        afalBaseUrl: server.afalBaseUrl,
        paths: TRUSTED_SURFACE_SERVICE_ROUTES,
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
