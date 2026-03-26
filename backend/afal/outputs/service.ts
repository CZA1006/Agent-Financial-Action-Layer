import type {
  ActionReceipt,
  ApprovalResult,
  AuthorizationDecision,
  CapabilityResponse,
  IdRef,
  Timestamp,
} from "../../../sdk/types";
import type { CapabilityResponsePort, ReceiptPort } from "../interfaces";
import type {
  CapabilityResponseTemplateResolver,
  CreateActionReceiptArgs,
  CreateApprovalReceiptArgs,
  CreateCapabilityResponseArgs,
  OutputAdminPort,
  ReceiptTemplateResolver,
} from "./interfaces";
import { InMemoryAfalOutputStore, type AfalOutputStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertFound<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

let receiptCounter = 0;
let responseCounter = 0;

function nextReceiptId(): IdRef {
  receiptCounter += 1;
  return `rcpt-generated-${String(receiptCounter).padStart(4, "0")}`;
}

function nextResponseId(): IdRef {
  responseCounter += 1;
  return `resp-generated-${String(responseCounter).padStart(4, "0")}`;
}

export interface AfalOutputServiceOptions {
  store?: AfalOutputStore;
  templateResolver?: ReceiptTemplateResolver & CapabilityResponseTemplateResolver;
}

export class AfalOutputService implements ReceiptPort, CapabilityResponsePort, OutputAdminPort {
  private readonly store: AfalOutputStore;
  private readonly templateResolver?: ReceiptTemplateResolver & CapabilityResponseTemplateResolver;

  constructor(options: AfalOutputServiceOptions = {}) {
    this.store = options.store ?? new InMemoryAfalOutputStore();
    this.templateResolver = options.templateResolver;
  }

  async getReceipt(receiptId: IdRef): Promise<ActionReceipt> {
    return clone(assertFound(await this.store.getReceipt(receiptId), `Unknown receiptId "${receiptId}"`));
  }

  async listReceipts(): Promise<ActionReceipt[]> {
    return this.store.listReceipts();
  }

  async getCapabilityResponse(responseId: IdRef): Promise<CapabilityResponse> {
    return clone(
      assertFound(
        await this.store.getCapabilityResponse(responseId),
        `Unknown responseId "${responseId}"`
      )
    );
  }

  async listCapabilityResponses(): Promise<CapabilityResponse[]> {
    return this.store.listCapabilityResponses();
  }

  async createApprovalReceipt(args: CreateApprovalReceiptArgs): Promise<ActionReceipt> {
    const template = this.templateResolver?.resolveReceiptTemplate({
      receiptType: "approval",
      actionRef: args.actionRef,
    });

    const receipt: ActionReceipt = {
      ...(template
        ? clone(template)
        : {
            receiptId: nextReceiptId(),
            schemaVersion: "0.1" as const,
            receiptType: "approval" as const,
            actionRef: args.actionRef,
            status: "final" as const,
            issuedAt: args.approvalResult.decidedAt,
            evidence: {},
          }),
      actionRef: args.actionRef,
      decisionRef: args.decisionRef ?? template?.decisionRef,
      issuedAt: args.approvalResult.decidedAt,
      evidence: {
        ...(template?.evidence ? clone(template.evidence) : {}),
        challengeRef: args.approvalResult.challengeRef,
        approvedBy: args.approvalResult.approvedBy,
        approvalChannel: args.approvalResult.approvalChannel,
        comment: args.approvalResult.comment,
      },
    };

    await this.store.putReceipt(receipt);
    return clone(receipt);
  }

  async createActionReceipt(args: CreateActionReceiptArgs): Promise<ActionReceipt> {
    const template = this.templateResolver?.resolveReceiptTemplate({
      receiptType: args.receiptType,
      actionRef: args.actionRef,
    });

    const receipt: ActionReceipt = {
      ...(template
        ? clone(template)
        : {
            receiptId: nextReceiptId(),
            schemaVersion: "0.1" as const,
            receiptType: args.receiptType,
            actionRef: args.actionRef,
            status: "final" as const,
            issuedAt: args.issuedAt ?? new Date().toISOString(),
            evidence: {},
          }),
      actionRef: args.actionRef,
      decisionRef: args.decisionRef ?? template?.decisionRef,
      settlementRef: args.settlementRef ?? template?.settlementRef,
      issuedAt: args.issuedAt ?? template?.issuedAt ?? new Date().toISOString(),
      evidence: clone(args.evidence),
    };

    await this.store.putReceipt(receipt);
    return clone(receipt);
  }

  async createCapabilityResponse(args: CreateCapabilityResponseArgs): Promise<CapabilityResponse> {
    const template = this.templateResolver?.resolveCapabilityResponseTemplate({
      capability: args.capability,
      actionRef: args.actionRef,
    });

    const response: CapabilityResponse = {
      ...(template
        ? clone(template)
        : {
            responseId: nextResponseId(),
            schemaVersion: "0.1" as const,
            capability: args.capability,
            requestRef: args.requestRef,
            result: args.result,
            respondedAt: new Date().toISOString(),
          }),
      capability: args.capability,
      requestRef: args.requestRef,
      actionRef: args.actionRef,
      result: args.result,
      decisionRef: args.decisionRef ?? null,
      challengeRef: args.challengeRef ?? null,
      settlementRef: args.settlementRef ?? null,
      receiptRef: args.receiptRef ?? null,
      message: args.message ?? template?.message,
    };

    await this.store.putCapabilityResponse(response);
    return clone(response);
  }
}
