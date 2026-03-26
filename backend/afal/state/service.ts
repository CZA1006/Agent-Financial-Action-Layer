import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";
import type {
  IntentStateAdminPort,
  PendingApprovalExecution,
  PaymentIntentTemplateResolver,
  ResourceIntentTemplateResolver,
} from "./interfaces";
import { InMemoryAfalIntentStore, type AfalIntentStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertFound<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export interface AfalIntentStateServiceOptions {
  store?: AfalIntentStore;
  templateResolver?: PaymentIntentTemplateResolver & ResourceIntentTemplateResolver;
}

export class AfalIntentStateService implements IntentStateAdminPort {
  private readonly store: AfalIntentStore;
  private readonly templateResolver?: PaymentIntentTemplateResolver & ResourceIntentTemplateResolver;

  constructor(options: AfalIntentStateServiceOptions = {}) {
    this.store = options.store ?? new InMemoryAfalIntentStore();
    this.templateResolver = options.templateResolver;
  }

  async getPaymentIntent(intentId: IdRef): Promise<PaymentIntent> {
    return clone(
      assertFound(await this.store.getPaymentIntent(intentId), `Unknown payment intent "${intentId}"`)
    );
  }

  async listPaymentIntents(): Promise<PaymentIntent[]> {
    return this.store.listPaymentIntents();
  }

  async getResourceIntent(intentId: IdRef): Promise<ResourceIntent> {
    return clone(
      assertFound(await this.store.getResourceIntent(intentId), `Unknown resource intent "${intentId}"`)
    );
  }

  async listResourceIntents(): Promise<ResourceIntent[]> {
    return this.store.listResourceIntents();
  }

  async getPendingExecution(approvalSessionRef: IdRef): Promise<PendingApprovalExecution> {
    return clone(
      assertFound(
        await this.store.getPendingExecution(approvalSessionRef),
        `Unknown approvalSessionRef "${approvalSessionRef}" for AFAL pending execution`
      )
    );
  }

  async listPendingExecutions(): Promise<PendingApprovalExecution[]> {
    return this.store.listPendingExecutions();
  }

  async createPaymentIntent(intent: PaymentIntent): Promise<PaymentIntent> {
    const template = this.templateResolver?.resolvePaymentIntentTemplate(intent.intentId);
    const nextIntent = template ? { ...clone(template), ...clone(intent) } : clone(intent);
    await this.store.putPaymentIntent(nextIntent);
    return clone(nextIntent);
  }

  async createResourceIntent(intent: ResourceIntent): Promise<ResourceIntent> {
    const template = this.templateResolver?.resolveResourceIntentTemplate(intent.intentId);
    const nextIntent = template ? { ...clone(template), ...clone(intent) } : clone(intent);
    await this.store.putResourceIntent(nextIntent);
    return clone(nextIntent);
  }

  async createPendingExecution(
    execution: PendingApprovalExecution
  ): Promise<PendingApprovalExecution> {
    const nextExecution = clone(execution);
    await this.store.putPendingExecution(nextExecution);
    return clone(nextExecution);
  }

  async markPendingExecution(args: {
    approvalSessionRef: IdRef;
    status: PendingApprovalExecution["status"];
    updatedAt?: string;
    finalDecisionRef?: IdRef;
    settlementRef?: IdRef;
    receiptRef?: IdRef;
    usageReceiptRef?: IdRef;
  }): Promise<PendingApprovalExecution> {
    const current = await this.getPendingExecution(args.approvalSessionRef);
    const nextExecution: PendingApprovalExecution = {
      ...current,
      status: args.status,
      updatedAt: args.updatedAt ?? current.updatedAt,
      finalDecisionRef: args.finalDecisionRef ?? current.finalDecisionRef,
      settlementRef: args.settlementRef ?? current.settlementRef,
      receiptRef: args.receiptRef ?? current.receiptRef,
      usageReceiptRef: args.usageReceiptRef ?? current.usageReceiptRef,
    };
    await this.store.putPendingExecution(nextExecution);
    return clone(nextExecution);
  }

  async markPaymentChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: PaymentIntent["challengeState"];
    status: PaymentIntent["status"];
  }): Promise<PaymentIntent> {
    const current = await this.getPaymentIntent(args.intentId);
    const nextIntent: PaymentIntent = {
      ...current,
      decisionRef: args.decisionRef ?? current.decisionRef,
      challengeRef: args.challengeRef ?? current.challengeRef,
      challengeState: args.challengeState,
      status: args.status,
    };
    await this.store.putPaymentIntent(nextIntent);
    return clone(nextIntent);
  }

  async markPaymentSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: PaymentIntent["challengeState"];
    settlementRef: IdRef;
    receiptRef: IdRef;
    status: PaymentIntent["status"];
  }): Promise<PaymentIntent> {
    const current = await this.getPaymentIntent(args.intentId);
    const nextIntent: PaymentIntent = {
      ...current,
      decisionRef: args.decisionRef ?? current.decisionRef,
      challengeRef: args.challengeRef ?? current.challengeRef,
      challengeState: args.challengeState,
      settlementRef: args.settlementRef,
      receiptRef: args.receiptRef,
      status: args.status,
    };
    await this.store.putPaymentIntent(nextIntent);
    return clone(nextIntent);
  }

  async markResourceChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ResourceIntent["challengeState"];
    status: ResourceIntent["status"];
  }): Promise<ResourceIntent> {
    const current = await this.getResourceIntent(args.intentId);
    const nextIntent: ResourceIntent = {
      ...current,
      decisionRef: args.decisionRef ?? current.decisionRef,
      challengeRef: args.challengeRef ?? current.challengeRef,
      challengeState: args.challengeState,
      status: args.status,
    };
    await this.store.putResourceIntent(nextIntent);
    return clone(nextIntent);
  }

  async markResourceSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ResourceIntent["challengeState"];
    usageReceiptRef: IdRef;
    settlementRef: IdRef;
    status: ResourceIntent["status"];
  }): Promise<ResourceIntent> {
    const current = await this.getResourceIntent(args.intentId);
    const nextIntent: ResourceIntent = {
      ...current,
      decisionRef: args.decisionRef ?? current.decisionRef,
      challengeRef: args.challengeRef ?? current.challengeRef,
      challengeState: args.challengeState,
      usageReceiptRef: args.usageReceiptRef,
      settlementRef: args.settlementRef,
      status: args.status,
    };
    await this.store.putResourceIntent(nextIntent);
    return clone(nextIntent);
  }
}
