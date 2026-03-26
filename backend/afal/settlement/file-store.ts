import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { IdRef, SettlementRecord } from "../../../sdk/types";
import type { ProviderUsageConfirmation } from "../interfaces";
import type { AfalSettlementStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AfalSettlementStoreSnapshot {
  settlements: SettlementRecord[];
  usageConfirmations: ProviderUsageConfirmation[];
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

export interface JsonFileAfalSettlementStoreOptions {
  filePath: string;
  seed?: AfalSettlementStoreSnapshot;
}

export class JsonFileAfalSettlementStore implements AfalSettlementStore {
  constructor(private readonly options: JsonFileAfalSettlementStoreOptions) {}

  async getSettlement(settlementId: IdRef): Promise<SettlementRecord | undefined> {
    const snapshot = await this.readSnapshot();
    const record = snapshot.settlements.find((entry) => entry.settlementId === settlementId);
    return record ? clone(record) : undefined;
  }

  async putSettlement(record: SettlementRecord): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.settlements.filter((entry) => entry.settlementId !== record.settlementId);
    next.push(clone(record));
    await this.writeSnapshot({ ...snapshot, settlements: next });
  }

  async listSettlements(): Promise<SettlementRecord[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.settlements.map((entry) => clone(entry));
  }

  async getUsageConfirmation(
    usageReceiptRef: IdRef
  ): Promise<ProviderUsageConfirmation | undefined> {
    const snapshot = await this.readSnapshot();
    const record = snapshot.usageConfirmations.find(
      (entry) => entry.usageReceiptRef === usageReceiptRef
    );
    return record ? clone(record) : undefined;
  }

  async putUsageConfirmation(record: ProviderUsageConfirmation): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.usageConfirmations.filter(
      (entry) => entry.usageReceiptRef !== record.usageReceiptRef
    );
    next.push(clone(record));
    await this.writeSnapshot({ ...snapshot, usageConfirmations: next });
  }

  async listUsageConfirmations(): Promise<ProviderUsageConfirmation[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.usageConfirmations.map((entry) => clone(entry));
  }

  private async ensureSnapshotFile(): Promise<void> {
    if (await fileExists(this.options.filePath)) {
      return;
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      settlements: this.options.seed?.settlements.map((entry) => clone(entry)) ?? [],
      usageConfirmations:
        this.options.seed?.usageConfirmations.map((entry) => clone(entry)) ?? [],
    });
  }

  private async readSnapshot(): Promise<AfalSettlementStoreSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as AfalSettlementStoreSnapshot;

    return {
      settlements: parsed.settlements.map((entry) => clone(entry)),
      usageConfirmations: parsed.usageConfirmations.map((entry) => clone(entry)),
    };
  }

  private async writeSnapshot(snapshot: AfalSettlementStoreSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          settlements: snapshot.settlements.map((entry) => clone(entry)),
          usageConfirmations: snapshot.usageConfirmations.map((entry) => clone(entry)),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}
