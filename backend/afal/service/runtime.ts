import type {
  AfalOrchestrationPorts,
  PaymentFlowInput,
  PaymentFlowOrchestrator,
  PaymentFlowOutput,
  ResourceFlowInput,
  ResourceFlowOrchestrator,
  ResourceFlowOutput,
} from "../interfaces";
import type {
  AfalModuleService,
  AfalServiceCommand,
  AfalServiceResult,
  ExecutePaymentCommand,
  SettleResourceUsageCommand,
} from "./interfaces";
import {
  createMockAfalPorts,
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "../mock";

export interface AfalRuntimeServiceOptions {
  ports?: AfalOrchestrationPorts;
  paymentOrchestrator?: PaymentFlowOrchestrator;
  resourceOrchestrator?: ResourceFlowOrchestrator;
}

export class AfalRuntimeService
  implements PaymentFlowOrchestrator, ResourceFlowOrchestrator, AfalModuleService
{
  readonly ports?: AfalOrchestrationPorts;
  readonly paymentOrchestrator: PaymentFlowOrchestrator;
  readonly resourceOrchestrator: ResourceFlowOrchestrator;

  constructor(options: AfalRuntimeServiceOptions = {}) {
    const ports = options.ports ?? createMockAfalPorts();
    this.ports = options.ports ?? ports;
    this.paymentOrchestrator =
      options.paymentOrchestrator ?? createMockPaymentFlowOrchestrator(ports);
    this.resourceOrchestrator =
      options.resourceOrchestrator ?? createMockResourceFlowOrchestrator(ports);
  }

  async executePaymentFlow(input: PaymentFlowInput): Promise<PaymentFlowOutput> {
    return this.paymentOrchestrator.executePaymentFlow(input);
  }

  async executePayment(command: ExecutePaymentCommand): Promise<PaymentFlowOutput> {
    return this.executePaymentFlow(command.input);
  }

  async executeResourceSettlementFlow(
    input: ResourceFlowInput
  ): Promise<ResourceFlowOutput> {
    return this.resourceOrchestrator.executeResourceSettlementFlow(input);
  }

  async settleResourceUsage(
    command: SettleResourceUsageCommand
  ): Promise<ResourceFlowOutput> {
    return this.executeResourceSettlementFlow(command.input);
  }

  async invoke(command: AfalServiceCommand): Promise<AfalServiceResult> {
    if (command.capability === "executePayment") {
      return this.executePayment(command);
    }

    return this.settleResourceUsage(command);
  }
}

export function createAfalRuntimeService(
  options: AfalRuntimeServiceOptions = {}
): AfalRuntimeService {
  return new AfalRuntimeService(options);
}
