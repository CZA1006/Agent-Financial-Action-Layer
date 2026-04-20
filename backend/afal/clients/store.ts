import type { Did, IdRef, Timestamp } from "../../../sdk/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type ExternalAgentEventType = "payment.settled" | "resource.settled";

export interface ExternalAgentCallbackRegistration {
  eventTypes: ExternalAgentEventType[];
  paymentSettlementUrl?: string;
  resourceSettlementUrl?: string;
  verifiedAt?: Timestamp;
}

export interface ExternalAgentAuthConfig {
  signingKey: string;
  active: boolean;
  createdAt: Timestamp;
  rotatedAt?: Timestamp;
}

export interface ExternalAgentClientRecord {
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
  callbackRegistration?: ExternalAgentCallbackRegistration;
  auth: ExternalAgentAuthConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExternalAgentReplayRecord {
  clientId: IdRef;
  replayKey: string;
  requestRef: IdRef;
  timestamp: Timestamp;
  seenAt: Timestamp;
}

export interface ExternalAgentClientStore {
  getClient(clientId: IdRef): Promise<ExternalAgentClientRecord | undefined>;
  putClient(client: ExternalAgentClientRecord): Promise<void>;
  listClients(): Promise<ExternalAgentClientRecord[]>;
  getReplayRecord(
    clientId: IdRef,
    replayKey: string
  ): Promise<ExternalAgentReplayRecord | undefined>;
  putReplayRecord(record: ExternalAgentReplayRecord): Promise<void>;
}

export interface InMemoryExternalAgentClientStoreOptions {
  clients?: ExternalAgentClientRecord[];
  replayRecords?: ExternalAgentReplayRecord[];
}

export class InMemoryExternalAgentClientStore implements ExternalAgentClientStore {
  private readonly clients = new Map<IdRef, ExternalAgentClientRecord>();
  private readonly replayRecords = new Map<string, ExternalAgentReplayRecord>();

  constructor(options: InMemoryExternalAgentClientStoreOptions = {}) {
    for (const client of options.clients ?? []) {
      this.clients.set(client.clientId, clone(client));
    }
    for (const record of options.replayRecords ?? []) {
      this.replayRecords.set(this.getReplayCompositeKey(record.clientId, record.replayKey), clone(record));
    }
  }

  async getClient(clientId: IdRef): Promise<ExternalAgentClientRecord | undefined> {
    const value = this.clients.get(clientId);
    return value ? clone(value) : undefined;
  }

  async putClient(client: ExternalAgentClientRecord): Promise<void> {
    this.clients.set(client.clientId, clone(client));
  }

  async listClients(): Promise<ExternalAgentClientRecord[]> {
    return Array.from(this.clients.values()).map(clone);
  }

  async getReplayRecord(
    clientId: IdRef,
    replayKey: string
  ): Promise<ExternalAgentReplayRecord | undefined> {
    const value = this.replayRecords.get(this.getReplayCompositeKey(clientId, replayKey));
    return value ? clone(value) : undefined;
  }

  async putReplayRecord(record: ExternalAgentReplayRecord): Promise<void> {
    this.replayRecords.set(
      this.getReplayCompositeKey(record.clientId, record.replayKey),
      clone(record)
    );
  }

  private getReplayCompositeKey(clientId: IdRef, replayKey: string): string {
    return `${clientId}:${replayKey}`;
  }
}
