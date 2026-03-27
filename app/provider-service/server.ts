import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { pathToFileURL } from "node:url";

import type {
  AuthorizationDecision,
  ResourceIntent,
  SettlementRecord,
} from "../../sdk/types";
import type { ProviderUsageConfirmation } from "../../backend/afal/interfaces";
import { createSeededResourceProviderAdapter } from "../../backend/afal/settlement";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3413;

export const PROVIDER_SERVICE_ROUTES = {
  health: "/health",
  confirmUsage: "/resource-usage/confirm",
  settleResourceUsage: "/resource-settlements/settle",
} as const;

type ProviderServiceResponseBody =
  | {
      ok: true;
      requestRef: string;
      data:
        | ProviderUsageConfirmation
        | SettlementRecord
        | { status: "ok"; service: "provider-service-stub" };
    }
  | {
      ok: false;
      requestRef: string;
      statusCode: number;
      error: {
        code: string;
        message: string;
      };
    };

export interface ProviderServiceState {
  confirmUsageAttempts: number;
  settleResourceUsageAttempts: number;
  confirmUsageFailuresRemaining: number;
  settleResourceUsageFailuresRemaining: number;
}

export interface ProviderServiceFailurePlan {
  confirmUsageFailuresBeforeSuccess?: number;
  settleResourceUsageFailuresBeforeSuccess?: number;
}

export interface ProviderServiceAuth {
  token: string;
  headerName?: string;
  serviceIdHeaderName?: string;
  requestTimestampHeaderName?: string;
  signatureHeaderName?: string;
  signingKey: string;
}

interface ConfirmUsageRequestBody {
  requestRef: string;
  input: {
    intent: ResourceIntent;
  };
}

interface SettleUsageRequestBody {
  requestRef: string;
  input: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  };
}

export interface RunningProviderServiceStubServer {
  server: Server;
  host: string;
  port: number;
  url: string;
  state: ProviderServiceState;
  close(): Promise<void>;
}

function stringifyResponse(statusCode: number, body: ProviderServiceResponseBody) {
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

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function buildFailure(
  requestRef: string,
  statusCode: number,
  code: string,
  message: string
) {
  return stringifyResponse(statusCode, {
    ok: false,
    requestRef,
    statusCode,
    error: { code, message },
  });
}

export function createProviderServiceState(
  plan?: ProviderServiceFailurePlan
): ProviderServiceState {
  return {
    confirmUsageAttempts: 0,
    settleResourceUsageAttempts: 0,
    confirmUsageFailuresRemaining: Math.max(0, plan?.confirmUsageFailuresBeforeSuccess ?? 0),
    settleResourceUsageFailuresRemaining: Math.max(
      0,
      plan?.settleResourceUsageFailuresBeforeSuccess ?? 0
    ),
  };
}

function isAuthorized(
  requestRef: string,
  headers: Record<string, string | undefined> | undefined,
  auth: ProviderServiceAuth | undefined
): { ok: true } | { ok: false; code: string; message: string } {
  if (!auth) {
    return { ok: true };
  }

  const tokenHeaderName = (auth.headerName ?? "x-afal-service-token").toLowerCase();
  const serviceIdHeaderName = (
    auth.serviceIdHeaderName ?? "x-afal-service-id"
  ).toLowerCase();
  const timestampHeaderName = (
    auth.requestTimestampHeaderName ?? "x-afal-request-timestamp"
  ).toLowerCase();
  const signatureHeaderName = (
    auth.signatureHeaderName ?? "x-afal-request-signature"
  ).toLowerCase();

  const token = headers?.[tokenHeaderName];
  const serviceId = headers?.[serviceIdHeaderName];
  const timestamp = headers?.[timestampHeaderName];
  const signature = headers?.[signatureHeaderName];

  if (!token || !serviceId || !timestamp || !signature) {
    return {
      ok: false,
      code: "service-auth-required",
      message:
        `Missing service auth metadata in headers "${auth.headerName ?? "x-afal-service-token"}", ` +
        `"${auth.serviceIdHeaderName ?? "x-afal-service-id"}", ` +
        `"${auth.requestTimestampHeaderName ?? "x-afal-request-timestamp"}", ` +
        `or "${auth.signatureHeaderName ?? "x-afal-request-signature"}"`,
    };
  }

  if (token !== auth.token) {
    return {
      ok: false,
      code: "service-auth-required",
      message: `Missing or invalid provider service token in header "${auth.headerName ?? "x-afal-service-token"}"`,
    };
  }

  const expected = createHash("sha256")
    .update(`${serviceId}:${requestRef}:${timestamp}:${auth.signingKey}`)
    .digest("hex");

  if (signature !== expected) {
    return {
      ok: false,
      code: "service-signature-invalid",
      message: "Invalid provider service request signature",
    };
  }

  return { ok: true };
}

function isConfirmUsageRequest(body: unknown): body is ConfirmUsageRequestBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "requestRef" in body &&
      typeof body.requestRef === "string" &&
      "input" in body &&
      body.input &&
      typeof body.input === "object" &&
      "intent" in body.input
  );
}

function isSettleUsageRequest(body: unknown): body is SettleUsageRequestBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "requestRef" in body &&
      typeof body.requestRef === "string" &&
      "input" in body &&
      body.input &&
      typeof body.input === "object" &&
      "intent" in body.input &&
      "decision" in body.input &&
      "usage" in body.input
  );
}

export async function handleProviderServiceNodeHttpRequest(request: {
  method?: string;
  url?: string;
  bodyText?: string;
  headers?: Record<string, string | undefined>;
}, state: ProviderServiceState = createProviderServiceState(), auth?: ProviderServiceAuth) {
  const method = request.method ?? "GET";
  const pathname = new URL(request.url ?? "/", `http://${DEFAULT_HOST}`).pathname;
  const adapter = createSeededResourceProviderAdapter();

  if (pathname === PROVIDER_SERVICE_ROUTES.health) {
    if (method !== "GET") {
      return buildFailure("health", 405, "method-not-allowed", "health only supports GET");
    }
    return stringifyResponse(200, {
      ok: true,
      requestRef: "health",
      data: {
        status: "ok",
        service: "provider-service-stub",
      },
    });
  }

  let body: unknown;
  if (method === "POST") {
    try {
      body = request.bodyText ? JSON.parse(request.bodyText) : undefined;
    } catch {
      return buildFailure("unknown", 400, "bad-request", "request body must be valid JSON");
    }
  }

  if (pathname === PROVIDER_SERVICE_ROUTES.confirmUsage) {
    if (method !== "POST") {
      return buildFailure(
        "unknown",
        405,
        "method-not-allowed",
        "resource-usage/confirm only supports POST"
      );
    }
    if (!isConfirmUsageRequest(body)) {
      return buildFailure(
        "unknown",
        400,
        "bad-request",
        "request body must include requestRef and input.intent"
      );
    }
    const authResult = isAuthorized(body.requestRef, request.headers, auth);
    if (!authResult.ok) {
      return buildFailure(
        body.requestRef,
        403,
        authResult.code,
        authResult.message
      );
    }
    try {
      state.confirmUsageAttempts += 1;
      if (state.confirmUsageFailuresRemaining > 0) {
        state.confirmUsageFailuresRemaining -= 1;
        return buildFailure(
          body.requestRef,
          503,
          "transient-upstream-unavailable",
          "provider usage confirmation is temporarily unavailable"
        );
      }
      const data = await adapter.confirmResourceUsage(body.input.intent);
      return stringifyResponse(200, {
        ok: true,
        requestRef: body.requestRef,
        data,
      });
    } catch (error) {
      return buildFailure(
        body.requestRef,
        500,
        "internal-error",
        error instanceof Error ? error.message : "resource usage confirmation failed"
      );
    }
  }

  if (pathname === PROVIDER_SERVICE_ROUTES.settleResourceUsage) {
    if (method !== "POST") {
      return buildFailure(
        "unknown",
        405,
        "method-not-allowed",
        "resource-settlements/settle only supports POST"
      );
    }
    if (!isSettleUsageRequest(body)) {
      return buildFailure(
        "unknown",
        400,
        "bad-request",
        "request body must include requestRef and input.intent/input.decision/input.usage"
      );
    }
    const authResult = isAuthorized(body.requestRef, request.headers, auth);
    if (!authResult.ok) {
      return buildFailure(
        body.requestRef,
        403,
        authResult.code,
        authResult.message
      );
    }
    try {
      state.settleResourceUsageAttempts += 1;
      if (state.settleResourceUsageFailuresRemaining > 0) {
        state.settleResourceUsageFailuresRemaining -= 1;
        return buildFailure(
          body.requestRef,
          503,
          "transient-upstream-unavailable",
          "provider settlement is temporarily unavailable"
        );
      }
      const data = await adapter.settleResourceUsage(body.input);
      return stringifyResponse(200, {
        ok: true,
        requestRef: body.requestRef,
        data,
      });
    } catch (error) {
      return buildFailure(
        body.requestRef,
        500,
        "internal-error",
        error instanceof Error ? error.message : "resource settlement failed"
      );
    }
  }

  return buildFailure("unknown", 404, "not-found", `unknown provider service route: ${pathname}`);
}

export function createProviderServiceRequestListener(
  state: ProviderServiceState = createProviderServiceState(),
  auth?: ProviderServiceAuth
): RequestListener {
  return async (request, response) => {
    try {
      const result = await handleProviderServiceNodeHttpRequest({
        method: request.method,
        url: request.url,
        bodyText: await readBody(request),
        headers: Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key.toLowerCase(),
            Array.isArray(value) ? value.join(", ") : value,
          ])
        ),
      }, state, auth);
      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    } catch (error) {
      const result = buildFailure(
        "unknown",
        500,
        "internal-error",
        error instanceof Error ? error.message : "Unhandled provider service server error"
      );
      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    }
  };
}

export async function startProviderServiceStubServer(args?: {
  host?: string;
  port?: number;
  failurePlan?: ProviderServiceFailurePlan;
  auth?: ProviderServiceAuth;
}): Promise<RunningProviderServiceStubServer> {
  const host = args?.host ?? DEFAULT_HOST;
  const port = args?.port ?? DEFAULT_PORT;
  const state = createProviderServiceState(args?.failurePlan);
  const server = createServer(createProviderServiceRequestListener(state, args?.auth));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("provider service stub server did not bind to a TCP port");
  }

  return {
    server,
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
    state,
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

async function main(): Promise<void> {
  const host = process.argv[2] ?? DEFAULT_HOST;
  const port = Number(process.argv[3] ?? DEFAULT_PORT);
  const token = process.env.PROVIDER_SERVICE_TOKEN;
  const signingKey = process.env.PROVIDER_SERVICE_SIGNING_KEY;
  const server = await startProviderServiceStubServer({
    host,
    port,
    auth: token && signingKey
      ? {
          token,
          signingKey,
        }
      : undefined,
  });
  console.log(JSON.stringify({ host: server.host, port: server.port, url: server.url }, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
