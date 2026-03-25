import type { PaymentFlowInput, PaymentFlowOutput, ResourceFlowInput, ResourceFlowOutput } from "../interfaces";

export type AfalCapability = "executePayment" | "settleResourceUsage";

export interface PaymentCapabilityRequest {
  capability: "executePayment";
  requestRef: string;
  input: PaymentFlowInput;
}

export interface ResourceCapabilityRequest {
  capability: "settleResourceUsage";
  requestRef: string;
  input: ResourceFlowInput;
}

export type AfalCapabilityRequest = PaymentCapabilityRequest | ResourceCapabilityRequest;

export interface AfalApiError {
  code:
    | "bad-request"
    | "not-found"
    | "credential-verification-failed"
    | "authorization-rejected"
    | "authorization-expired"
    | "authorization-cancelled"
    | "provider-failure"
    | "internal-error";
  message: string;
}

export interface AfalApiSuccess<TData> {
  ok: true;
  capability: AfalCapability;
  requestRef: string;
  statusCode: 200;
  data: TData;
}

export interface AfalApiFailure {
  ok: false;
  capability: AfalCapability;
  requestRef: string;
  statusCode: 400 | 403 | 404 | 409 | 502 | 500;
  error: AfalApiError;
}

export type PaymentCapabilityResponse = AfalApiSuccess<PaymentFlowOutput> | AfalApiFailure;
export type ResourceCapabilityResponse = AfalApiSuccess<ResourceFlowOutput> | AfalApiFailure;
export type AfalCapabilityResponse =
  | AfalApiSuccess<PaymentFlowOutput | ResourceFlowOutput>
  | AfalApiFailure;
