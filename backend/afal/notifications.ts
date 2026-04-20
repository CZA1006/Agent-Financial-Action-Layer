import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  PaymentSettlementNotification,
  ResourceSettlementNotification,
  SettlementNotificationPort,
} from "./interfaces";
import {
  initializeSqliteMetadata,
  isBootstrapNamespaceApplied,
  markBootstrapNamespaceApplied,
  openSqliteDatabase,
} from "../db/sqlite";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SettlementNotificationDeliveryRecord {
  notificationId: string;
  eventType: string;
  targetUrl?: string;
  idempotencyKey: string;
  attempts: number;
  status: "delivered" | "failed" | "skipped" | "dead-lettered";
  redeliveryCount: number;
  lastAttemptAt: string;
  nextAttemptAt?: string;
  deadLetteredAt?: string;
  responseStatus?: number;
  errorMessage?: string;
}

export interface SettlementNotificationOutboxEntry extends SettlementNotificationDeliveryRecord {
  payload: PaymentSettlementNotification | ResourceSettlementNotification;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementNotificationOutboxStore {
  getOutboxEntry(notificationId: string): Promise<SettlementNotificationOutboxEntry | undefined>;
  putOutboxEntry(entry: SettlementNotificationOutboxEntry): Promise<void>;
  listOutboxEntries(): Promise<SettlementNotificationOutboxEntry[]>;
}

export class InMemorySettlementNotificationOutboxStore
  implements SettlementNotificationOutboxStore
{
  private readonly entries = new Map<string, SettlementNotificationOutboxEntry>();

  async getOutboxEntry(
    notificationId: string
  ): Promise<SettlementNotificationOutboxEntry | undefined> {
    const entry = this.entries.get(notificationId);
    return entry ? clone(entry) : undefined;
  }

  async putOutboxEntry(entry: SettlementNotificationOutboxEntry): Promise<void> {
    this.entries.set(entry.notificationId, clone(entry));
  }

  async listOutboxEntries(): Promise<SettlementNotificationOutboxEntry[]> {
    return Array.from(this.entries.values()).map(clone);
  }
}

interface JsonFileSettlementNotificationOutboxSnapshot {
  entries: SettlementNotificationOutboxEntry[];
}

export interface JsonFileSettlementNotificationOutboxStoreOptions {
  filePath: string;
  seed?: JsonFileSettlementNotificationOutboxSnapshot;
}

export class JsonFileSettlementNotificationOutboxStore
  implements SettlementNotificationOutboxStore
{
  constructor(private readonly options: JsonFileSettlementNotificationOutboxStoreOptions) {}

  async getOutboxEntry(
    notificationId: string
  ): Promise<SettlementNotificationOutboxEntry | undefined> {
    const snapshot = await this.readSnapshot();
    const entry = snapshot.entries.find((candidate) => candidate.notificationId === notificationId);
    return entry ? clone(entry) : undefined;
  }

  async putOutboxEntry(entry: SettlementNotificationOutboxEntry): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.entries.filter((candidate) => candidate.notificationId !== entry.notificationId);
    next.push(clone(entry));
    await this.writeSnapshot({ entries: next });
  }

  async listOutboxEntries(): Promise<SettlementNotificationOutboxEntry[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.entries.map(clone);
  }

  private async ensureSnapshotFile(): Promise<void> {
    try {
      await readFile(this.options.filePath, "utf8");
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      entries: this.options.seed?.entries.map(clone) ?? [],
    });
  }

  private async readSnapshot(): Promise<JsonFileSettlementNotificationOutboxSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as JsonFileSettlementNotificationOutboxSnapshot;

    return {
      entries: parsed.entries.map(clone),
    };
  }

  private async writeSnapshot(snapshot: JsonFileSettlementNotificationOutboxSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          entries: snapshot.entries.map(clone),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

export interface SqliteSettlementNotificationOutboxStoreOptions {
  filePath: string;
  seed?: JsonFileSettlementNotificationOutboxSnapshot;
}

export class SqliteSettlementNotificationOutboxStore
  implements SettlementNotificationOutboxStore
{
  private readonly db: DatabaseSync;

  constructor(private readonly options: SqliteSettlementNotificationOutboxStoreOptions) {
    this.db = openSqliteDatabase(options.filePath);
    this.initialize();
  }

  async getOutboxEntry(
    notificationId: string
  ): Promise<SettlementNotificationOutboxEntry | undefined> {
    const row = this.db
      .prepare(`SELECT payload FROM settlement_notification_outbox WHERE id = ?`)
      .get(notificationId) as { payload: string } | undefined;

    return row ? clone(JSON.parse(row.payload) as SettlementNotificationOutboxEntry) : undefined;
  }

  async putOutboxEntry(entry: SettlementNotificationOutboxEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO settlement_notification_outbox (id, payload) VALUES (?, ?)`
      )
      .run(entry.notificationId, JSON.stringify(clone(entry)));
  }

  async listOutboxEntries(): Promise<SettlementNotificationOutboxEntry[]> {
    const rows = this.db
      .prepare(`SELECT payload FROM settlement_notification_outbox ORDER BY id`)
      .all() as Array<{ payload: string }>;

    return rows.map((row) => clone(JSON.parse(row.payload) as SettlementNotificationOutboxEntry));
  }

  private initialize(): void {
    initializeSqliteMetadata(this.db, { schemaName: "afal-sqlite-integration" });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_notification_outbox (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
    `);

    if (isBootstrapNamespaceApplied(this.db, "afal-notification-outbox")) {
      return;
    }

    const statement = this.db.prepare(
      `INSERT OR IGNORE INTO settlement_notification_outbox (id, payload) VALUES (?, ?)`
    );

    for (const entry of this.options.seed?.entries ?? []) {
      statement.run(entry.notificationId, JSON.stringify(clone(entry)));
    }

    markBootstrapNamespaceApplied(this.db, "afal-notification-outbox");
  }
}

export class NoopSettlementNotificationPort implements SettlementNotificationPort {
  async notifyPaymentSettlement(_notification: PaymentSettlementNotification): Promise<void> {}

  async notifyResourceSettlement(_notification: ResourceSettlementNotification): Promise<void> {}
}

export interface HttpSettlementNotificationPortOptions {
  paymentCallbackUrls?: Record<string, string>;
  resourceCallbackUrls?: Record<string, string>;
  callbackResolver?: {
    getPaymentCallbackUrls(): Promise<Record<string, string>>;
    getResourceCallbackUrls(): Promise<Record<string, string>>;
  };
  maxAttempts?: number;
  retryDelayMs?: number;
  redeliveryBaseDelayMs?: number;
  redeliveryBackoffMultiplier?: number;
  maxRedeliveryCycles?: number;
  fetchImpl?: typeof fetch;
  outboxStore?: SettlementNotificationOutboxStore;
  now?: () => Date;
}

export interface SettlementNotificationRedeliveryPort {
  redeliverFailedNotifications(): Promise<number>;
}

export interface SettlementNotificationOutboxWorkerOptions {
  intervalMs?: number;
  onError?: (error: unknown) => void | Promise<void>;
}

export interface SettlementNotificationOutboxWorkerStatus {
  running: boolean;
  intervalMs: number;
  lastRunAt?: string;
  lastResult?: number;
  lastError?: string;
}

export class SettlementNotificationOutboxWorker {
  private readonly intervalMs: number;
  private readonly onError?: (error: unknown) => void | Promise<void>;
  private timer: NodeJS.Timeout | undefined;
  private inFlight: Promise<number> | undefined;
  private readonly statusState: SettlementNotificationOutboxWorkerStatus;

  constructor(
    private readonly port: SettlementNotificationRedeliveryPort,
    options: SettlementNotificationOutboxWorkerOptions = {}
  ) {
    this.intervalMs = Math.max(10, options.intervalMs ?? 1_000);
    this.onError = options.onError;
    this.statusState = {
      running: false,
      intervalMs: this.intervalMs,
    };
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.statusState.running = true;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.statusState.running = false;

    if (this.inFlight) {
      await this.inFlight.catch(() => undefined);
    }
  }

  async tick(): Promise<number> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      this.statusState.lastRunAt = new Date().toISOString();
      try {
        const result = await this.port.redeliverFailedNotifications();
        this.statusState.lastResult = result;
        this.statusState.lastError = undefined;
        return result;
      } catch (error) {
        this.statusState.lastError =
          error instanceof Error ? error.message : String(error);
        if (this.onError) {
          await this.onError(error);
        }
        throw error;
      } finally {
        this.inFlight = undefined;
      }
    })();

    return this.inFlight;
  }

  getStatus(): SettlementNotificationOutboxWorkerStatus {
    return clone(this.statusState);
  }
}

export class HttpSettlementNotificationPort implements SettlementNotificationPort {
  private readonly paymentCallbackUrls: Record<string, string>;
  private readonly resourceCallbackUrls: Record<string, string>;
  private readonly callbackResolver?: {
    getPaymentCallbackUrls(): Promise<Record<string, string>>;
    getResourceCallbackUrls(): Promise<Record<string, string>>;
  };
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly redeliveryBaseDelayMs: number;
  private readonly redeliveryBackoffMultiplier: number;
  private readonly maxRedeliveryCycles: number;
  private readonly fetchImpl: typeof fetch;
  private readonly outboxStore: SettlementNotificationOutboxStore;
  private readonly now: () => Date;

  constructor(options: HttpSettlementNotificationPortOptions = {}) {
    this.paymentCallbackUrls = options.paymentCallbackUrls ?? {};
    this.resourceCallbackUrls = options.resourceCallbackUrls ?? {};
    this.callbackResolver = options.callbackResolver;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 1);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 0);
    this.redeliveryBaseDelayMs = Math.max(0, options.redeliveryBaseDelayMs ?? 1_000);
    this.redeliveryBackoffMultiplier = Math.max(1, options.redeliveryBackoffMultiplier ?? 2);
    this.maxRedeliveryCycles = Math.max(1, options.maxRedeliveryCycles ?? 3);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.outboxStore =
      options.outboxStore ?? new InMemorySettlementNotificationOutboxStore();
    this.now = options.now ?? (() => new Date());
  }

  async notifyPaymentSettlement(notification: PaymentSettlementNotification): Promise<void> {
    const callbackUrl = await this.resolvePaymentCallbackUrl(notification.payeeDid);
    if (!callbackUrl) {
      await this.outboxStore.putOutboxEntry({
        notificationId: notification.notificationId,
        eventType: notification.eventType,
        payload: clone(notification),
        idempotencyKey: notification.notificationId,
        attempts: 0,
        status: "skipped",
        redeliveryCount: 0,
        createdAt: notification.settledAt,
        updatedAt: notification.settledAt,
        lastAttemptAt: notification.settledAt,
        errorMessage: "No payment callback URL registered for payeeDid",
      });
      return;
    }

    await this.postNotification(callbackUrl, notification);
  }

  async notifyResourceSettlement(notification: ResourceSettlementNotification): Promise<void> {
    const callbackUrl = await this.resolveResourceCallbackUrl(notification.providerDid);
    if (!callbackUrl) {
      await this.outboxStore.putOutboxEntry({
        notificationId: notification.notificationId,
        eventType: notification.eventType,
        payload: clone(notification),
        idempotencyKey: notification.notificationId,
        attempts: 0,
        status: "skipped",
        redeliveryCount: 0,
        createdAt: notification.settledAt,
        updatedAt: notification.settledAt,
        lastAttemptAt: notification.settledAt,
        errorMessage: "No resource callback URL registered for providerDid",
      });
      return;
    }

    await this.postNotification(callbackUrl, notification);
  }

  private async resolvePaymentCallbackUrl(payeeDid: string): Promise<string | undefined> {
    const staticUrl = this.paymentCallbackUrls[payeeDid];
    if (staticUrl) {
      return staticUrl;
    }

    const resolved = await this.callbackResolver?.getPaymentCallbackUrls();
    return resolved?.[payeeDid];
  }

  private async resolveResourceCallbackUrl(providerDid: string): Promise<string | undefined> {
    const staticUrl = this.resourceCallbackUrls[providerDid];
    if (staticUrl) {
      return staticUrl;
    }

    const resolved = await this.callbackResolver?.getResourceCallbackUrls();
    return resolved?.[providerDid];
  }

  async listDeliveryRecords(): Promise<SettlementNotificationDeliveryRecord[]> {
    const entries = await this.outboxStore.listOutboxEntries();
    return entries.map(({ payload: _payload, createdAt: _createdAt, updatedAt: _updatedAt, ...rest }) =>
      clone(rest)
    );
  }

  async listOutboxEntries(): Promise<SettlementNotificationOutboxEntry[]> {
    return this.outboxStore.listOutboxEntries();
  }

  async redeliverNotification(notificationId: string): Promise<void> {
    const entry = await this.outboxStore.getOutboxEntry(notificationId);
    if (!entry) {
      throw new Error(`Unknown settlement notification "${notificationId}"`);
    }
    if (!entry.targetUrl) {
      throw new Error(`Settlement notification "${notificationId}" has no callback target`);
    }

    await this.postNotification(
      entry.targetUrl,
      entry.payload,
      entry.attempts,
      entry.createdAt,
      entry.redeliveryCount
    );
  }

  async redeliverFailedNotifications(): Promise<number> {
    const now = this.now().toISOString();
    const entries = await this.outboxStore.listOutboxEntries();
    const failed = entries.filter(
      (entry) =>
        entry.status === "failed" && (!entry.nextAttemptAt || entry.nextAttemptAt <= now)
    );

    for (const entry of failed) {
      if (!entry.targetUrl) {
        continue;
      }
      await this.postNotification(
        entry.targetUrl,
        entry.payload,
        entry.attempts,
        entry.createdAt,
        entry.redeliveryCount
      );
    }

    return failed.length;
  }

  private async postNotification(
    url: string,
    payload: PaymentSettlementNotification | ResourceSettlementNotification,
    existingAttempts = 0,
    createdAt = this.now().toISOString(),
    existingRedeliveryCount = 0
  ): Promise<void> {
    const idempotencyKey = payload.notificationId;
    let attempts = existingAttempts;
    let lastStatus: number | undefined;
    let lastError: string | undefined;
    const maxAttemptsForInvocation = existingAttempts + this.maxAttempts;

    const nowValue = this.now().toISOString();
    while (attempts < maxAttemptsForInvocation) {
      attempts += 1;
      try {
        const response = await this.fetchImpl(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-afal-notification-id": payload.notificationId,
            "x-afal-idempotency-key": idempotencyKey,
            "x-afal-delivery-attempt": String(attempts),
            "x-afal-event-type": payload.eventType,
          },
          body: JSON.stringify(payload),
        });

        lastStatus = response.status;
        if (response.ok) {
          await this.outboxStore.putOutboxEntry({
            notificationId: payload.notificationId,
            eventType: payload.eventType,
            targetUrl: url,
            payload: clone(payload),
            idempotencyKey,
            attempts,
            status: "delivered",
            redeliveryCount: existingRedeliveryCount,
            createdAt,
            updatedAt: nowValue,
            lastAttemptAt: nowValue,
            responseStatus: response.status,
          });
          return;
        }

        lastError = `Settlement callback failed: [${response.status}] ${response.statusText}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      if (attempts < maxAttemptsForInvocation && this.retryDelayMs > 0) {
        await sleep(this.retryDelayMs);
      }
    }

    const redeliveryCount = existingRedeliveryCount + 1;
    const deadLettered = redeliveryCount >= this.maxRedeliveryCycles;
    const nextAttemptAt = deadLettered
      ? undefined
      : new Date(
          this.now().getTime() +
            this.redeliveryBaseDelayMs *
              this.redeliveryBackoffMultiplier ** Math.max(0, redeliveryCount - 1)
        ).toISOString();

    await this.outboxStore.putOutboxEntry({
      notificationId: payload.notificationId,
      eventType: payload.eventType,
      targetUrl: url,
      payload: clone(payload),
      idempotencyKey,
      attempts,
      status: deadLettered ? "dead-lettered" : "failed",
      redeliveryCount,
      createdAt,
      updatedAt: nowValue,
      lastAttemptAt: nowValue,
      nextAttemptAt,
      deadLetteredAt: deadLettered ? nowValue : undefined,
      responseStatus: lastStatus,
      errorMessage: lastError ?? "Settlement callback failed",
    });

    throw new Error(lastError ?? "Settlement callback failed");
  }
}

async function sleep(durationMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
