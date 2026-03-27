import type { AuthorizationDecision, IdRef, PaymentIntent, ResourceIntent, SettlementRecord } from "../../../sdk/types";
import type {
  PaymentSettlementPort,
  ProviderUsageConfirmation,
  ResourceSettlementPort,
} from "../interfaces";
import type {
  PaymentRailAdapter,
  PaymentSettlementTemplateResolver,
  ResourceProviderAdapter,
  ResourceSettlementTemplateResolver,
  SettlementAdminPort,
} from "./interfaces";
import {
  SeededPaymentRailAdapter,
  SeededResourceProviderAdapter,
} from "./adapters";
import { InMemoryAfalSettlementStore, type AfalSettlementStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertFound<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export interface AfalSettlementServiceOptions {
  store?: AfalSettlementStore;
  templateResolver?: PaymentSettlementTemplateResolver & ResourceSettlementTemplateResolver;
  paymentAdapter?: PaymentRailAdapter;
  resourceAdapter?: ResourceProviderAdapter;
}

export class AfalSettlementService
  implements PaymentSettlementPort, ResourceSettlementPort, SettlementAdminPort
{
  private readonly store: AfalSettlementStore;
  private readonly templateResolver?: PaymentSettlementTemplateResolver &
    ResourceSettlementTemplateResolver;
  private readonly paymentAdapter: PaymentRailAdapter;
  private readonly resourceAdapter: ResourceProviderAdapter;

  constructor(options: AfalSettlementServiceOptions = {}) {
    this.store = options.store ?? new InMemoryAfalSettlementStore();
    this.templateResolver = options.templateResolver;
    this.paymentAdapter =
      options.paymentAdapter ?? new SeededPaymentRailAdapter(this.templateResolver);
    this.resourceAdapter =
      options.resourceAdapter ?? new SeededResourceProviderAdapter(this.templateResolver);
  }

  async getSettlement(settlementId: IdRef): Promise<SettlementRecord> {
    return clone(
      assertFound(await this.store.getSettlement(settlementId), `Unknown settlementId "${settlementId}"`)
    );
  }

  async listSettlements(): Promise<SettlementRecord[]> {
    return this.store.listSettlements();
  }

  async getUsageConfirmation(usageReceiptRef: IdRef): Promise<ProviderUsageConfirmation> {
    return clone(
      assertFound(
        await this.store.getUsageConfirmation(usageReceiptRef),
        `Unknown usageReceiptRef "${usageReceiptRef}"`
      )
    );
  }

  async listUsageConfirmations(): Promise<ProviderUsageConfirmation[]> {
    return this.store.listUsageConfirmations();
  }

  async executePayment(
    intent: PaymentIntent,
    decision: AuthorizationDecision
  ): Promise<SettlementRecord> {
    const settlement = {
      ...(await this.paymentAdapter.executePayment(intent, decision)),
      actionRef: intent.intentId,
      decisionRef: decision.decisionId,
      sourceAccountRef: intent.payer.accountId,
      destination: clone(intent.payee),
      asset: intent.asset,
      amount: intent.amount,
      chain: intent.chain,
    };

    await this.store.putSettlement(settlement);
    return clone(settlement);
  }

  async confirmResourceUsage(intent: ResourceIntent): Promise<ProviderUsageConfirmation> {
    const confirmation: ProviderUsageConfirmation = {
      ...(await this.resourceAdapter.confirmResourceUsage(intent)),
      providerId: intent.provider.providerId,
      providerDid: intent.provider.providerDid,
      resourceClass: intent.resource.resourceClass,
      resourceUnit: intent.resource.resourceUnit,
      quantity: intent.resource.quantity,
    };

    await this.store.putUsageConfirmation(confirmation);
    return clone(confirmation);
  }

  async settleResourceUsage(args: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  }): Promise<SettlementRecord> {
    const settlement: SettlementRecord = {
      ...(await this.resourceAdapter.settleResourceUsage(args)),
      actionRef: args.intent.intentId,
      decisionRef: args.decision.decisionId,
      sourceAccountRef: args.intent.requester.accountId,
      destination: clone(args.intent.provider),
      asset: args.intent.pricing.asset,
      amount: args.intent.pricing.maxSpend,
    };

    await this.store.putUsageConfirmation(args.usage);
    await this.store.putSettlement(settlement);
    return clone(settlement);
  }
}
