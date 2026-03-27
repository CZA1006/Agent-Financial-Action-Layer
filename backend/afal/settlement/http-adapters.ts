import { createHash } from "node:crypto";

import type {
  AuthorizationDecision,
  PaymentIntent,
  ResourceIntent,
  SettlementRecord,
} from "../../../sdk/types";
import type { ProviderUsageConfirmation } from "../interfaces";
import type { PaymentRailAdapter, ResourceProviderAdapter } from "./interfaces";

export interface HttpPaymentRailAdapterOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  retry?: HttpExternalAdapterRetryOptions;
  auth?: HttpExternalAdapterAuthOptions;
}

export interface HttpResourceProviderAdapterOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  retry?: HttpExternalAdapterRetryOptions;
  auth?: HttpExternalAdapterAuthOptions;
}

export interface HttpExternalAdapterRetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  retryableStatusCodes?: number[];
}

export interface HttpExternalAdapterAuthOptions {
  token: string;
  serviceId: string;
  signingKey: string;
  headerName?: string;
  serviceIdHeaderName?: string;
  requestTimestampHeaderName?: string;
  signatureHeaderName?: string;
}

interface ServiceFailure {
  ok: false;
  requestRef: string;
  statusCode: number;
  error: {
    code: string;
    message: string;
  };
}

interface ServiceSuccess<T> {
  ok: true;
  requestRef: string;
  data: T;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildServiceAuthHeaders(
  requestRef: string,
  auth: HttpExternalAdapterAuthOptions | undefined
): Record<string, string> {
  if (!auth) {
    return {};
  }

  const timestamp = new Date().toISOString();
  const tokenHeaderName = auth.headerName ?? "x-afal-service-token";
  const serviceIdHeaderName = auth.serviceIdHeaderName ?? "x-afal-service-id";
  const timestampHeaderName = auth.requestTimestampHeaderName ?? "x-afal-request-timestamp";
  const signatureHeaderName = auth.signatureHeaderName ?? "x-afal-request-signature";
  const signature = sha256(`${auth.serviceId}:${requestRef}:${timestamp}:${auth.signingKey}`);

  return {
    [tokenHeaderName]: auth.token,
    [serviceIdHeaderName]: auth.serviceId,
    [timestampHeaderName]: timestamp,
    [signatureHeaderName]: signature,
  };
}

export class ExternalAdapterRequestError extends Error {
  readonly statusCode?: number;
  readonly code?: string;

  constructor(message: string, options?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "ExternalAdapterRequestError";
    this.statusCode = options?.statusCode;
    this.code = options?.code;
  }
}

async function parseServiceResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ServiceSuccess<T> | ServiceFailure;
  if (!body.ok) {
    throw new ExternalAdapterRequestError(
      `external adapter request failed [${body.statusCode} ${body.error.code}] ${body.error.message}`,
      {
        statusCode: body.statusCode,
        code: body.error.code,
      }
    );
  }

  return body.data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retry?: HttpExternalAdapterRetryOptions
): Promise<T> {
  const maxAttempts = Math.max(1, retry?.maxAttempts ?? 1);
  const backoffMs = Math.max(0, retry?.backoffMs ?? 0);
  const retryableStatusCodes = new Set(retry?.retryableStatusCodes ?? [502, 503, 504]);

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      const retryable =
        error instanceof ExternalAdapterRequestError
          ? error.statusCode !== undefined && retryableStatusCodes.has(error.statusCode)
          : true;

      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      if (backoffMs > 0) {
        await sleep(backoffMs * attempt);
      }
    }
  }

  throw new Error("external adapter retry loop exhausted unexpectedly");
}

export class HttpPaymentRailAdapter implements PaymentRailAdapter {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly retry?: HttpExternalAdapterRetryOptions;
  private readonly auth?: HttpExternalAdapterAuthOptions;

  constructor(options: HttpPaymentRailAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.retry = options.retry;
    this.auth = options.auth;
  }

  async executePayment(
    intent: PaymentIntent,
    decision: AuthorizationDecision
  ): Promise<SettlementRecord> {
    return executeWithRetry(async () => {
      const requestRef = `req-payment-rail-${intent.intentId}`;
      const response = await this.fetchImpl(`${this.baseUrl}/payments/execute`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...buildServiceAuthHeaders(requestRef, this.auth),
        },
        body: JSON.stringify({
          requestRef,
          input: {
            intent,
            decision,
          },
        }),
      });

      return parseServiceResponse<SettlementRecord>(response);
    }, this.retry);
  }
}

export class HttpResourceProviderAdapter implements ResourceProviderAdapter {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly retry?: HttpExternalAdapterRetryOptions;
  private readonly auth?: HttpExternalAdapterAuthOptions;

  constructor(options: HttpResourceProviderAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.retry = options.retry;
    this.auth = options.auth;
  }

  async confirmResourceUsage(intent: ResourceIntent): Promise<ProviderUsageConfirmation> {
    return executeWithRetry(async () => {
      const requestRef = `req-provider-usage-${intent.intentId}`;
      const response = await this.fetchImpl(`${this.baseUrl}/resource-usage/confirm`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...buildServiceAuthHeaders(requestRef, this.auth),
        },
        body: JSON.stringify({
          requestRef,
          input: {
            intent,
          },
        }),
      });

      return parseServiceResponse<ProviderUsageConfirmation>(response);
    }, this.retry);
  }

  async settleResourceUsage(args: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  }): Promise<SettlementRecord> {
    return executeWithRetry(async () => {
      const requestRef = `req-provider-settlement-${args.intent.intentId}`;
      const response = await this.fetchImpl(`${this.baseUrl}/resource-settlements/settle`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...buildServiceAuthHeaders(requestRef, this.auth),
        },
        body: JSON.stringify({
          requestRef,
          input: args,
        }),
      });

      return parseServiceResponse<SettlementRecord>(response);
    }, this.retry);
  }
}
