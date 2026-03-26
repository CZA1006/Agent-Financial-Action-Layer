import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import type { IdRef, SettlementRecord } from "../../../sdk/types";
import type { ProviderUsageConfirmation } from "../interfaces";
import type {
  PaymentSettlementTemplateResolver,
  ResourceSettlementTemplateResolver,
} from "./interfaces";
import { AfalSettlementService } from "./service";
import { InMemoryAfalSettlementStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SeededAfalSettlementRecords {
  paymentSettlementTemplates: Record<IdRef, SettlementRecord>;
  resourceUsageTemplates: Record<IdRef, ProviderUsageConfirmation>;
  resourceSettlementTemplates: Record<IdRef, SettlementRecord>;
}

export function createSeededAfalSettlementRecords(): SeededAfalSettlementRecords {
  return {
    paymentSettlementTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.settlementRecord),
    },
    resourceUsageTemplates: {
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(
        resourceFlowFixtures.providerUsageConfirmation
      ),
    },
    resourceSettlementTemplates: {
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(
        resourceFlowFixtures.settlementRecord
      ),
    },
  };
}

export function createSeededAfalSettlementTemplateResolver(): PaymentSettlementTemplateResolver &
  ResourceSettlementTemplateResolver {
  const records = createSeededAfalSettlementRecords();

  return {
    resolvePaymentSettlementTemplate(actionRef) {
      return records.paymentSettlementTemplates[actionRef];
    },
    resolveResourceUsageTemplate(actionRef) {
      return records.resourceUsageTemplates[actionRef];
    },
    resolveResourceSettlementTemplate(actionRef) {
      return records.resourceSettlementTemplates[actionRef];
    },
  };
}

export function createSeededInMemoryAfalSettlementStore(): InMemoryAfalSettlementStore {
  return new InMemoryAfalSettlementStore();
}

export function createSeededAfalSettlementService(): AfalSettlementService {
  return new AfalSettlementService({
    store: createSeededInMemoryAfalSettlementStore(),
    templateResolver: createSeededAfalSettlementTemplateResolver(),
  });
}
