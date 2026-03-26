import type {
  AccountRecord,
  IdRef,
  MonetaryBudget,
  ResourceBudget,
  ResourceQuota,
} from "../../sdk/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AtsStore {
  getAccount(accountRef: IdRef): Promise<AccountRecord | undefined>;
  putAccount(account: AccountRecord): Promise<void>;
  listAccounts(): Promise<AccountRecord[]>;
  getMonetaryBudget(budgetRef: IdRef): Promise<MonetaryBudget | undefined>;
  putMonetaryBudget(budget: MonetaryBudget): Promise<void>;
  listMonetaryBudgets(): Promise<MonetaryBudget[]>;
  getResourceBudget(budgetRef: IdRef): Promise<ResourceBudget | undefined>;
  putResourceBudget(budget: ResourceBudget): Promise<void>;
  listResourceBudgets(): Promise<ResourceBudget[]>;
  getResourceQuota(quotaRef: IdRef): Promise<ResourceQuota | undefined>;
  putResourceQuota(quota: ResourceQuota): Promise<void>;
  listResourceQuotas(): Promise<ResourceQuota[]>;
}

export interface InMemoryAtsStoreOptions {
  accounts?: AccountRecord[];
  monetaryBudgets?: MonetaryBudget[];
  resourceBudgets?: ResourceBudget[];
  resourceQuotas?: ResourceQuota[];
}

export class InMemoryAtsStore implements AtsStore {
  private readonly accounts = new Map<IdRef, AccountRecord>();
  private readonly monetaryBudgets = new Map<IdRef, MonetaryBudget>();
  private readonly resourceBudgets = new Map<IdRef, ResourceBudget>();
  private readonly resourceQuotas = new Map<IdRef, ResourceQuota>();

  constructor(options: InMemoryAtsStoreOptions = {}) {
    for (const account of options.accounts ?? []) {
      this.accounts.set(account.accountId, clone(account));
    }
    for (const budget of options.monetaryBudgets ?? []) {
      this.monetaryBudgets.set(budget.budgetId, clone(budget));
    }
    for (const budget of options.resourceBudgets ?? []) {
      this.resourceBudgets.set(budget.budgetId, clone(budget));
    }
    for (const quota of options.resourceQuotas ?? []) {
      this.resourceQuotas.set(quota.quotaId, clone(quota));
    }
  }

  async getAccount(accountRef: IdRef): Promise<AccountRecord | undefined> {
    const account = this.accounts.get(accountRef);
    return account ? clone(account) : undefined;
  }

  async putAccount(account: AccountRecord): Promise<void> {
    this.accounts.set(account.accountId, clone(account));
  }

  async listAccounts(): Promise<AccountRecord[]> {
    return Array.from(this.accounts.values()).map((account) => clone(account));
  }

  async getMonetaryBudget(budgetRef: IdRef): Promise<MonetaryBudget | undefined> {
    const budget = this.monetaryBudgets.get(budgetRef);
    return budget ? clone(budget) : undefined;
  }

  async putMonetaryBudget(budget: MonetaryBudget): Promise<void> {
    this.monetaryBudgets.set(budget.budgetId, clone(budget));
  }

  async listMonetaryBudgets(): Promise<MonetaryBudget[]> {
    return Array.from(this.monetaryBudgets.values()).map((budget) => clone(budget));
  }

  async getResourceBudget(budgetRef: IdRef): Promise<ResourceBudget | undefined> {
    const budget = this.resourceBudgets.get(budgetRef);
    return budget ? clone(budget) : undefined;
  }

  async putResourceBudget(budget: ResourceBudget): Promise<void> {
    this.resourceBudgets.set(budget.budgetId, clone(budget));
  }

  async listResourceBudgets(): Promise<ResourceBudget[]> {
    return Array.from(this.resourceBudgets.values()).map((budget) => clone(budget));
  }

  async getResourceQuota(quotaRef: IdRef): Promise<ResourceQuota | undefined> {
    const quota = this.resourceQuotas.get(quotaRef);
    return quota ? clone(quota) : undefined;
  }

  async putResourceQuota(quota: ResourceQuota): Promise<void> {
    this.resourceQuotas.set(quota.quotaId, clone(quota));
  }

  async listResourceQuotas(): Promise<ResourceQuota[]> {
    return Array.from(this.resourceQuotas.values()).map((quota) => clone(quota));
  }
}
