import type {
  AccountRecord,
  Did,
  IdRef,
  MonetaryBudget,
  MonetaryReservation,
  ResourceBudget,
  ResourceReservation,
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
  getMonetaryReservationState(reservationRef: IdRef): Promise<MonetaryReservation>;
  getResourceReservationState(reservationRef: IdRef): Promise<ResourceReservation>;
  listMonetaryReservations(): Promise<MonetaryReservation[]>;
  listResourceReservations(): Promise<ResourceReservation[]>;
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
  reserveMonetaryBudget(args: {
    reservationId: IdRef;
    budgetRef: IdRef;
    accountRef: IdRef;
    actionRef: IdRef;
    amount: string;
    createdAt?: Timestamp;
  }): Promise<{
    reservation: MonetaryReservation;
    budget: MonetaryBudget;
  }>;
  settleMonetaryReservation(args: {
    reservationRef: IdRef;
    settledAt?: Timestamp;
  }): Promise<{
    reservation: MonetaryReservation;
    budget: MonetaryBudget;
  }>;
  releaseMonetaryReservation(args: {
    reservationRef: IdRef;
    releasedAt?: Timestamp;
    reasonCode?: string;
  }): Promise<{
    reservation: MonetaryReservation;
    budget: MonetaryBudget;
  }>;
  reserveResourceCapacity(args: {
    reservationId: IdRef;
    budgetRef: IdRef;
    quotaRef: IdRef;
    accountRef: IdRef;
    actionRef: IdRef;
    quantity: number;
    createdAt?: Timestamp;
  }): Promise<{
    reservation: ResourceReservation;
    budget: ResourceBudget;
    quota: ResourceQuota;
  }>;
  settleResourceReservation(args: {
    reservationRef: IdRef;
    settledAt?: Timestamp;
  }): Promise<{
    reservation: ResourceReservation;
    budget: ResourceBudget;
    quota: ResourceQuota;
  }>;
  releaseResourceReservation(args: {
    reservationRef: IdRef;
    releasedAt?: Timestamp;
    reasonCode?: string;
  }): Promise<{
    reservation: ResourceReservation;
    budget: ResourceBudget;
    quota: ResourceQuota;
  }>;
}

export interface AtsAdminPort
  extends AtsAccountReader,
    AtsBudgetReader,
    AtsAccountLifecyclePort,
    AtsBudgetMutationPort {}
