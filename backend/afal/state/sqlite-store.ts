import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";
import type { PendingApprovalExecution } from "./interfaces";
import type { AfalIntentStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AfalIntentSqliteSeed {
  paymentIntents?: PaymentIntent[];
  resourceIntents?: ResourceIntent[];
  pendingExecutions?: PendingApprovalExecution[];
}

export interface SqliteAfalIntentStoreOptions {
  filePath: string;
  seed?: AfalIntentSqliteSeed;
}

export class SqliteAfalIntentStore implements AfalIntentStore {
  private readonly db: DatabaseSync;

  constructor(private readonly options: SqliteAfalIntentStoreOptions) {
    if (options.filePath !== ":memory:") {
      mkdirSync(dirname(options.filePath), { recursive: true });
    }

    this.db = new DatabaseSync(options.filePath);
    this.initialize();
  }

  async getPaymentIntent(intentId: IdRef): Promise<PaymentIntent | undefined> {
    return this.readOne<PaymentIntent>("payment_intents", intentId);
  }

  async putPaymentIntent(intent: PaymentIntent): Promise<void> {
    this.writeOne("payment_intents", intent.intentId, intent);
  }

  async listPaymentIntents(): Promise<PaymentIntent[]> {
    return this.readAll<PaymentIntent>("payment_intents");
  }

  async getResourceIntent(intentId: IdRef): Promise<ResourceIntent | undefined> {
    return this.readOne<ResourceIntent>("resource_intents", intentId);
  }

  async putResourceIntent(intent: ResourceIntent): Promise<void> {
    this.writeOne("resource_intents", intent.intentId, intent);
  }

  async listResourceIntents(): Promise<ResourceIntent[]> {
    return this.readAll<ResourceIntent>("resource_intents");
  }

  async getPendingExecution(
    approvalSessionRef: IdRef
  ): Promise<PendingApprovalExecution | undefined> {
    return this.readOne<PendingApprovalExecution>("pending_executions", approvalSessionRef);
  }

  async putPendingExecution(execution: PendingApprovalExecution): Promise<void> {
    this.writeOne("pending_executions", execution.approvalSessionRef, execution);
  }

  async listPendingExecutions(): Promise<PendingApprovalExecution[]> {
    return this.readAll<PendingApprovalExecution>("pending_executions");
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resource_intents (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pending_executions (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
    `);

    this.seedTable(
      "payment_intents",
      this.options.seed?.paymentIntents ?? [],
      (entry) => entry.intentId
    );
    this.seedTable(
      "resource_intents",
      this.options.seed?.resourceIntents ?? [],
      (entry) => entry.intentId
    );
    this.seedTable(
      "pending_executions",
      this.options.seed?.pendingExecutions ?? [],
      (entry) => entry.approvalSessionRef
    );
  }

  private seedTable<T>(table: string, entries: T[], getId: (entry: T) => string): void {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };

    if (row.count > 0) {
      return;
    }

    const statement = this.db.prepare(`INSERT INTO ${table} (id, payload) VALUES (?, ?)`);

    for (const entry of entries) {
      statement.run(getId(entry), JSON.stringify(clone(entry)));
    }
  }

  private readOne<T>(table: string, id: IdRef): T | undefined {
    const row = this.db
      .prepare(`SELECT payload FROM ${table} WHERE id = ?`)
      .get(id) as { payload: string } | undefined;

    return row ? clone(JSON.parse(row.payload) as T) : undefined;
  }

  private readAll<T>(table: string): T[] {
    const rows = this.db.prepare(`SELECT payload FROM ${table} ORDER BY id`).all() as Array<{
      payload: string;
    }>;

    return rows.map((row) => clone(JSON.parse(row.payload) as T));
  }

  private writeOne<T>(table: string, id: string, value: T): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO ${table} (id, payload) VALUES (?, ?)`)
      .run(id, JSON.stringify(clone(value)));
  }
}
