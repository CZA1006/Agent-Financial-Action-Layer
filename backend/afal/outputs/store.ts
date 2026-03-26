import type { ActionReceipt, CapabilityResponse, IdRef } from "../../../sdk/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AfalOutputStore {
  getReceipt(receiptId: IdRef): Promise<ActionReceipt | undefined>;
  putReceipt(receipt: ActionReceipt): Promise<void>;
  listReceipts(): Promise<ActionReceipt[]>;
  getCapabilityResponse(responseId: IdRef): Promise<CapabilityResponse | undefined>;
  putCapabilityResponse(response: CapabilityResponse): Promise<void>;
  listCapabilityResponses(): Promise<CapabilityResponse[]>;
}

export interface InMemoryAfalOutputStoreOptions {
  receipts?: ActionReceipt[];
  capabilityResponses?: CapabilityResponse[];
}

export class InMemoryAfalOutputStore implements AfalOutputStore {
  private readonly receipts = new Map<IdRef, ActionReceipt>();
  private readonly capabilityResponses = new Map<IdRef, CapabilityResponse>();

  constructor(options: InMemoryAfalOutputStoreOptions = {}) {
    for (const receipt of options.receipts ?? []) {
      this.receipts.set(receipt.receiptId, clone(receipt));
    }
    for (const response of options.capabilityResponses ?? []) {
      this.capabilityResponses.set(response.responseId, clone(response));
    }
  }

  async getReceipt(receiptId: IdRef): Promise<ActionReceipt | undefined> {
    const receipt = this.receipts.get(receiptId);
    return receipt ? clone(receipt) : undefined;
  }

  async putReceipt(receipt: ActionReceipt): Promise<void> {
    this.receipts.set(receipt.receiptId, clone(receipt));
  }

  async listReceipts(): Promise<ActionReceipt[]> {
    return Array.from(this.receipts.values()).map(clone);
  }

  async getCapabilityResponse(responseId: IdRef): Promise<CapabilityResponse | undefined> {
    const response = this.capabilityResponses.get(responseId);
    return response ? clone(response) : undefined;
  }

  async putCapabilityResponse(response: CapabilityResponse): Promise<void> {
    this.capabilityResponses.set(response.responseId, clone(response));
  }

  async listCapabilityResponses(): Promise<CapabilityResponse[]> {
    return Array.from(this.capabilityResponses.values()).map(clone);
  }
}
