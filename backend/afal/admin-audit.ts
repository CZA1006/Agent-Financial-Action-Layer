import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { IdRef, Timestamp } from "../../sdk/types";
import {
  initializeSqliteMetadata,
  isBootstrapNamespaceApplied,
  markBootstrapNamespaceApplied,
  openSqliteDatabase,
} from "../db/sqlite";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type AfalAdminAuditAction =
  | "getNotificationDelivery"
  | "listNotificationDeliveries"
  | "redeliverNotification"
  | "getNotificationWorkerStatus"
  | "startNotificationWorker"
  | "stopNotificationWorker"
  | "runNotificationWorker";

export interface AfalAdminAuditEntry {
  auditId: IdRef;
  requestRef: IdRef;
  action: AfalAdminAuditAction;
  createdAt: Timestamp;
  targetRef?: IdRef;
  details: Record<string, unknown>;
}

export interface AfalAdminAuditStore {
  getAuditEntry(auditId: IdRef): Promise<AfalAdminAuditEntry | undefined>;
  listAuditEntries(): Promise<AfalAdminAuditEntry[]>;
  putAuditEntry(entry: AfalAdminAuditEntry): Promise<void>;
}

export class InMemoryAfalAdminAuditStore implements AfalAdminAuditStore {
  private readonly entries = new Map<IdRef, AfalAdminAuditEntry>();

  async getAuditEntry(auditId: IdRef): Promise<AfalAdminAuditEntry | undefined> {
    const entry = this.entries.get(auditId);
    return entry ? clone(entry) : undefined;
  }

  async listAuditEntries(): Promise<AfalAdminAuditEntry[]> {
    return Array.from(this.entries.values()).map(clone);
  }

  async putAuditEntry(entry: AfalAdminAuditEntry): Promise<void> {
    this.entries.set(entry.auditId, clone(entry));
  }
}

interface JsonFileAfalAdminAuditSnapshot {
  entries: AfalAdminAuditEntry[];
}

export interface JsonFileAfalAdminAuditStoreOptions {
  filePath: string;
  seed?: JsonFileAfalAdminAuditSnapshot;
}

export class JsonFileAfalAdminAuditStore implements AfalAdminAuditStore {
  constructor(private readonly options: JsonFileAfalAdminAuditStoreOptions) {}

  async getAuditEntry(auditId: IdRef): Promise<AfalAdminAuditEntry | undefined> {
    const snapshot = await this.readSnapshot();
    const entry = snapshot.entries.find((candidate) => candidate.auditId === auditId);
    return entry ? clone(entry) : undefined;
  }

  async listAuditEntries(): Promise<AfalAdminAuditEntry[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.entries.map(clone);
  }

  async putAuditEntry(entry: AfalAdminAuditEntry): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.entries.filter((candidate) => candidate.auditId !== entry.auditId);
    next.push(clone(entry));
    await this.writeSnapshot({ entries: next });
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

  private async readSnapshot(): Promise<JsonFileAfalAdminAuditSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as JsonFileAfalAdminAuditSnapshot;
    return {
      entries: parsed.entries.map(clone),
    };
  }

  private async writeSnapshot(snapshot: JsonFileAfalAdminAuditSnapshot): Promise<void> {
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

export interface SqliteAfalAdminAuditStoreOptions {
  filePath: string;
  seed?: JsonFileAfalAdminAuditSnapshot;
}

export class SqliteAfalAdminAuditStore implements AfalAdminAuditStore {
  private readonly db: DatabaseSync;

  constructor(private readonly options: SqliteAfalAdminAuditStoreOptions) {
    this.db = openSqliteDatabase(options.filePath);
    this.initialize();
  }

  async getAuditEntry(auditId: IdRef): Promise<AfalAdminAuditEntry | undefined> {
    const row = this.db
      .prepare(`SELECT payload FROM afal_admin_audit WHERE id = ?`)
      .get(auditId) as { payload: string } | undefined;

    return row ? clone(JSON.parse(row.payload) as AfalAdminAuditEntry) : undefined;
  }

  async listAuditEntries(): Promise<AfalAdminAuditEntry[]> {
    const rows = this.db
      .prepare(`SELECT payload FROM afal_admin_audit ORDER BY id`)
      .all() as Array<{ payload: string }>;

    return rows.map((row) => clone(JSON.parse(row.payload) as AfalAdminAuditEntry));
  }

  async putAuditEntry(entry: AfalAdminAuditEntry): Promise<void> {
    this.db
      .prepare(`INSERT OR REPLACE INTO afal_admin_audit (id, payload) VALUES (?, ?)`)
      .run(entry.auditId, JSON.stringify(clone(entry)));
  }

  private initialize(): void {
    initializeSqliteMetadata(this.db, { schemaName: "afal-sqlite-integration" });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS afal_admin_audit (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
    `);

    if (isBootstrapNamespaceApplied(this.db, "afal-admin-audit")) {
      return;
    }

    const statement = this.db.prepare(
      `INSERT OR IGNORE INTO afal_admin_audit (id, payload) VALUES (?, ?)`
    );

    for (const entry of this.options.seed?.entries ?? []) {
      statement.run(entry.auditId, JSON.stringify(clone(entry)));
    }

    markBootstrapNamespaceApplied(this.db, "afal-admin-audit");
  }
}
