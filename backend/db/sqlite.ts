import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const AFAL_INTEGRATION_SCHEMA_VERSION = "2026-03-27.integration-v1";

export interface SqliteDatabaseMetadataOptions {
  schemaName: string;
  schemaVersion?: string;
}

export function ensureSqliteFilePath(filePath: string): void {
  if (filePath !== ":memory:") {
    mkdirSync(dirname(filePath), { recursive: true });
  }
}

export function openSqliteDatabase(filePath: string): DatabaseSync {
  ensureSqliteFilePath(filePath);
  return new DatabaseSync(filePath);
}

export function initializeSqliteMetadata(
  db: DatabaseSync,
  options: SqliteDatabaseMetadataOptions
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      schema_name TEXT PRIMARY KEY,
      schema_version TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bootstrap_state (
      namespace TEXT PRIMARY KEY,
      bootstrapped_at TEXT NOT NULL
    );
  `);

  db.prepare(
    `
      INSERT INTO schema_meta (schema_name, schema_version, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(schema_name) DO UPDATE SET
        schema_version = excluded.schema_version,
        updated_at = excluded.updated_at
    `
  ).run(
    options.schemaName,
    options.schemaVersion ?? AFAL_INTEGRATION_SCHEMA_VERSION,
    new Date().toISOString()
  );
}

export function isBootstrapNamespaceApplied(db: DatabaseSync, namespace: string): boolean {
  const row = db
    .prepare(`SELECT namespace FROM bootstrap_state WHERE namespace = ?`)
    .get(namespace) as { namespace: string } | undefined;

  return Boolean(row);
}

export function markBootstrapNamespaceApplied(db: DatabaseSync, namespace: string): void {
  db.prepare(
    `
      INSERT INTO bootstrap_state (namespace, bootstrapped_at)
      VALUES (?, ?)
      ON CONFLICT(namespace) DO NOTHING
    `
  ).run(namespace, new Date().toISOString());
}
