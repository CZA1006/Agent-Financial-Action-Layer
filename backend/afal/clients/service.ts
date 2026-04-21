import { createHash, randomBytes } from "node:crypto";

import type { Did, IdRef } from "../../../sdk/types";
import type {
  ExternalAgentCallbackRegistration,
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

export class ExternalAgentClientValidationError extends Error {
  readonly code = "callback-registration-invalid";
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ExternalAgentClientValidationError";
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

export interface ExternalAgentCallbackRegistrationOutput {
  clientId: IdRef;
  tenantId: IdRef;
  agentId: IdRef;
  subjectDid: Did;
  paymentPayeeDid?: Did;
  resourceProviderDid?: Did;
  callbackRegistration?: ExternalAgentCallbackRegistration;
}

export interface ExternalAgentCallbackRegistrationInput {
  eventTypes?: ExternalAgentEventType[];
  paymentSettlementUrl?: string;
  resourceSettlementUrl?: string;
  verifiedAt?: string;
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

  async getCallbackRegistration(
    clientId: IdRef
  ): Promise<ExternalAgentCallbackRegistrationOutput> {
    const client = await this.getClient(clientId);
    return this.toCallbackRegistrationOutput(client);
  }

  async listCallbackRegistrations(
    clientId: IdRef
  ): Promise<ExternalAgentCallbackRegistrationOutput[]> {
    const registration = await this.getCallbackRegistration(clientId);
    return registration.callbackRegistration ? [registration] : [];
  }

  async registerCallback(
    clientId: IdRef,
    input: ExternalAgentCallbackRegistrationInput
  ): Promise<ExternalAgentCallbackRegistrationOutput> {
    const client = await this.getClient(clientId);
    const now = this.now().toISOString();
    const callbackRegistration = this.normalizeCallbackRegistration(client, input);
    const updatedClient: ExternalAgentClientRecord = {
      ...client,
      callbackRegistration: {
        ...callbackRegistration,
        verifiedAt: input.verifiedAt ?? callbackRegistration.verifiedAt,
      },
      updatedAt: now,
    };

    await this.store.putClient(updatedClient);
    return this.toCallbackRegistrationOutput(updatedClient);
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

  private normalizeCallbackRegistration(
    client: ExternalAgentClientRecord,
    input: ExternalAgentCallbackRegistrationInput
  ): ExternalAgentCallbackRegistration {
    if (!input.paymentSettlementUrl && !input.resourceSettlementUrl) {
      throw new ExternalAgentClientValidationError(
        "At least one callback URL must be provided for payment or resource settlement"
      );
    }

    if (input.paymentSettlementUrl && !client.paymentPayeeDid) {
      throw new ExternalAgentClientValidationError(
        `Client "${client.clientId}" is not provisioned for payment receiver callbacks`
      );
    }

    if (input.resourceSettlementUrl && !client.resourceProviderDid) {
      throw new ExternalAgentClientValidationError(
        `Client "${client.clientId}" is not provisioned for resource receiver callbacks`
      );
    }

    const inferredEventTypes = [
      input.paymentSettlementUrl ? "payment.settled" : undefined,
      input.resourceSettlementUrl ? "resource.settled" : undefined,
    ].filter(Boolean) as ExternalAgentEventType[];
    const eventTypes = input.eventTypes ?? inferredEventTypes;

    if (eventTypes.length === 0) {
      throw new ExternalAgentClientValidationError(
        "callback registration eventTypes cannot be empty"
      );
    }

    if (input.paymentSettlementUrl === undefined && eventTypes.includes("payment.settled")) {
      throw new ExternalAgentClientValidationError(
        'payment.settled requires "paymentSettlementUrl"'
      );
    }

    if (input.resourceSettlementUrl === undefined && eventTypes.includes("resource.settled")) {
      throw new ExternalAgentClientValidationError(
        'resource.settled requires "resourceSettlementUrl"'
      );
    }

    return {
      eventTypes: [...eventTypes],
      paymentSettlementUrl: input.paymentSettlementUrl,
      resourceSettlementUrl: input.resourceSettlementUrl,
      verifiedAt: input.verifiedAt,
    };
  }

  private toCallbackRegistrationOutput(
    client: ExternalAgentClientRecord
  ): ExternalAgentCallbackRegistrationOutput {
    return {
      clientId: client.clientId,
      tenantId: client.tenantId,
      agentId: client.agentId,
      subjectDid: client.subjectDid,
      paymentPayeeDid: client.paymentPayeeDid,
      resourceProviderDid: client.resourceProviderDid,
      callbackRegistration: client.callbackRegistration
        ? clone(client.callbackRegistration)
        : undefined,
    };
  }
}
