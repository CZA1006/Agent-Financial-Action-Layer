import type {
  AccountRecord,
  Did,
  IdRef,
  MonetaryBudget,
  ResourceBudget,
  ResourceQuota,
  Timestamp,
} from "../../sdk/types";

export interface AtsAccountReader {
  getAccountState(accountRef: IdRef): Promise<AccountRecord>;
  listAccounts(): Promise<AccountRecord[]>;
}

export interface AtsBudgetReader {
  getMonetaryBudgetState(budgetRef: IdRef): Promise<MonetaryBudget>;
  getResourceBudgetState(budgetRef: IdRef): Promise<ResourceBudget>;
  getResourceQuotaState(quotaRef: IdRef): Promise<ResourceQuota>;
  listMonetaryBudgets(): Promise<MonetaryBudget[]>;
  listResourceBudgets(): Promise<ResourceBudget[]>;
  listResourceQuotas(): Promise<ResourceQuota[]>;
}

export interface AtsAccountLifecyclePort {
  freezeAccount(args: {
    accountRef: IdRef;
    reasonCode?: string;
    frozenBy?: Did;
    frozenAt?: Timestamp;
  }): Promise<AccountRecord>;
}

export interface AtsBudgetMutationPort {
  consumeMonetaryBudget(args: {
    budgetRef: IdRef;
    amount: string;
    updatedAt?: Timestamp;
  }): Promise<MonetaryBudget>;
  consumeResourceBudget(args: {
    budgetRef: IdRef;
    quantity: number;
    updatedAt?: Timestamp;
  }): Promise<ResourceBudget>;
  consumeResourceQuota(args: {
    quotaRef: IdRef;
    quantity: number;
    updatedAt?: Timestamp;
  }): Promise<ResourceQuota>;
}

export interface AtsAdminPort
  extends AtsAccountReader,
    AtsBudgetReader,
    AtsAccountLifecyclePort,
    AtsBudgetMutationPort {}
