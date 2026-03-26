import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import type { AccountRecord, MonetaryBudget, ResourceBudget, ResourceQuota } from "../../sdk/types";
import { InMemoryAtsService } from "./service";
import { InMemoryAtsStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SeededAtsRecords {
  accounts: AccountRecord[];
  monetaryBudgets: MonetaryBudget[];
  resourceBudgets: ResourceBudget[];
  resourceQuotas: ResourceQuota[];
}

export function createSeededAtsRecords(): SeededAtsRecords {
  return {
    accounts: dedupeById([
      paymentFlowFixtures.treasuryAccount,
      paymentFlowFixtures.operatingAccount,
      resourceFlowFixtures.treasuryAccount,
      resourceFlowFixtures.operatingAccount,
    ], "accountId"),
    monetaryBudgets: dedupeById([paymentFlowFixtures.monetaryBudgetInitial], "budgetId"),
    resourceBudgets: dedupeById([resourceFlowFixtures.resourceBudgetInitial], "budgetId"),
    resourceQuotas: dedupeById([resourceFlowFixtures.resourceQuotaInitial], "quotaId"),
  };
}

export function createSeededInMemoryAtsStore(): InMemoryAtsStore {
  return new InMemoryAtsStore(createSeededAtsRecords());
}

export function createSeededInMemoryAtsService(): InMemoryAtsService {
  return new InMemoryAtsService({
    store: createSeededInMemoryAtsStore(),
  });
}

function dedupeById<T, TKey extends keyof T>(
  records: T[],
  key: TKey
): T[] {
  return Array.from(new Map(records.map((record) => [String(record[key]), record])).values()).map((record) =>
    clone(record)
  );
}
