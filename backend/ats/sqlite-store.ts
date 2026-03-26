import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  AccountRecord,
  IdRef,
  MonetaryBudget,
  MonetaryReservation,
  ResourceBudget,
  ResourceQuota,
  ResourceReservation,
} from "../../sdk/types";
import type { AtsStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AtsSqliteSeed {
  accounts?: AccountRecord[];
  monetaryBudgets?: MonetaryBudget[];
  resourceBudgets?: ResourceBudget[];
  resourceQuotas?: ResourceQuota[];
  monetaryReservations?: MonetaryReservation[];
  resourceReservations?: ResourceReservation[];
}

export interface SqliteAtsStoreOptions {
  filePath: string;
  seed?: AtsSqliteSeed;
}

export class SqliteAtsStore implements AtsStore {
  private readonly db: DatabaseSync;

  constructor(private readonly options: SqliteAtsStoreOptions) {
    if (options.filePath !== ":memory:") {
      mkdirSync(dirname(options.filePath), { recursive: true });
    }

    this.db = new DatabaseSync(options.filePath);
    this.initialize();
  }

  async getAccount(accountRef: IdRef): Promise<AccountRecord | undefined> {
    return this.readOne<AccountRecord>("accounts", accountRef);
  }

  async putAccount(account: AccountRecord): Promise<void> {
    this.writeOne("accounts", account.accountId, account);
  }

  async listAccounts(): Promise<AccountRecord[]> {
    return this.readAll<AccountRecord>("accounts");
  }

  async getMonetaryBudget(budgetRef: IdRef): Promise<MonetaryBudget | undefined> {
    return this.readOne<MonetaryBudget>("monetary_budgets", budgetRef);
  }

  async putMonetaryBudget(budget: MonetaryBudget): Promise<void> {
    this.writeOne("monetary_budgets", budget.budgetId, budget);
  }

  async listMonetaryBudgets(): Promise<MonetaryBudget[]> {
    return this.readAll<MonetaryBudget>("monetary_budgets");
  }

  async getResourceBudget(budgetRef: IdRef): Promise<ResourceBudget | undefined> {
    return this.readOne<ResourceBudget>("resource_budgets", budgetRef);
  }

  async putResourceBudget(budget: ResourceBudget): Promise<void> {
    this.writeOne("resource_budgets", budget.budgetId, budget);
  }

  async listResourceBudgets(): Promise<ResourceBudget[]> {
    return this.readAll<ResourceBudget>("resource_budgets");
  }

  async getResourceQuota(quotaRef: IdRef): Promise<ResourceQuota | undefined> {
    return this.readOne<ResourceQuota>("resource_quotas", quotaRef);
  }

  async putResourceQuota(quota: ResourceQuota): Promise<void> {
    this.writeOne("resource_quotas", quota.quotaId, quota);
  }

  async listResourceQuotas(): Promise<ResourceQuota[]> {
    return this.readAll<ResourceQuota>("resource_quotas");
  }

  async getMonetaryReservation(reservationRef: IdRef): Promise<MonetaryReservation | undefined> {
    return this.readOne<MonetaryReservation>("monetary_reservations", reservationRef);
  }

  async putMonetaryReservation(reservation: MonetaryReservation): Promise<void> {
    this.writeOne("monetary_reservations", reservation.reservationId, reservation);
  }

  async listMonetaryReservations(): Promise<MonetaryReservation[]> {
    return this.readAll<MonetaryReservation>("monetary_reservations");
  }

  async getResourceReservation(reservationRef: IdRef): Promise<ResourceReservation | undefined> {
    return this.readOne<ResourceReservation>("resource_reservations", reservationRef);
  }

  async putResourceReservation(reservation: ResourceReservation): Promise<void> {
    this.writeOne("resource_reservations", reservation.reservationId, reservation);
  }

  async listResourceReservations(): Promise<ResourceReservation[]> {
    return this.readAll<ResourceReservation>("resource_reservations");
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS monetary_budgets (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resource_budgets (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resource_quotas (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS monetary_reservations (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resource_reservations (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
    `);

    this.seedTable("accounts", this.options.seed?.accounts ?? [], (entry) => entry.accountId);
    this.seedTable(
      "monetary_budgets",
      this.options.seed?.monetaryBudgets ?? [],
      (entry) => entry.budgetId
    );
    this.seedTable(
      "resource_budgets",
      this.options.seed?.resourceBudgets ?? [],
      (entry) => entry.budgetId
    );
    this.seedTable(
      "resource_quotas",
      this.options.seed?.resourceQuotas ?? [],
      (entry) => entry.quotaId
    );
    this.seedTable(
      "monetary_reservations",
      this.options.seed?.monetaryReservations ?? [],
      (entry) => entry.reservationId
    );
    this.seedTable(
      "resource_reservations",
      this.options.seed?.resourceReservations ?? [],
      (entry) => entry.reservationId
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

    return row ? (clone(JSON.parse(row.payload) as T)) : undefined;
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
