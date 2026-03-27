import type {
  AuthorizationDecision,
  IdRef,
  PaymentIntent,
  ResourceIntent,
  SettlementRecord,
} from "../../../sdk/types";
import type { ProviderUsageConfirmation } from "../interfaces";
import type {
  PaymentRailAdapter,
  PaymentSettlementTemplateResolver,
  ResourceProviderAdapter,
  ResourceSettlementTemplateResolver,
} from "./interfaces";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

export class SeededPaymentRailAdapter implements PaymentRailAdapter {
  constructor(private readonly resolver?: PaymentSettlementTemplateResolver) {}

  async executePayment(
    intent: PaymentIntent,
    decision: AuthorizationDecision
  ): Promise<SettlementRecord> {
    const template = this.resolver?.resolvePaymentSettlementTemplate(intent.intentId);
    const now = new Date().toISOString();

    return clone(
      template ?? {
        settlementId: nextSettlementId(),
        schemaVersion: "0.1",
        settlementType: "onchain-transfer",
        actionRef: intent.intentId,
        decisionRef: decision.decisionId,
        sourceAccountRef: intent.payer.accountId,
        destination: clone(intent.payee),
        asset: intent.asset,
        amount: intent.amount,
        chain: intent.chain,
        status: "settled",
        executedAt: now,
        settledAt: now,
      }
    );
  }
}

export class SeededResourceProviderAdapter implements ResourceProviderAdapter {
  constructor(
    private readonly resolver?: ResourceSettlementTemplateResolver
  ) {}

  async confirmResourceUsage(intent: ResourceIntent): Promise<ProviderUsageConfirmation> {
    const template = this.resolver?.resolveResourceUsageTemplate(intent.intentId);

    return clone(
      template ?? {
        usageReceiptRef: nextUsageReceiptId(),
        providerId: intent.provider.providerId,
        providerDid: intent.provider.providerDid,
        resourceClass: intent.resource.resourceClass,
        resourceUnit: intent.resource.resourceUnit,
        quantity: intent.resource.quantity,
        confirmedAt: new Date().toISOString(),
      }
    );
  }

  async settleResourceUsage(args: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  }): Promise<SettlementRecord> {
    const template = this.resolver?.resolveResourceSettlementTemplate(args.intent.intentId);
    const now = new Date().toISOString();

    return clone(
      template ?? {
        settlementId: nextSettlementId(),
        schemaVersion: "0.1",
        settlementType: "provider-settlement",
        actionRef: args.intent.intentId,
        decisionRef: args.decision.decisionId,
        sourceAccountRef: args.intent.requester.accountId,
        destination: clone(args.intent.provider),
        asset: args.intent.pricing.asset,
        amount: args.intent.pricing.maxSpend,
        status: "settled",
        executedAt: now,
        settledAt: now,
      }
    );
  }
}
