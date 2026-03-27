import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type RequestListener, type Server } from "node:http";
import { pathToFileURL } from "node:url";

import type { AuthorizationDecision, PaymentIntent, SettlementRecord } from "../../sdk/types";
import { createSeededPaymentRailAdapter } from "../../backend/afal/settlement";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3412;

export const PAYMENT_RAIL_SERVICE_ROUTES = {
  health: "/health",
  executePayment: "/payments/execute",
} as const;

interface PaymentRailRequestBody {
  requestRef: string;
  input: {
    intent: PaymentIntent;
    decision: AuthorizationDecision;
  };
}

type PaymentRailResponseBody =
  | {
      ok: true;
      requestRef: string;
      data: SettlementRecord | { status: "ok"; service: "payment-rail-stub" };
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

export interface PaymentRailServiceState {
  executePaymentAttempts: number;
  executePaymentFailuresRemaining: number;
}

export interface PaymentRailFailurePlan {
  executePaymentFailuresBeforeSuccess?: number;
}

export interface PaymentRailServiceAuth {
  token: string;
  headerName?: string;
  serviceIdHeaderName?: string;
  requestTimestampHeaderName?: string;
  signatureHeaderName?: string;
  signingKey: string;
}

export interface RunningPaymentRailStubServer {
  server: Server;
  host: string;
  port: number;
  url: string;
  state: PaymentRailServiceState;
  close(): Promise<void>;
}

function stringifyResponse(statusCode: number, body: PaymentRailResponseBody) {
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

export function createPaymentRailServiceState(
  plan?: PaymentRailFailurePlan
): PaymentRailServiceState {
  return {
    executePaymentAttempts: 0,
    executePaymentFailuresRemaining: Math.max(0, plan?.executePaymentFailuresBeforeSuccess ?? 0),
  };
}

function isAuthorized(
  requestRef: string,
  headers: Record<string, string | undefined> | undefined,
  auth: PaymentRailServiceAuth | undefined
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
      message: `Missing or invalid payment rail service token in header "${auth.headerName ?? "x-afal-service-token"}"`,
    };
  }

  const expected = createHash("sha256")
    .update(`${serviceId}:${requestRef}:${timestamp}:${auth.signingKey}`)
    .digest("hex");

  if (signature !== expected) {
    return {
      ok: false,
      code: "service-signature-invalid",
      message: "Invalid payment rail request signature",
    };
  }

  return { ok: true };
}

function isExecuteRequest(body: unknown): body is PaymentRailRequestBody {
  return Boolean(
    body &&
      typeof body === "object" &&
      "requestRef" in body &&
      typeof body.requestRef === "string" &&
      "input" in body &&
      body.input &&
      typeof body.input === "object" &&
      "intent" in body.input &&
      "decision" in body.input
  );
}

export async function handlePaymentRailNodeHttpRequest(request: {
  method?: string;
  url?: string;
  bodyText?: string;
  headers?: Record<string, string | undefined>;
}, state: PaymentRailServiceState = createPaymentRailServiceState(), auth?: PaymentRailServiceAuth) {
  const method = request.method ?? "GET";
  const pathname = new URL(request.url ?? "/", `http://${DEFAULT_HOST}`).pathname;

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.health) {
    if (method !== "GET") {
      return buildFailure("health", 405, "method-not-allowed", "health only supports GET");
    }
    return stringifyResponse(200, {
      ok: true,
      requestRef: "health",
      data: {
        status: "ok",
        service: "payment-rail-stub",
      },
    });
  }

  if (pathname === PAYMENT_RAIL_SERVICE_ROUTES.executePayment) {
    if (method !== "POST") {
      return buildFailure(
        "unknown",
        405,
        "method-not-allowed",
        "payments/execute only supports POST"
      );
    }

    let body: unknown;
    try {
      body = request.bodyText ? JSON.parse(request.bodyText) : undefined;
    } catch {
      return buildFailure("unknown", 400, "bad-request", "request body must be valid JSON");
    }

    if (!isExecuteRequest(body)) {
      return buildFailure(
        "unknown",
        400,
        "bad-request",
        "request body must include requestRef and input.intent/input.decision"
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
      state.executePaymentAttempts += 1;
      if (state.executePaymentFailuresRemaining > 0) {
        state.executePaymentFailuresRemaining -= 1;
        return buildFailure(
          body.requestRef,
          503,
          "transient-upstream-unavailable",
          "payment rail stub is temporarily unavailable"
        );
      }
      const data = await createSeededPaymentRailAdapter().executePayment(
        body.input.intent,
        body.input.decision
      );
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
        error instanceof Error ? error.message : "payment rail execution failed"
      );
    }
  }

  return buildFailure("unknown", 404, "not-found", `unknown payment rail route: ${pathname}`);
}

export function createPaymentRailRequestListener(
  state: PaymentRailServiceState = createPaymentRailServiceState(),
  auth?: PaymentRailServiceAuth
): RequestListener {
  return async (request, response) => {
    try {
      const result = await handlePaymentRailNodeHttpRequest({
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
        error instanceof Error ? error.message : "Unhandled payment rail server error"
      );
      response.writeHead(result.statusCode, result.headers);
      response.end(result.bodyText);
    }
  };
}

export async function startPaymentRailStubServer(args?: {
  host?: string;
  port?: number;
  failurePlan?: PaymentRailFailurePlan;
  auth?: PaymentRailServiceAuth;
}): Promise<RunningPaymentRailStubServer> {
  const host = args?.host ?? DEFAULT_HOST;
  const port = args?.port ?? DEFAULT_PORT;
  const state = createPaymentRailServiceState(args?.failurePlan);
  const server = createServer(createPaymentRailRequestListener(state, args?.auth));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("payment rail stub server did not bind to a TCP port");
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
  const token = process.env.PAYMENT_RAIL_TOKEN;
  const signingKey = process.env.PAYMENT_RAIL_SIGNING_KEY;
  const server = await startPaymentRailStubServer({
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
