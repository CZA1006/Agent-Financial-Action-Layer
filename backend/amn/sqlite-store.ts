import { DatabaseSync } from "node:sqlite";

import type {
  ApprovalContext,
  ApprovalResult,
  ApprovalSession,
  AuthorizationDecision,
  ChallengeRecord,
  IdRef,
  Mandate,
} from "../../sdk/types";
import {
  initializeSqliteMetadata,
  isBootstrapNamespaceApplied,
  markBootstrapNamespaceApplied,
  openSqliteDatabase,
} from "../db/sqlite";
import type { AmnStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AmnSqliteSeed {
  mandates?: Mandate[];
  decisions?: AuthorizationDecision[];
  challenges?: ChallengeRecord[];
  approvalContexts?: ApprovalContext[];
  approvalResults?: ApprovalResult[];
  approvalSessions?: ApprovalSession[];
}

export interface SqliteAmnStoreOptions {
  filePath: string;
  seed?: AmnSqliteSeed;
}

export class SqliteAmnStore implements AmnStore {
  private readonly db: DatabaseSync;

  constructor(private readonly options: SqliteAmnStoreOptions) {
    this.db = openSqliteDatabase(options.filePath);
    this.initialize();
  }

  async getMandate(mandateRef: IdRef): Promise<Mandate | undefined> {
    return this.readOne<Mandate>("mandates", mandateRef);
  }

  async putMandate(mandate: Mandate): Promise<void> {
    this.writeOne("mandates", mandate.mandateId, mandate);
  }

  async listMandates(): Promise<Mandate[]> {
    return this.readAll<Mandate>("mandates");
  }

  async getDecision(decisionRef: IdRef): Promise<AuthorizationDecision | undefined> {
    return this.readOne<AuthorizationDecision>("decisions", decisionRef);
  }

  async putDecision(decision: AuthorizationDecision): Promise<void> {
    this.writeOne("decisions", decision.decisionId, decision);
  }

  async listDecisions(): Promise<AuthorizationDecision[]> {
    return this.readAll<AuthorizationDecision>("decisions");
  }

  async getChallenge(challengeRef: IdRef): Promise<ChallengeRecord | undefined> {
    return this.readOne<ChallengeRecord>("challenges", challengeRef);
  }

  async putChallenge(challenge: ChallengeRecord): Promise<void> {
    this.writeOne("challenges", challenge.challengeId, challenge);
  }

  async listChallenges(): Promise<ChallengeRecord[]> {
    return this.readAll<ChallengeRecord>("challenges");
  }

  async getApprovalContext(approvalContextRef: IdRef): Promise<ApprovalContext | undefined> {
    return this.readOne<ApprovalContext>("approval_contexts", approvalContextRef);
  }

  async putApprovalContext(context: ApprovalContext): Promise<void> {
    this.writeOne("approval_contexts", context.approvalContextId, context);
  }

  async listApprovalContexts(): Promise<ApprovalContext[]> {
    return this.readAll<ApprovalContext>("approval_contexts");
  }

  async getApprovalResult(approvalResultRef: IdRef): Promise<ApprovalResult | undefined> {
    return this.readOne<ApprovalResult>("approval_results", approvalResultRef);
  }

  async putApprovalResult(result: ApprovalResult): Promise<void> {
    this.writeOne("approval_results", result.approvalResultId, result);
  }

  async listApprovalResults(): Promise<ApprovalResult[]> {
    return this.readAll<ApprovalResult>("approval_results");
  }

  async getApprovalSession(approvalSessionRef: IdRef): Promise<ApprovalSession | undefined> {
    return this.readOne<ApprovalSession>("approval_sessions", approvalSessionRef);
  }

  async putApprovalSession(session: ApprovalSession): Promise<void> {
    this.writeOne("approval_sessions", session.approvalSessionId, session);
  }

  async listApprovalSessions(): Promise<ApprovalSession[]> {
    return this.readAll<ApprovalSession>("approval_sessions");
  }

  private initialize(): void {
    initializeSqliteMetadata(this.db, { schemaName: "afal-sqlite-integration" });

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mandates (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS approval_contexts (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS approval_results (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS approval_sessions (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
    `);

    this.seedAll();
  }

  private seedAll(): void {
    if (isBootstrapNamespaceApplied(this.db, "amn")) {
      return;
    }

    this.seedTable("mandates", this.options.seed?.mandates ?? [], (entry) => entry.mandateId);
    this.seedTable("decisions", this.options.seed?.decisions ?? [], (entry) => entry.decisionId);
    this.seedTable("challenges", this.options.seed?.challenges ?? [], (entry) => entry.challengeId);
    this.seedTable(
      "approval_contexts",
      this.options.seed?.approvalContexts ?? [],
      (entry) => entry.approvalContextId
    );
    this.seedTable(
      "approval_results",
      this.options.seed?.approvalResults ?? [],
      (entry) => entry.approvalResultId
    );
    this.seedTable(
      "approval_sessions",
      this.options.seed?.approvalSessions ?? [],
      (entry) => entry.approvalSessionId
    );
    markBootstrapNamespaceApplied(this.db, "amn");
  }

  private seedTable<T>(table: string, entries: T[], getId: (entry: T) => string): void {
    const statement = this.db.prepare(`INSERT OR IGNORE INTO ${table} (id, payload) VALUES (?, ?)`);

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
