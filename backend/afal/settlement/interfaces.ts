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

export interface SettlementReader {
  getSettlement(settlementId: IdRef): Promise<SettlementRecord>;
  listSettlements(): Promise<SettlementRecord[]>;
}

export interface UsageConfirmationReader {
  getUsageConfirmation(usageReceiptRef: IdRef): Promise<ProviderUsageConfirmation>;
  listUsageConfirmations(): Promise<ProviderUsageConfirmation[]>;
}

export interface SettlementAdminPort
  extends PaymentSettlementPort,
    ResourceSettlementPort,
    SettlementReader,
    UsageConfirmationReader {}

export interface PaymentSettlementTemplateResolver {
  resolvePaymentSettlementTemplate(actionRef: IdRef): SettlementRecord | undefined;
}

export interface ResourceSettlementTemplateResolver {
  resolveResourceUsageTemplate(actionRef: IdRef): ProviderUsageConfirmation | undefined;
  resolveResourceSettlementTemplate(actionRef: IdRef): SettlementRecord | undefined;
}

export interface PaymentRailAdapter {
  executePayment(intent: PaymentIntent, decision: AuthorizationDecision): Promise<SettlementRecord>;
}

export interface ResourceProviderAdapter {
  confirmResourceUsage(intent: ResourceIntent): Promise<ProviderUsageConfirmation>;
  settleResourceUsage(args: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  }): Promise<SettlementRecord>;
}
