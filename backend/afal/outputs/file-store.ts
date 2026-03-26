import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { ActionReceipt, CapabilityResponse, IdRef } from "../../../sdk/types";
import type { AfalOutputStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AfalOutputStoreSnapshot {
  receipts: ActionReceipt[];
  capabilityResponses: CapabilityResponse[];
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

export interface JsonFileAfalOutputStoreOptions {
  filePath: string;
  seed?: AfalOutputStoreSnapshot;
}

export class JsonFileAfalOutputStore implements AfalOutputStore {
  constructor(private readonly options: JsonFileAfalOutputStoreOptions) {}

  async getReceipt(receiptId: IdRef): Promise<ActionReceipt | undefined> {
    const snapshot = await this.readSnapshot();
    const receipt = snapshot.receipts.find((entry) => entry.receiptId === receiptId);
    return receipt ? clone(receipt) : undefined;
  }

  async putReceipt(receipt: ActionReceipt): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.receipts.filter((entry) => entry.receiptId !== receipt.receiptId);
    next.push(clone(receipt));
    await this.writeSnapshot({ ...snapshot, receipts: next });
  }

  async listReceipts(): Promise<ActionReceipt[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.receipts.map((entry) => clone(entry));
  }

  async getCapabilityResponse(responseId: IdRef): Promise<CapabilityResponse | undefined> {
    const snapshot = await this.readSnapshot();
    const response = snapshot.capabilityResponses.find((entry) => entry.responseId === responseId);
    return response ? clone(response) : undefined;
  }

  async putCapabilityResponse(response: CapabilityResponse): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.capabilityResponses.filter(
      (entry) => entry.responseId !== response.responseId
    );
    next.push(clone(response));
    await this.writeSnapshot({ ...snapshot, capabilityResponses: next });
  }

  async listCapabilityResponses(): Promise<CapabilityResponse[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.capabilityResponses.map((entry) => clone(entry));
  }

  private async ensureSnapshotFile(): Promise<void> {
    if (await fileExists(this.options.filePath)) {
      return;
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      receipts: this.options.seed?.receipts.map((entry) => clone(entry)) ?? [],
      capabilityResponses:
        this.options.seed?.capabilityResponses.map((entry) => clone(entry)) ?? [],
    });
  }

  private async readSnapshot(): Promise<AfalOutputStoreSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as AfalOutputStoreSnapshot;

    return {
      receipts: parsed.receipts.map((entry) => clone(entry)),
      capabilityResponses: parsed.capabilityResponses.map((entry) => clone(entry)),
    };
  }

  private async writeSnapshot(snapshot: AfalOutputStoreSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          receipts: snapshot.receipts.map((entry) => clone(entry)),
          capabilityResponses: snapshot.capabilityResponses.map((entry) => clone(entry)),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}
