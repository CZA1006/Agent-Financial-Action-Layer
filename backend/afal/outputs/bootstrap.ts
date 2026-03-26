import {
  paymentFlowFixtures,
  resourceFlowFixtures,
} from "../../../sdk/fixtures";
import type { ActionReceipt, CapabilityResponse, IdRef } from "../../../sdk/types";
import {
  type CapabilityResponseTemplateResolver,
  type ReceiptTemplateResolver,
} from "./interfaces";
import { AfalOutputService } from "./service";
import { InMemoryAfalOutputStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SeededAfalOutputRecords {
  receiptTemplates: Record<string, ActionReceipt>;
  capabilityResponseTemplates: Record<string, CapabilityResponse>;
}

function receiptKey(receiptType: string, actionRef: IdRef): string {
  return `${receiptType}:${actionRef}`;
}

function responseKey(capability: string, actionRef: IdRef): string {
  return `${capability}:${actionRef}`;
}

export function createSeededAfalOutputRecords(): SeededAfalOutputRecords {
  return {
    receiptTemplates: {
      [receiptKey("approval", paymentFlowFixtures.paymentIntentCreated.intentId)]: clone(
        paymentFlowFixtures.approvalReceipt
      ),
      [receiptKey("payment", paymentFlowFixtures.paymentIntentCreated.intentId)]: clone(
        paymentFlowFixtures.paymentReceipt
      ),
      [receiptKey("approval", resourceFlowFixtures.resourceIntentCreated.intentId)]: clone(
        resourceFlowFixtures.approvalReceipt
      ),
      [receiptKey("resource", resourceFlowFixtures.resourceIntentCreated.intentId)]: clone(
        resourceFlowFixtures.resourceReceipt
      ),
    },
    capabilityResponseTemplates: {
      [responseKey("executePayment", paymentFlowFixtures.paymentIntentCreated.intentId)]: clone(
        paymentFlowFixtures.capabilityResponse
      ),
      [responseKey("settleResourceUsage", resourceFlowFixtures.resourceIntentCreated.intentId)]: clone(
        resourceFlowFixtures.capabilityResponse
      ),
    },
  };
}

export function createSeededAfalOutputTemplateResolver(): ReceiptTemplateResolver & CapabilityResponseTemplateResolver {
  const records = createSeededAfalOutputRecords();

  return {
    resolveReceiptTemplate(selection) {
      return records.receiptTemplates[receiptKey(selection.receiptType, selection.actionRef)]
        ? clone(records.receiptTemplates[receiptKey(selection.receiptType, selection.actionRef)])
        : undefined;
    },
    resolveCapabilityResponseTemplate(selection) {
      return records.capabilityResponseTemplates[responseKey(selection.capability, selection.actionRef)]
        ? clone(records.capabilityResponseTemplates[responseKey(selection.capability, selection.actionRef)])
        : undefined;
    },
  };
}

export function createSeededInMemoryAfalOutputStore(): InMemoryAfalOutputStore {
  return new InMemoryAfalOutputStore();
}

export function createSeededAfalOutputService(): AfalOutputService {
  return new AfalOutputService({
    store: createSeededInMemoryAfalOutputStore(),
    templateResolver: createSeededAfalOutputTemplateResolver(),
  });
}
