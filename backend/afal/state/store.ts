import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";
import type { PendingApprovalExecution } from "./interfaces";

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
  getPendingExecution(approvalSessionRef: IdRef): Promise<PendingApprovalExecution | undefined>;
  putPendingExecution(execution: PendingApprovalExecution): Promise<void>;
  listPendingExecutions(): Promise<PendingApprovalExecution[]>;
}

export interface InMemoryAfalIntentStoreOptions {
  paymentIntents?: Iterable<PaymentIntent>;
  resourceIntents?: Iterable<ResourceIntent>;
  pendingExecutions?: Iterable<PendingApprovalExecution>;
}

export class InMemoryAfalIntentStore implements AfalIntentStore {
  private readonly paymentIntents = new Map<IdRef, PaymentIntent>();
  private readonly resourceIntents = new Map<IdRef, ResourceIntent>();
  private readonly pendingExecutions = new Map<IdRef, PendingApprovalExecution>();

  constructor(options: InMemoryAfalIntentStoreOptions = {}) {
    for (const intent of options.paymentIntents ?? []) {
      this.paymentIntents.set(intent.intentId, clone(intent));
    }

    for (const intent of options.resourceIntents ?? []) {
      this.resourceIntents.set(intent.intentId, clone(intent));
    }

    for (const execution of options.pendingExecutions ?? []) {
      this.pendingExecutions.set(execution.approvalSessionRef, clone(execution));
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

  async getPendingExecution(
    approvalSessionRef: IdRef
  ): Promise<PendingApprovalExecution | undefined> {
    const execution = this.pendingExecutions.get(approvalSessionRef);
    return execution ? clone(execution) : undefined;
  }

  async putPendingExecution(execution: PendingApprovalExecution): Promise<void> {
    this.pendingExecutions.set(execution.approvalSessionRef, clone(execution));
  }

  async listPendingExecutions(): Promise<PendingApprovalExecution[]> {
    return [...this.pendingExecutions.values()].map((execution) => clone(execution));
  }
}
