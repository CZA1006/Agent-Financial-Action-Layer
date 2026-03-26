import type {
  AccountRecord,
  Did,
  IdRef,
  MonetaryBudget,
  ResourceBudget,
  ResourceQuota,
  Timestamp,
} from "../../sdk/types";
import type { AtsPort } from "../afal/interfaces";
import type { AtsAdminPort } from "./interfaces";
import { InMemoryAtsStore, type AtsStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertFound<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function toMoney(value: string): number {
  return Number.parseFloat(value);
}

function fromMoney(value: number): string {
  return value.toFixed(2);
}

export interface InMemoryAtsServiceOptions {
  accounts?: AccountRecord[];
  monetaryBudgets?: MonetaryBudget[];
  resourceBudgets?: ResourceBudget[];
  resourceQuotas?: ResourceQuota[];
  store?: AtsStore;
}

export class InMemoryAtsService implements AtsPort, AtsAdminPort {
  private readonly store: AtsStore;

  constructor(options: InMemoryAtsServiceOptions = {}) {
    this.store =
      options.store ??
      new InMemoryAtsStore({
        accounts: options.accounts,
        monetaryBudgets: options.monetaryBudgets,
        resourceBudgets: options.resourceBudgets,
        resourceQuotas: options.resourceQuotas,
      });
  }

  async getAccountState(accountRef: IdRef): Promise<AccountRecord> {
    return clone(assertFound(await this.store.getAccount(accountRef), `Unknown accountRef "${accountRef}"`));
  }

  async listAccounts(): Promise<AccountRecord[]> {
    return this.store.listAccounts();
  }

  async getMonetaryBudgetState(budgetRef: IdRef): Promise<MonetaryBudget> {
    return clone(
      assertFound(await this.store.getMonetaryBudget(budgetRef), `Unknown monetary budget "${budgetRef}"`)
    );
  }

  async listMonetaryBudgets(): Promise<MonetaryBudget[]> {
    return this.store.listMonetaryBudgets();
  }

  async getResourceBudgetState(budgetRef: IdRef): Promise<ResourceBudget> {
    return clone(
      assertFound(await this.store.getResourceBudget(budgetRef), `Unknown resource budget "${budgetRef}"`)
    );
  }

  async listResourceBudgets(): Promise<ResourceBudget[]> {
    return this.store.listResourceBudgets();
  }

  async getResourceQuotaState(quotaRef: IdRef): Promise<ResourceQuota> {
    return clone(
      assertFound(await this.store.getResourceQuota(quotaRef), `Unknown resource quota "${quotaRef}"`)
    );
  }

  async listResourceQuotas(): Promise<ResourceQuota[]> {
    return this.store.listResourceQuotas();
  }

  async freezeAccount(args: {
    accountRef: IdRef;
    reasonCode?: string;
    frozenBy?: Did;
    frozenAt?: Timestamp;
  }): Promise<AccountRecord> {
    const account = assertFound(
      await this.store.getAccount(args.accountRef),
      `Unknown accountRef "${args.accountRef}"`
    );
    const frozenAt = args.frozenAt ?? new Date().toISOString();
    const updated: AccountRecord = {
      ...account,
      status: "frozen",
      updatedAt: frozenAt,
      freezeState: {
        isFrozen: true,
        reasonCode: args.reasonCode ?? "manual-freeze",
        frozenBy: args.frozenBy,
        frozenAt,
        reviewRef: account.freezeState?.reviewRef,
      },
    };
    await this.store.putAccount(updated);
    return clone(updated);
  }

  async consumeMonetaryBudget(args: {
    budgetRef: IdRef;
    amount: string;
    updatedAt?: Timestamp;
  }): Promise<MonetaryBudget> {
    const budget = assertFound(
      await this.store.getMonetaryBudget(args.budgetRef),
      `Unknown monetary budget "${args.budgetRef}"`
    );
    const nextConsumed = toMoney(budget.consumedAmount) + toMoney(args.amount);
    const nextAvailable = toMoney(budget.limitAmount) - nextConsumed;
    if (nextAvailable < 0) {
      throw new Error(`Monetary budget exceeded for "${args.budgetRef}"`);
    }

    const updated: MonetaryBudget = {
      ...budget,
      consumedAmount: fromMoney(nextConsumed),
      availableAmount: fromMoney(nextAvailable),
      status: nextAvailable === 0 ? "exhausted" : budget.status,
      updatedAt: args.updatedAt ?? new Date().toISOString(),
    };
    await this.store.putMonetaryBudget(updated);
    return clone(updated);
  }

  async consumeResourceBudget(args: {
    budgetRef: IdRef;
    quantity: number;
    updatedAt?: Timestamp;
  }): Promise<ResourceBudget> {
    const budget = assertFound(
      await this.store.getResourceBudget(args.budgetRef),
      `Unknown resource budget "${args.budgetRef}"`
    );
    const nextConsumed = budget.consumedQuantity + args.quantity;
    const nextAvailable = budget.limitQuantity - nextConsumed;
    if (nextAvailable < 0) {
      throw new Error(`Resource budget exceeded for "${args.budgetRef}"`);
    }

    const updated: ResourceBudget = {
      ...budget,
      consumedQuantity: nextConsumed,
      availableQuantity: nextAvailable,
      status: nextAvailable === 0 ? "exhausted" : budget.status,
      updatedAt: args.updatedAt ?? new Date().toISOString(),
    };
    await this.store.putResourceBudget(updated);
    return clone(updated);
  }

  async consumeResourceQuota(args: {
    quotaRef: IdRef;
    quantity: number;
    updatedAt?: Timestamp;
  }): Promise<ResourceQuota> {
    const quota = assertFound(
      await this.store.getResourceQuota(args.quotaRef),
      `Unknown resource quota "${args.quotaRef}"`
    );
    const nextUsed = quota.usedQuantity + args.quantity;
    const nextAvailable = quota.maxQuantity - nextUsed;
    if (nextAvailable < 0) {
      throw new Error(`Resource quota exceeded for "${args.quotaRef}"`);
    }

    const updated: ResourceQuota = {
      ...quota,
      usedQuantity: nextUsed,
      status: nextAvailable === 0 ? "exhausted" : quota.status,
      updatedAt: args.updatedAt ?? new Date().toISOString(),
    };
    await this.store.putResourceQuota(updated);
    return clone(updated);
  }
}
