import type {
  PaymentFlowInput,
  PaymentFlowOutput,
  ResourceFlowInput,
  ResourceFlowOutput,
} from "../interfaces";

export type AfalServiceCapability = "executePayment" | "settleResourceUsage";

export interface ExecutePaymentCommand {
  capability: "executePayment";
  requestRef: string;
  input: PaymentFlowInput;
}

export interface SettleResourceUsageCommand {
  capability: "settleResourceUsage";
  requestRef: string;
  input: ResourceFlowInput;
}

export type AfalServiceCommand = ExecutePaymentCommand | SettleResourceUsageCommand;

export type AfalServiceResult = PaymentFlowOutput | ResourceFlowOutput;

export interface AfalModuleService {
  executePayment(command: ExecutePaymentCommand): Promise<PaymentFlowOutput>;
  settleResourceUsage(command: SettleResourceUsageCommand): Promise<ResourceFlowOutput>;
  invoke(command: AfalServiceCommand): Promise<AfalServiceResult>;
}
