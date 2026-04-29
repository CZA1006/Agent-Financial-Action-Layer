import { createHash } from "node:crypto";

import type {
  ActionStatusOutput,
  PaymentApprovalRequestOutput,
  ResourceApprovalRequestOutput,
} from "../../backend/afal/interfaces";
import type { AfalApiFailure, AfalApiSuccess } from "../../backend/afal/api/types";
import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import type { IdRef, PaymentIntent, ResourceIntent } from "../types";

export interface AfalClientOptions {
  baseUrl: string;
  clientId: string;
  signingKey: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

export interface RequestPaymentApprovalInput {
  requestRef?: IdRef;
  intent: PaymentIntent;
  monetaryBudgetRef?: IdRef;
}

export interface RequestResourceApprovalInput {
  requestRef?: IdRef;
  intent: ResourceIntent;
  resourceBudgetRef: IdRef;
  resourceQuotaRef: IdRef;
}

export interface WaitForPaymentReceiptInput {
  actionRef: IdRef;
  timeoutMs?: number;
  intervalMs?: number;
  requestRefPrefix?: string;
}

export interface WaitForPaymentReceiptOutput {
  status: ActionStatusOutput;
  receiptRef: IdRef;
  settlementRef: IdRef;
  txHash?: string;
}

export interface AfalClient {
  requestPaymentApproval(input: RequestPaymentApprovalInput): Promise<PaymentApprovalRequestOutput>;
  requestResourceApproval(input: RequestResourceApprovalInput): Promise<ResourceApprovalRequestOutput>;
  getActionStatus(input: {
    requestRef?: IdRef;
    actionRef: IdRef;
  }): Promise<ActionStatusOutput>;
  waitForPaymentReceipt(input: WaitForPaymentReceiptInput): Promise<WaitForPaymentReceiptOutput>;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildRequestRef(prefix: string): IdRef {
  return `${prefix}-${Date.now()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertSuccess<T>(body: T | AfalApiFailure): T {
  if (
    typeof body === "object" &&
    body !== null &&
    "ok" in body &&
    body.ok === false &&
    "error" in body
  ) {
    throw new Error(
      `AFAL request failed: ${body.capability} [${body.statusCode} ${body.error.code}] ${body.error.message}`
    );
  }

  return body as T;
}

export function createAfalClient(options: AfalClientOptions): AfalClient {
  const normalizedBaseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());

  function signedHeaders(requestRef: IdRef): Record<string, string> {
    const timestamp = now().toISOString();
    return {
      "content-type": "application/json",
      "x-afal-client-id": options.clientId,
      "x-afal-request-timestamp": timestamp,
      "x-afal-request-signature": sha256(
        `${options.clientId}:${requestRef}:${timestamp}:${options.signingKey}`
      ),
    };
  }

  async function post<T>(path: string, requestRef: IdRef, body: unknown): Promise<T> {
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      method: "POST",
      headers: signedHeaders(requestRef),
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as T | AfalApiFailure;
    return assertSuccess(json);
  }

  return {
    async requestPaymentApproval(input) {
      const requestRef = input.requestRef ?? buildRequestRef("req-afal-payment");
      const body = await post<AfalApiSuccess<PaymentApprovalRequestOutput>>(
        AFAL_HTTP_ROUTES.requestPaymentApproval,
        requestRef,
        {
          requestRef,
          input: {
            requestRef,
            intent: input.intent,
            monetaryBudgetRef: input.monetaryBudgetRef,
          },
        }
      );
      return body.data;
    },

    async requestResourceApproval(input) {
      const requestRef = input.requestRef ?? buildRequestRef("req-afal-resource");
      const body = await post<AfalApiSuccess<ResourceApprovalRequestOutput>>(
        AFAL_HTTP_ROUTES.requestResourceApproval,
        requestRef,
        {
          requestRef,
          input: {
            requestRef,
            intent: input.intent,
            resourceBudgetRef: input.resourceBudgetRef,
            resourceQuotaRef: input.resourceQuotaRef,
          },
        }
      );
      return body.data;
    },

    async getActionStatus(input) {
      const requestRef = input.requestRef ?? buildRequestRef("req-afal-action-status");
      const body = await post<AfalApiSuccess<ActionStatusOutput>>(
        AFAL_HTTP_ROUTES.getActionStatus,
        requestRef,
        {
          requestRef,
          input: {
            actionRef: input.actionRef,
          },
        }
      );
      return body.data;
    },

    async waitForPaymentReceipt(input) {
      const timeoutMs = input.timeoutMs ?? 120_000;
      const intervalMs = input.intervalMs ?? 2_000;
      const deadline = Date.now() + timeoutMs;

      while (Date.now() <= deadline) {
        const status = await this.getActionStatus({
          requestRef: `${input.requestRefPrefix ?? "req-afal-wait-payment"}-${Date.now()}`,
          actionRef: input.actionRef,
        });

        if (status.actionType === "payment" && status.intent.status === "settled") {
          if (!status.paymentReceipt?.receiptId || !status.settlement?.settlementId) {
            throw new Error(`AFAL payment ${input.actionRef} is settled without receipt evidence`);
          }
          return {
            status,
            receiptRef: status.paymentReceipt.receiptId,
            settlementRef: status.settlement.settlementId,
            txHash: status.settlement.txHash,
          };
        }

        await sleep(intervalMs);
      }

      throw new Error(`Timed out waiting for AFAL payment receipt for ${input.actionRef}`);
    },
  };
}
