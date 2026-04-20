import { createHash, randomBytes } from "node:crypto";

import type { Did, IdRef } from "../../../sdk/types";
import type {
  ExternalAgentClientRecord,
  ExternalAgentClientStore,
  ExternalAgentEventType,
  ExternalAgentReplayRecord,
} from "./store";
import { InMemoryExternalAgentClientStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class ExternalAgentAuthError extends Error {
  readonly code:
    | "client-auth-required"
    | "request-replay-detected"
    | "subject-scope-violation";
  readonly statusCode: 403 | 409;

  constructor(
    message: string,
    options: {
      code:
        | "client-auth-required"
        | "request-replay-detected"
        | "subject-scope-violation";
      statusCode: 403 | 409;
    }
  ) {
    super(message);
    this.name = "ExternalAgentAuthError";
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}

export interface ExternalAgentAuthenticationRequest {
  clientId?: IdRef;
  requestRef: IdRef;
  timestamp?: string;
  signature?: string;
  subjectDid?: Did;
}

export interface ExternalAgentClientServiceOptions {
  store?: ExternalAgentClientStore;
  now?: () => Date;
  maxRequestAgeMs?: number;
}

export interface ExternalAgentProvisioningInput {
  clientId: IdRef;
  tenantId: IdRef;
  agentId: IdRef;
  subjectDid: Did;
  mandateRefs: IdRef[];
  monetaryBudgetRefs?: IdRef[];
  resourceBudgetRefs?: IdRef[];
  resourceQuotaRefs?: IdRef[];
  paymentPayeeDid?: Did;
  resourceProviderDid?: Did;
  paymentSettlementUrl?: string;
  resourceSettlementUrl?: string;
  eventTypes?: ExternalAgentEventType[];
}

export class ExternalAgentClientService {
  private readonly store: ExternalAgentClientStore;
  private readonly now: () => Date;
  private readonly maxRequestAgeMs: number;

  constructor(options: ExternalAgentClientServiceOptions = {}) {
    this.store = options.store ?? new InMemoryExternalAgentClientStore();
    this.now = options.now ?? (() => new Date());
    this.maxRequestAgeMs = Math.max(1, options.maxRequestAgeMs ?? 5 * 60_000);
  }

  async getClient(clientId: IdRef): Promise<ExternalAgentClientRecord> {
    const client = await this.store.getClient(clientId);
    if (!client) {
      throw new ExternalAgentAuthError(`Unknown external agent client "${clientId}"`, {
        code: "client-auth-required",
        statusCode: 403,
      });
    }
    return client;
  }

  async listClients(): Promise<ExternalAgentClientRecord[]> {
    return this.store.listClients();
  }

  async provisionClient(
    input: ExternalAgentProvisioningInput
  ): Promise<ExternalAgentClientRecord> {
    const timestamp = this.now().toISOString();
    const signingKey = randomBytes(16).toString("hex");
    const client: ExternalAgentClientRecord = {
      clientId: input.clientId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      subjectDid: input.subjectDid,
      mandateRefs: [...input.mandateRefs],
      monetaryBudgetRefs: input.monetaryBudgetRefs ? [...input.monetaryBudgetRefs] : undefined,
      resourceBudgetRefs: input.resourceBudgetRefs ? [...input.resourceBudgetRefs] : undefined,
      resourceQuotaRefs: input.resourceQuotaRefs ? [...input.resourceQuotaRefs] : undefined,
      paymentPayeeDid: input.paymentPayeeDid,
      resourceProviderDid: input.resourceProviderDid,
      callbackRegistration:
        input.paymentSettlementUrl || input.resourceSettlementUrl
          ? {
              eventTypes:
                input.eventTypes ??
                ([
                  input.paymentSettlementUrl ? "payment.settled" : undefined,
                  input.resourceSettlementUrl ? "resource.settled" : undefined,
                ].filter(Boolean) as ExternalAgentEventType[]),
              paymentSettlementUrl: input.paymentSettlementUrl,
              resourceSettlementUrl: input.resourceSettlementUrl,
            }
          : undefined,
      auth: {
        signingKey,
        active: true,
        createdAt: timestamp,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.store.putClient(client);
    return clone(client);
  }

  async authenticateRequest(
    request: ExternalAgentAuthenticationRequest
  ): Promise<ExternalAgentClientRecord> {
    if (!request.clientId || !request.timestamp || !request.signature) {
      throw new ExternalAgentAuthError(
        'Missing external client auth metadata in headers "x-afal-client-id", "x-afal-request-timestamp", or "x-afal-request-signature"',
        {
          code: "client-auth-required",
          statusCode: 403,
        }
      );
    }

    const client = await this.getClient(request.clientId);
    if (!client.auth.active) {
      throw new ExternalAgentAuthError(
        `External agent client "${request.clientId}" is inactive`,
        {
          code: "client-auth-required",
          statusCode: 403,
        }
      );
    }

    const requestTime = Date.parse(request.timestamp);
    if (!Number.isFinite(requestTime)) {
      throw new ExternalAgentAuthError("External agent request timestamp must be valid ISO time", {
        code: "client-auth-required",
        statusCode: 403,
      });
    }

    if (Math.abs(this.now().getTime() - requestTime) > this.maxRequestAgeMs) {
      throw new ExternalAgentAuthError(
        `External agent request timestamp is outside the allowed ${this.maxRequestAgeMs} ms window`,
        {
          code: "client-auth-required",
          statusCode: 403,
        }
      );
    }

    const expectedSignature = sha256(
      `${client.clientId}:${request.requestRef}:${request.timestamp}:${client.auth.signingKey}`
    );
    if (expectedSignature !== request.signature) {
      throw new ExternalAgentAuthError("External agent request signature is invalid", {
        code: "client-auth-required",
        statusCode: 403,
      });
    }

    if (request.subjectDid && request.subjectDid !== client.subjectDid) {
      throw new ExternalAgentAuthError(
        `External agent client "${client.clientId}" is not allowed to act for subjectDid "${request.subjectDid}"`,
        {
          code: "subject-scope-violation",
          statusCode: 403,
        }
      );
    }

    const replayKey = `${request.requestRef}:${request.timestamp}`;
    const existingReplay = await this.store.getReplayRecord(client.clientId, replayKey);
    if (existingReplay) {
      throw new ExternalAgentAuthError(
        `External agent request replay detected for client "${client.clientId}" and requestRef "${request.requestRef}"`,
        {
          code: "request-replay-detected",
          statusCode: 409,
        }
      );
    }

    const replayRecord: ExternalAgentReplayRecord = {
      clientId: client.clientId,
      replayKey,
      requestRef: request.requestRef,
      timestamp: request.timestamp,
      seenAt: this.now().toISOString(),
    };
    await this.store.putReplayRecord(replayRecord);
    return clone(client);
  }

  async getPaymentCallbackUrls(): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    for (const client of await this.store.listClients()) {
      const callbackUrl = client.callbackRegistration?.paymentSettlementUrl;
      if (client.paymentPayeeDid && callbackUrl) {
        urls[client.paymentPayeeDid] = callbackUrl;
      }
    }
    return urls;
  }

  async getResourceCallbackUrls(): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    for (const client of await this.store.listClients()) {
      const callbackUrl = client.callbackRegistration?.resourceSettlementUrl;
      if (client.resourceProviderDid && callbackUrl) {
        urls[client.resourceProviderDid] = callbackUrl;
      }
    }
    return urls;
  }

  async createSignedHeaders(args: {
    clientId: IdRef;
    requestRef: IdRef;
    timestamp?: string;
  }): Promise<Record<string, string>> {
    const client = await this.getClient(args.clientId);
    const timestamp = args.timestamp ?? this.now().toISOString();
    return {
      "x-afal-client-id": client.clientId,
      "x-afal-request-timestamp": timestamp,
      "x-afal-request-signature": sha256(
        `${client.clientId}:${args.requestRef}:${timestamp}:${client.auth.signingKey}`
      ),
    };
  }
}
