import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";
import type { PaymentIntentTemplateResolver, ResourceIntentTemplateResolver } from "./interfaces";
import { AfalIntentStateService } from "./service";
import { InMemoryAfalIntentStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SeededAfalIntentStateRecords {
  paymentIntentTemplates: Record<IdRef, PaymentIntent>;
  resourceIntentTemplates: Record<IdRef, ResourceIntent>;
}

export function createSeededAfalIntentStateRecords(): SeededAfalIntentStateRecords {
  return {
    paymentIntentTemplates: {
      [paymentFlowFixtures.paymentIntentCreated.intentId]: clone(paymentFlowFixtures.paymentIntentCreated),
    },
    resourceIntentTemplates: {
      [resourceFlowFixtures.resourceIntentCreated.intentId]: clone(resourceFlowFixtures.resourceIntentCreated),
    },
  };
}

export function createSeededAfalIntentTemplateResolver(): PaymentIntentTemplateResolver &
  ResourceIntentTemplateResolver {
  const records = createSeededAfalIntentStateRecords();

  return {
    resolvePaymentIntentTemplate(intentId) {
      return records.paymentIntentTemplates[intentId];
    },
    resolveResourceIntentTemplate(intentId) {
      return records.resourceIntentTemplates[intentId];
    },
  };
}

export function createSeededInMemoryAfalIntentStore(): InMemoryAfalIntentStore {
  return new InMemoryAfalIntentStore();
}

export function createSeededAfalIntentStateService(): AfalIntentStateService {
  return new AfalIntentStateService({
    store: createSeededInMemoryAfalIntentStore(),
    templateResolver: createSeededAfalIntentTemplateResolver(),
  });
}
