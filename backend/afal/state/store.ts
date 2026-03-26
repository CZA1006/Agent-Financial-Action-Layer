import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AfalIntentStore {
  getPaymentIntent(intentId: IdRef): Promise<PaymentIntent | undefined>;
  putPaymentIntent(intent: PaymentIntent): Promise<void>;
  listPaymentIntents(): Promise<PaymentIntent[]>;
  getResourceIntent(intentId: IdRef): Promise<ResourceIntent | undefined>;
  putResourceIntent(intent: ResourceIntent): Promise<void>;
  listResourceIntents(): Promise<ResourceIntent[]>;
}

export interface InMemoryAfalIntentStoreOptions {
  paymentIntents?: Iterable<PaymentIntent>;
  resourceIntents?: Iterable<ResourceIntent>;
}

export class InMemoryAfalIntentStore implements AfalIntentStore {
  private readonly paymentIntents = new Map<IdRef, PaymentIntent>();
  private readonly resourceIntents = new Map<IdRef, ResourceIntent>();

  constructor(options: InMemoryAfalIntentStoreOptions = {}) {
    for (const intent of options.paymentIntents ?? []) {
      this.paymentIntents.set(intent.intentId, clone(intent));
    }

    for (const intent of options.resourceIntents ?? []) {
      this.resourceIntents.set(intent.intentId, clone(intent));
    }
  }

  async getPaymentIntent(intentId: IdRef): Promise<PaymentIntent | undefined> {
    const intent = this.paymentIntents.get(intentId);
    return intent ? clone(intent) : undefined;
  }

  async putPaymentIntent(intent: PaymentIntent): Promise<void> {
    this.paymentIntents.set(intent.intentId, clone(intent));
  }

  async listPaymentIntents(): Promise<PaymentIntent[]> {
    return [...this.paymentIntents.values()].map((intent) => clone(intent));
  }

  async getResourceIntent(intentId: IdRef): Promise<ResourceIntent | undefined> {
    const intent = this.resourceIntents.get(intentId);
    return intent ? clone(intent) : undefined;
  }

  async putResourceIntent(intent: ResourceIntent): Promise<void> {
    this.resourceIntents.set(intent.intentId, clone(intent));
  }

  async listResourceIntents(): Promise<ResourceIntent[]> {
    return [...this.resourceIntents.values()].map((intent) => clone(intent));
  }
}
