import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";
import type { AfalIntentStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AfalIntentStoreSnapshot {
  paymentIntents: PaymentIntent[];
  resourceIntents: ResourceIntent[];
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

export interface JsonFileAfalIntentStoreOptions {
  filePath: string;
  seed?: AfalIntentStoreSnapshot;
}

export class JsonFileAfalIntentStore implements AfalIntentStore {
  constructor(private readonly options: JsonFileAfalIntentStoreOptions) {}

  async getPaymentIntent(intentId: IdRef): Promise<PaymentIntent | undefined> {
    const snapshot = await this.readSnapshot();
    const intent = snapshot.paymentIntents.find((entry) => entry.intentId === intentId);
    return intent ? clone(intent) : undefined;
  }

  async putPaymentIntent(intent: PaymentIntent): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.paymentIntents.filter((entry) => entry.intentId !== intent.intentId);
    next.push(clone(intent));
    await this.writeSnapshot({ ...snapshot, paymentIntents: next });
  }

  async listPaymentIntents(): Promise<PaymentIntent[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.paymentIntents.map((entry) => clone(entry));
  }

  async getResourceIntent(intentId: IdRef): Promise<ResourceIntent | undefined> {
    const snapshot = await this.readSnapshot();
    const intent = snapshot.resourceIntents.find((entry) => entry.intentId === intentId);
    return intent ? clone(intent) : undefined;
  }

  async putResourceIntent(intent: ResourceIntent): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.resourceIntents.filter((entry) => entry.intentId !== intent.intentId);
    next.push(clone(intent));
    await this.writeSnapshot({ ...snapshot, resourceIntents: next });
  }

  async listResourceIntents(): Promise<ResourceIntent[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.resourceIntents.map((entry) => clone(entry));
  }

  private async ensureSnapshotFile(): Promise<void> {
    if (await fileExists(this.options.filePath)) {
      return;
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      paymentIntents: this.options.seed?.paymentIntents.map((entry) => clone(entry)) ?? [],
      resourceIntents: this.options.seed?.resourceIntents.map((entry) => clone(entry)) ?? [],
    });
  }

  private async readSnapshot(): Promise<AfalIntentStoreSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as AfalIntentStoreSnapshot;

    return {
      paymentIntents: parsed.paymentIntents.map((entry) => clone(entry)),
      resourceIntents: parsed.resourceIntents.map((entry) => clone(entry)),
    };
  }

  private async writeSnapshot(snapshot: AfalIntentStoreSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          paymentIntents: snapshot.paymentIntents.map((entry) => clone(entry)),
          resourceIntents: snapshot.resourceIntents.map((entry) => clone(entry)),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}
