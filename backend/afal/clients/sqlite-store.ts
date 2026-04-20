import { DatabaseSync } from "node:sqlite";

import type { IdRef } from "../../../sdk/types";
import {
  initializeSqliteMetadata,
  isBootstrapNamespaceApplied,
  markBootstrapNamespaceApplied,
  openSqliteDatabase,
} from "../../db/sqlite";
import type {
  ExternalAgentClientRecord,
  ExternalAgentClientStore,
  ExternalAgentReplayRecord,
} from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface ExternalAgentSqliteSeed {
  clients?: ExternalAgentClientRecord[];
  replayRecords?: ExternalAgentReplayRecord[];
}

export interface SqliteExternalAgentClientStoreOptions {
  filePath: string;
  seed?: ExternalAgentSqliteSeed;
}

export class SqliteExternalAgentClientStore implements ExternalAgentClientStore {
  private readonly db: DatabaseSync;

  constructor(private readonly options: SqliteExternalAgentClientStoreOptions) {
    this.db = openSqliteDatabase(options.filePath);
    this.initialize();
  }

  async getClient(clientId: IdRef): Promise<ExternalAgentClientRecord | undefined> {
    return this.readOne<ExternalAgentClientRecord>("external_agent_clients", clientId);
  }

  async putClient(client: ExternalAgentClientRecord): Promise<void> {
    this.writeOne("external_agent_clients", client.clientId, client);
  }

  async listClients(): Promise<ExternalAgentClientRecord[]> {
    return this.readAll<ExternalAgentClientRecord>("external_agent_clients");
  }

  async getReplayRecord(
    clientId: IdRef,
    replayKey: string
  ): Promise<ExternalAgentReplayRecord | undefined> {
    const row = this.db
      .prepare(
        `SELECT payload FROM external_agent_replays WHERE client_id = ? AND replay_key = ?`
      )
      .get(clientId, replayKey) as { payload: string } | undefined;

    return row ? clone(JSON.parse(row.payload) as ExternalAgentReplayRecord) : undefined;
  }

  async putReplayRecord(record: ExternalAgentReplayRecord): Promise<void> {
    this.db
      .prepare(
        `
          INSERT OR REPLACE INTO external_agent_replays (
            client_id,
            replay_key,
            payload
          ) VALUES (?, ?, ?)
        `
      )
      .run(record.clientId, record.replayKey, JSON.stringify(clone(record)));
  }

  private initialize(): void {
    initializeSqliteMetadata(this.db, { schemaName: "afal-sqlite-integration" });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS external_agent_clients (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS external_agent_replays (
        client_id TEXT NOT NULL,
        replay_key TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (client_id, replay_key)
      );
    `);

    if (isBootstrapNamespaceApplied(this.db, "afal-external-agents")) {
      return;
    }

    const clientStatement = this.db.prepare(
      `INSERT OR IGNORE INTO external_agent_clients (id, payload) VALUES (?, ?)`
    );
    for (const client of this.options.seed?.clients ?? []) {
      clientStatement.run(client.clientId, JSON.stringify(clone(client)));
    }

    const replayStatement = this.db.prepare(
      `
        INSERT OR IGNORE INTO external_agent_replays (client_id, replay_key, payload)
        VALUES (?, ?, ?)
      `
    );
    for (const replayRecord of this.options.seed?.replayRecords ?? []) {
      replayStatement.run(
        replayRecord.clientId,
        replayRecord.replayKey,
        JSON.stringify(clone(replayRecord))
      );
    }

    markBootstrapNamespaceApplied(this.db, "afal-external-agents");
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
