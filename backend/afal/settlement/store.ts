import type { IdRef, SettlementRecord } from "../../../sdk/types";
import type { ProviderUsageConfirmation } from "../interfaces";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AfalSettlementStore {
  getSettlement(settlementId: IdRef): Promise<SettlementRecord | undefined>;
  putSettlement(record: SettlementRecord): Promise<void>;
  listSettlements(): Promise<SettlementRecord[]>;
  getUsageConfirmation(usageReceiptRef: IdRef): Promise<ProviderUsageConfirmation | undefined>;
  putUsageConfirmation(record: ProviderUsageConfirmation): Promise<void>;
  listUsageConfirmations(): Promise<ProviderUsageConfirmation[]>;
}

export interface InMemoryAfalSettlementStoreOptions {
  settlements?: Iterable<SettlementRecord>;
  usageConfirmations?: Iterable<ProviderUsageConfirmation>;
}

export class InMemoryAfalSettlementStore implements AfalSettlementStore {
  private readonly settlements = new Map<IdRef, SettlementRecord>();
  private readonly usageConfirmations = new Map<IdRef, ProviderUsageConfirmation>();

  constructor(options: InMemoryAfalSettlementStoreOptions = {}) {
    for (const record of options.settlements ?? []) {
      this.settlements.set(record.settlementId, clone(record));
    }

    for (const record of options.usageConfirmations ?? []) {
      this.usageConfirmations.set(record.usageReceiptRef, clone(record));
    }
  }

  async getSettlement(settlementId: IdRef): Promise<SettlementRecord | undefined> {
    const record = this.settlements.get(settlementId);
    return record ? clone(record) : undefined;
  }

  async putSettlement(record: SettlementRecord): Promise<void> {
    this.settlements.set(record.settlementId, clone(record));
  }

  async listSettlements(): Promise<SettlementRecord[]> {
    return [...this.settlements.values()].map((record) => clone(record));
  }

  async getUsageConfirmation(
    usageReceiptRef: IdRef
  ): Promise<ProviderUsageConfirmation | undefined> {
    const record = this.usageConfirmations.get(usageReceiptRef);
    return record ? clone(record) : undefined;
  }

  async putUsageConfirmation(record: ProviderUsageConfirmation): Promise<void> {
    this.usageConfirmations.set(record.usageReceiptRef, clone(record));
  }

  async listUsageConfirmations(): Promise<ProviderUsageConfirmation[]> {
    return [...this.usageConfirmations.values()].map((record) => clone(record));
  }
}
