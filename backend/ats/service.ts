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

function getReservedAmount(budget: MonetaryBudget): number {
  return toMoney(budget.reservedAmount ?? "0.00");
}

function getReservedQuantity(budget: ResourceBudget | ResourceQuota): number {
  return budget.reservedQuantity ?? 0;
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

  async getMonetaryReservationState(reservationRef: IdRef): Promise<MonetaryReservation> {
    return clone(
      assertFound(
        await this.store.getMonetaryReservation(reservationRef),
        `Unknown monetary reservation "${reservationRef}"`
      )
    );
  }

  async getResourceReservationState(reservationRef: IdRef): Promise<ResourceReservation> {
    return clone(
      assertFound(
        await this.store.getResourceReservation(reservationRef),
        `Unknown resource reservation "${reservationRef}"`
      )
    );
  }

  async listMonetaryReservations(): Promise<MonetaryReservation[]> {
    return this.store.listMonetaryReservations();
  }

  async listResourceReservations(): Promise<ResourceReservation[]> {
    return this.store.listResourceReservations();
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

  async reserveMonetaryBudget(args: {
    reservationId: IdRef;
    budgetRef: IdRef;
    accountRef: IdRef;
    actionRef: IdRef;
    amount: string;
    createdAt?: Timestamp;
  }): Promise<{ reservation: MonetaryReservation; budget: MonetaryBudget }> {
    const budget = assertFound(
      await this.store.getMonetaryBudget(args.budgetRef),
      `Unknown monetary budget "${args.budgetRef}"`
    );
    const amount = toMoney(args.amount);
    const nextReserved = getReservedAmount(budget) + amount;
    const nextAvailable = toMoney(budget.limitAmount) - toMoney(budget.consumedAmount) - nextReserved;
    if (nextAvailable < 0) {
      throw new Error(`Monetary budget exceeded for "${args.budgetRef}"`);
    }

    const timestamp = args.createdAt ?? new Date().toISOString();
    const reservation: MonetaryReservation = {
      reservationId: args.reservationId,
      reservationType: "monetary",
      budgetRef: args.budgetRef,
      accountRef: args.accountRef,
      actionRef: args.actionRef,
      amount: args.amount,
      status: "reserved",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const updatedBudget: MonetaryBudget = {
      ...budget,
      reservedAmount: fromMoney(nextReserved),
      availableAmount: fromMoney(nextAvailable),
      status: nextAvailable === 0 ? "exhausted" : budget.status,
      updatedAt: timestamp,
    };
    await this.store.putMonetaryReservation(reservation);
    await this.store.putMonetaryBudget(updatedBudget);
    return {
      reservation: clone(reservation),
      budget: clone(updatedBudget),
    };
  }

  async settleMonetaryReservation(args: {
    reservationRef: IdRef;
    settledAt?: Timestamp;
  }): Promise<{ reservation: MonetaryReservation; budget: MonetaryBudget }> {
    const reservation = assertFound(
      await this.store.getMonetaryReservation(args.reservationRef),
      `Unknown monetary reservation "${args.reservationRef}"`
    );
    assertFound(
      reservation.status === "reserved",
      `Monetary reservation "${args.reservationRef}" is not active`
    );
    const budget = assertFound(
      await this.store.getMonetaryBudget(reservation.budgetRef),
      `Unknown monetary budget "${reservation.budgetRef}"`
    );
    const timestamp = args.settledAt ?? new Date().toISOString();
    const amount = toMoney(reservation.amount);
    const nextReserved = getReservedAmount(budget) - amount;
    const nextConsumed = toMoney(budget.consumedAmount) + amount;
    const nextAvailable = toMoney(budget.limitAmount) - nextConsumed - nextReserved;
    const updatedReservation: MonetaryReservation = {
      ...reservation,
      status: "settled",
      settledAt: timestamp,
      updatedAt: timestamp,
    };
    const updatedBudget: MonetaryBudget = {
      ...budget,
      consumedAmount: fromMoney(nextConsumed),
      reservedAmount: fromMoney(Math.max(nextReserved, 0)),
      availableAmount: fromMoney(Math.max(nextAvailable, 0)),
      status: nextAvailable === 0 ? "exhausted" : budget.status,
      updatedAt: timestamp,
    };
    await this.store.putMonetaryReservation(updatedReservation);
    await this.store.putMonetaryBudget(updatedBudget);
    return {
      reservation: clone(updatedReservation),
      budget: clone(updatedBudget),
    };
  }

  async releaseMonetaryReservation(args: {
    reservationRef: IdRef;
    releasedAt?: Timestamp;
    reasonCode?: string;
  }): Promise<{ reservation: MonetaryReservation; budget: MonetaryBudget }> {
    const reservation = assertFound(
      await this.store.getMonetaryReservation(args.reservationRef),
      `Unknown monetary reservation "${args.reservationRef}"`
    );
    assertFound(
      reservation.status === "reserved",
      `Monetary reservation "${args.reservationRef}" is not active`
    );
    const budget = assertFound(
      await this.store.getMonetaryBudget(reservation.budgetRef),
      `Unknown monetary budget "${reservation.budgetRef}"`
    );
    const timestamp = args.releasedAt ?? new Date().toISOString();
    const nextReserved = getReservedAmount(budget) - toMoney(reservation.amount);
    const nextAvailable =
      toMoney(budget.limitAmount) - toMoney(budget.consumedAmount) - nextReserved;
    const updatedReservation: MonetaryReservation = {
      ...reservation,
      status: "released",
      releasedAt: timestamp,
      releaseReasonCode: args.reasonCode,
      updatedAt: timestamp,
    };
    const updatedBudget: MonetaryBudget = {
      ...budget,
      reservedAmount: fromMoney(Math.max(nextReserved, 0)),
      availableAmount: fromMoney(Math.max(nextAvailable, 0)),
      status: "active",
      updatedAt: timestamp,
    };
    await this.store.putMonetaryReservation(updatedReservation);
    await this.store.putMonetaryBudget(updatedBudget);
    return {
      reservation: clone(updatedReservation),
      budget: clone(updatedBudget),
    };
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

  async reserveResourceCapacity(args: {
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
  }> {
    const budget = assertFound(
      await this.store.getResourceBudget(args.budgetRef),
      `Unknown resource budget "${args.budgetRef}"`
    );
    const quota = assertFound(
      await this.store.getResourceQuota(args.quotaRef),
      `Unknown resource quota "${args.quotaRef}"`
    );
    const nextBudgetReserved = getReservedQuantity(budget) + args.quantity;
    const nextBudgetAvailable = budget.limitQuantity - budget.consumedQuantity - nextBudgetReserved;
    if (nextBudgetAvailable < 0) {
      throw new Error(`Resource budget exceeded for "${args.budgetRef}"`);
    }
    const nextQuotaReserved = getReservedQuantity(quota) + args.quantity;
    const nextQuotaAvailable = quota.maxQuantity - quota.usedQuantity - nextQuotaReserved;
    if (nextQuotaAvailable < 0) {
      throw new Error(`Resource quota exceeded for "${args.quotaRef}"`);
    }

    const timestamp = args.createdAt ?? new Date().toISOString();
    const reservation: ResourceReservation = {
      reservationId: args.reservationId,
      reservationType: "resource",
      budgetRef: args.budgetRef,
      quotaRef: args.quotaRef,
      accountRef: args.accountRef,
      actionRef: args.actionRef,
      quantity: args.quantity,
      status: "reserved",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const updatedBudget: ResourceBudget = {
      ...budget,
      reservedQuantity: nextBudgetReserved,
      availableQuantity: nextBudgetAvailable,
      status: nextBudgetAvailable === 0 ? "exhausted" : budget.status,
      updatedAt: timestamp,
    };
    const updatedQuota: ResourceQuota = {
      ...quota,
      reservedQuantity: nextQuotaReserved,
      status: nextQuotaAvailable === 0 ? "exhausted" : quota.status,
      updatedAt: timestamp,
    };
    await this.store.putResourceReservation(reservation);
    await this.store.putResourceBudget(updatedBudget);
    await this.store.putResourceQuota(updatedQuota);
    return {
      reservation: clone(reservation),
      budget: clone(updatedBudget),
      quota: clone(updatedQuota),
    };
  }

  async settleResourceReservation(args: {
    reservationRef: IdRef;
    settledAt?: Timestamp;
  }): Promise<{
    reservation: ResourceReservation;
    budget: ResourceBudget;
    quota: ResourceQuota;
  }> {
    const reservation = assertFound(
      await this.store.getResourceReservation(args.reservationRef),
      `Unknown resource reservation "${args.reservationRef}"`
    );
    assertFound(
      reservation.status === "reserved",
      `Resource reservation "${args.reservationRef}" is not active`
    );
    const budget = assertFound(
      await this.store.getResourceBudget(reservation.budgetRef),
      `Unknown resource budget "${reservation.budgetRef}"`
    );
    const quota = assertFound(
      await this.store.getResourceQuota(reservation.quotaRef),
      `Unknown resource quota "${reservation.quotaRef}"`
    );
    const timestamp = args.settledAt ?? new Date().toISOString();
    const nextBudgetReserved = getReservedQuantity(budget) - reservation.quantity;
    const nextBudgetConsumed = budget.consumedQuantity + reservation.quantity;
    const nextBudgetAvailable = budget.limitQuantity - nextBudgetConsumed - nextBudgetReserved;
    const nextQuotaReserved = getReservedQuantity(quota) - reservation.quantity;
    const nextQuotaUsed = quota.usedQuantity + reservation.quantity;
    const nextQuotaAvailable = quota.maxQuantity - nextQuotaUsed - nextQuotaReserved;
    const updatedReservation: ResourceReservation = {
      ...reservation,
      status: "settled",
      settledAt: timestamp,
      updatedAt: timestamp,
    };
    const updatedBudget: ResourceBudget = {
      ...budget,
      consumedQuantity: nextBudgetConsumed,
      reservedQuantity: Math.max(nextBudgetReserved, 0),
      availableQuantity: Math.max(nextBudgetAvailable, 0),
      status: nextBudgetAvailable === 0 ? "exhausted" : budget.status,
      updatedAt: timestamp,
    };
    const updatedQuota: ResourceQuota = {
      ...quota,
      usedQuantity: nextQuotaUsed,
      reservedQuantity: Math.max(nextQuotaReserved, 0),
      status: nextQuotaAvailable === 0 ? "exhausted" : quota.status,
      updatedAt: timestamp,
    };
    await this.store.putResourceReservation(updatedReservation);
    await this.store.putResourceBudget(updatedBudget);
    await this.store.putResourceQuota(updatedQuota);
    return {
      reservation: clone(updatedReservation),
      budget: clone(updatedBudget),
      quota: clone(updatedQuota),
    };
  }

  async releaseResourceReservation(args: {
    reservationRef: IdRef;
    releasedAt?: Timestamp;
    reasonCode?: string;
  }): Promise<{
    reservation: ResourceReservation;
    budget: ResourceBudget;
    quota: ResourceQuota;
  }> {
    const reservation = assertFound(
      await this.store.getResourceReservation(args.reservationRef),
      `Unknown resource reservation "${args.reservationRef}"`
    );
    assertFound(
      reservation.status === "reserved",
      `Resource reservation "${args.reservationRef}" is not active`
    );
    const budget = assertFound(
      await this.store.getResourceBudget(reservation.budgetRef),
      `Unknown resource budget "${reservation.budgetRef}"`
    );
    const quota = assertFound(
      await this.store.getResourceQuota(reservation.quotaRef),
      `Unknown resource quota "${reservation.quotaRef}"`
    );
    const timestamp = args.releasedAt ?? new Date().toISOString();
    const nextBudgetReserved = getReservedQuantity(budget) - reservation.quantity;
    const nextBudgetAvailable = budget.limitQuantity - budget.consumedQuantity - nextBudgetReserved;
    const nextQuotaReserved = getReservedQuantity(quota) - reservation.quantity;
    const nextQuotaAvailable = quota.maxQuantity - quota.usedQuantity - nextQuotaReserved;
    const updatedReservation: ResourceReservation = {
      ...reservation,
      status: "released",
      releasedAt: timestamp,
      releaseReasonCode: args.reasonCode,
      updatedAt: timestamp,
    };
    const updatedBudget: ResourceBudget = {
      ...budget,
      reservedQuantity: Math.max(nextBudgetReserved, 0),
      availableQuantity: Math.max(nextBudgetAvailable, 0),
      status: "active",
      updatedAt: timestamp,
    };
    const updatedQuota: ResourceQuota = {
      ...quota,
      reservedQuantity: Math.max(nextQuotaReserved, 0),
      status: "active",
      updatedAt: timestamp,
    };
    await this.store.putResourceReservation(updatedReservation);
    await this.store.putResourceBudget(updatedBudget);
    await this.store.putResourceQuota(updatedQuota);
    return {
      reservation: clone(updatedReservation),
      budget: clone(updatedBudget),
      quota: clone(updatedQuota),
    };
  }
}
