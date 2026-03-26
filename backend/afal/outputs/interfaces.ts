import type {
  ActionReceipt,
  ApprovalResult,
  AuthorizationDecision,
  CapabilityResponse,
  IdRef,
  Timestamp,
} from "../../../sdk/types";
import type { CapabilityResponsePort, ReceiptPort } from "../interfaces";

export interface ReceiptReader {
  getReceipt(receiptId: IdRef): Promise<ActionReceipt>;
  listReceipts(): Promise<ActionReceipt[]>;
}

export interface CapabilityResponseReader {
  getCapabilityResponse(responseId: IdRef): Promise<CapabilityResponse>;
  listCapabilityResponses(): Promise<CapabilityResponse[]>;
}

export interface OutputAdminPort
  extends ReceiptPort,
    CapabilityResponsePort,
    ReceiptReader,
    CapabilityResponseReader {}

export interface ReceiptTemplateSelection {
  receiptType: "payment" | "resource" | "approval";
  actionRef: IdRef;
}

export interface CapabilityResponseTemplateSelection {
  capability: string;
  actionRef: IdRef;
}

export interface ReceiptTemplateResolver {
  resolveReceiptTemplate(selection: ReceiptTemplateSelection): ActionReceipt | undefined;
}

export interface CapabilityResponseTemplateResolver {
  resolveCapabilityResponseTemplate(
    selection: CapabilityResponseTemplateSelection
  ): CapabilityResponse | undefined;
}

export interface CreateApprovalReceiptArgs {
  actionRef: IdRef;
  decisionRef?: IdRef;
  approvalResult: ApprovalResult;
}

export interface CreateActionReceiptArgs {
  receiptType: "payment" | "resource";
  actionRef: IdRef;
  decisionRef?: IdRef;
  settlementRef?: IdRef;
  evidence: Record<string, unknown>;
  issuedAt?: Timestamp;
}

export interface CreateCapabilityResponseArgs {
  capability: string;
  requestRef: IdRef;
  actionRef: IdRef;
  result: AuthorizationDecision["result"];
  decisionRef?: IdRef;
  challengeRef?: IdRef | null;
  settlementRef?: IdRef | null;
  receiptRef?: IdRef | null;
  message?: string;
}
