import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  AccountRecord,
  IdRef,
  MonetaryBudget,
  ResourceBudget,
  ResourceQuota,
} from "../../sdk/types";
import type { AtsStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AtsStoreSnapshot {
  accounts: AccountRecord[];
  monetaryBudgets: MonetaryBudget[];
  resourceBudgets: ResourceBudget[];
  resourceQuotas: ResourceQuota[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export interface JsonFileAtsStoreOptions {
  filePath: string;
  seed?: AtsStoreSnapshot;
}

export class JsonFileAtsStore implements AtsStore {
  constructor(private readonly options: JsonFileAtsStoreOptions) {}

  async getAccount(accountRef: IdRef): Promise<AccountRecord | undefined> {
    const snapshot = await this.readSnapshot();
    const account = snapshot.accounts.find((entry) => entry.accountId === accountRef);
    return account ? clone(account) : undefined;
  }

  async putAccount(account: AccountRecord): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.accounts.filter((entry) => entry.accountId !== account.accountId);
    next.push(clone(account));
    await this.writeSnapshot({ ...snapshot, accounts: next });
  }

  async listAccounts(): Promise<AccountRecord[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.accounts.map((account) => clone(account));
  }

  async getMonetaryBudget(budgetRef: IdRef): Promise<MonetaryBudget | undefined> {
    const snapshot = await this.readSnapshot();
    const budget = snapshot.monetaryBudgets.find((entry) => entry.budgetId === budgetRef);
    return budget ? clone(budget) : undefined;
  }

  async putMonetaryBudget(budget: MonetaryBudget): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.monetaryBudgets.filter((entry) => entry.budgetId !== budget.budgetId);
    next.push(clone(budget));
    await this.writeSnapshot({ ...snapshot, monetaryBudgets: next });
  }

  async listMonetaryBudgets(): Promise<MonetaryBudget[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.monetaryBudgets.map((budget) => clone(budget));
  }

  async getResourceBudget(budgetRef: IdRef): Promise<ResourceBudget | undefined> {
    const snapshot = await this.readSnapshot();
    const budget = snapshot.resourceBudgets.find((entry) => entry.budgetId === budgetRef);
    return budget ? clone(budget) : undefined;
  }

  async putResourceBudget(budget: ResourceBudget): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.resourceBudgets.filter((entry) => entry.budgetId !== budget.budgetId);
    next.push(clone(budget));
    await this.writeSnapshot({ ...snapshot, resourceBudgets: next });
  }

  async listResourceBudgets(): Promise<ResourceBudget[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.resourceBudgets.map((budget) => clone(budget));
  }

  async getResourceQuota(quotaRef: IdRef): Promise<ResourceQuota | undefined> {
    const snapshot = await this.readSnapshot();
    const quota = snapshot.resourceQuotas.find((entry) => entry.quotaId === quotaRef);
    return quota ? clone(quota) : undefined;
  }

  async putResourceQuota(quota: ResourceQuota): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.resourceQuotas.filter((entry) => entry.quotaId !== quota.quotaId);
    next.push(clone(quota));
    await this.writeSnapshot({ ...snapshot, resourceQuotas: next });
  }

  async listResourceQuotas(): Promise<ResourceQuota[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.resourceQuotas.map((quota) => clone(quota));
  }

  private async ensureSnapshotFile(): Promise<void> {
    if (await fileExists(this.options.filePath)) {
      return;
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      accounts: this.options.seed?.accounts.map((account) => clone(account)) ?? [],
      monetaryBudgets:
        this.options.seed?.monetaryBudgets.map((budget) => clone(budget)) ?? [],
      resourceBudgets:
        this.options.seed?.resourceBudgets.map((budget) => clone(budget)) ?? [],
      resourceQuotas:
        this.options.seed?.resourceQuotas.map((quota) => clone(quota)) ?? [],
    });
  }

  private async readSnapshot(): Promise<AtsStoreSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as AtsStoreSnapshot;

    return {
      accounts: parsed.accounts.map((account) => clone(account)),
      monetaryBudgets: parsed.monetaryBudgets.map((budget) => clone(budget)),
      resourceBudgets: parsed.resourceBudgets.map((budget) => clone(budget)),
      resourceQuotas: parsed.resourceQuotas.map((quota) => clone(quota)),
    };
  }

  private async writeSnapshot(snapshot: AtsStoreSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          accounts: snapshot.accounts.map((account) => clone(account)),
          monetaryBudgets: snapshot.monetaryBudgets.map((budget) => clone(budget)),
          resourceBudgets: snapshot.resourceBudgets.map((budget) => clone(budget)),
          resourceQuotas: snapshot.resourceQuotas.map((quota) => clone(quota)),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}
