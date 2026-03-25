import type { PaymentFlowInput, ResourceFlowInput } from "../interfaces";
import type { AfalApiFailure, PaymentCapabilityResponse, ResourceCapabilityResponse } from "../api";

export const AFAL_HTTP_ROUTES = {
  executePayment: "/capabilities/execute-payment",
  settleResourceUsage: "/capabilities/settle-resource-usage",
} as const;

export type AfalHttpPath = (typeof AFAL_HTTP_ROUTES)[keyof typeof AFAL_HTTP_ROUTES];

export interface ExecutePaymentHttpBody {
  requestRef: string;
  input: PaymentFlowInput;
}

export interface SettleResourceUsageHttpBody {
  requestRef: string;
  input: ResourceFlowInput;
}

export type AfalHttpBody = ExecutePaymentHttpBody | SettleResourceUsageHttpBody;

export interface AfalHttpRequest {
  method: string;
  path: string;
  body?: unknown;
}

export interface AfalHttpResponse<TBody> {
  statusCode: number;
  headers: {
    "content-type": "application/json";
  };
  body: TBody;
}

export type AfalHttpSuccessBody = PaymentCapabilityResponse | ResourceCapabilityResponse;
export type AfalHttpErrorBody = AfalApiFailure;
export type AfalHttpResponseBody = AfalHttpSuccessBody | AfalHttpErrorBody;
