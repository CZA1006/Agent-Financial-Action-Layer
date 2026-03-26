import type {
  AuthorizationDecision,
  IdRef,
  PaymentIntent,
  ResourceIntent,
  SettlementRecord,
} from "../../../sdk/types";
import type {
  PaymentSettlementPort,
  ProviderUsageConfirmation,
  ResourceSettlementPort,
} from "../interfaces";
import type {
  PaymentSettlementTemplateResolver,
  ResourceSettlementTemplateResolver,
  SettlementAdminPort,
} from "./interfaces";
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

let settlementCounter = 0;
let usageCounter = 0;

function nextSettlementId(): IdRef {
  settlementCounter += 1;
  return `stl-generated-${String(settlementCounter).padStart(4, "0")}`;
}

function nextUsageReceiptId(): IdRef {
  usageCounter += 1;
  return `usage-generated-${String(usageCounter).padStart(4, "0")}`;
}

export interface AfalSettlementServiceOptions {
  store?: AfalSettlementStore;
  templateResolver?: PaymentSettlementTemplateResolver & ResourceSettlementTemplateResolver;
}

export class AfalSettlementService
  implements PaymentSettlementPort, ResourceSettlementPort, SettlementAdminPort
{
  private readonly store: AfalSettlementStore;
  private readonly templateResolver?: PaymentSettlementTemplateResolver &
    ResourceSettlementTemplateResolver;

  constructor(options: AfalSettlementServiceOptions = {}) {
    this.store = options.store ?? new InMemoryAfalSettlementStore();
    this.templateResolver = options.templateResolver;
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
    const template = this.templateResolver?.resolvePaymentSettlementTemplate(intent.intentId);
    const now = new Date().toISOString();

    const settlement: SettlementRecord = {
      ...(template
        ? clone(template)
        : {
            settlementId: nextSettlementId(),
            schemaVersion: "0.1" as const,
            settlementType: "onchain-transfer" as const,
            actionRef: intent.intentId,
            sourceAccountRef: intent.payer.accountId,
            destination: clone(intent.payee),
            asset: intent.asset,
            amount: intent.amount,
            chain: intent.chain,
            status: "settled" as const,
            executedAt: now,
            settledAt: now,
          }),
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
    const template = this.templateResolver?.resolveResourceUsageTemplate(intent.intentId);
    const confirmation: ProviderUsageConfirmation = {
      ...(template
        ? clone(template)
        : {
            usageReceiptRef: nextUsageReceiptId(),
            providerId: intent.provider.providerId,
            providerDid: intent.provider.providerDid,
            resourceClass: intent.resource.resourceClass,
            resourceUnit: intent.resource.resourceUnit,
            quantity: intent.resource.quantity,
            confirmedAt: new Date().toISOString(),
          }),
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
    const template = this.templateResolver?.resolveResourceSettlementTemplate(
      args.intent.intentId
    );
    const now = new Date().toISOString();

    const settlement: SettlementRecord = {
      ...(template
        ? clone(template)
        : {
            settlementId: nextSettlementId(),
            schemaVersion: "0.1" as const,
            settlementType: "provider-settlement" as const,
            actionRef: args.intent.intentId,
            sourceAccountRef: args.intent.requester.accountId,
            destination: clone(args.intent.provider),
            asset: args.intent.pricing.asset,
            amount: args.intent.pricing.maxSpend,
            status: "settled" as const,
            executedAt: now,
            settledAt: now,
          }),
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
