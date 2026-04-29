import { paymentFlowFixtures } from "../fixtures";
import type { Did, IdRef, PaymentIntent } from "../types";

const DEFAULT_BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export interface AgentPaymentInstruction {
  rawMessage: string;
  payerAgentDid: Did;
  payerAccountId: string;
  payeeDid: Did;
  payeeAddress: string;
  amount: string;
  asset: "USDC";
  chain: "base-sepolia";
  tokenAddress: string;
  purpose: string;
  mandateRef: IdRef;
  policyRef?: IdRef;
  monetaryBudgetRef: IdRef;
}

export interface ParseAgentPaymentInstructionOptions {
  message: string;
  defaultPayeeDid?: Did;
  defaultPayeeAddress?: string;
  defaultAmount?: string;
  defaultPurpose?: string;
  tokenAddress?: string;
}

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function parseAgentPaymentInstruction(
  options: ParseAgentPaymentInstructionOptions
): AgentPaymentInstruction {
  const amountMatch = options.message.match(/(\d+(?:\.\d+)?)\s*USDC/iu);
  const addressMatch = options.message.match(/0x[a-fA-F0-9]{40}/u);
  const defaultIntent = paymentFlowFixtures.paymentIntentCreated;

  return {
    rawMessage: options.message,
    payerAgentDid: defaultIntent.payer.agentDid,
    payerAccountId: defaultIntent.payer.accountId,
    payeeDid: options.defaultPayeeDid ?? defaultIntent.payee.payeeDid,
    payeeAddress: addressMatch?.[0] ?? requireValue("payee address", options.defaultPayeeAddress),
    amount: amountMatch?.[1] ?? requireValue("USDC amount", options.defaultAmount),
    asset: "USDC",
    chain: "base-sepolia",
    tokenAddress: options.tokenAddress ?? DEFAULT_BASE_SEPOLIA_USDC,
    purpose: options.defaultPurpose ?? `Agent prompt payment: ${options.message}`,
    mandateRef: defaultIntent.mandateRef,
    policyRef: defaultIntent.policyRef,
    monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
  };
}

export function buildAgentPaymentIntent(instruction: AgentPaymentInstruction): PaymentIntent {
  return {
    ...paymentFlowFixtures.paymentIntentCreated,
    payer: {
      agentDid: instruction.payerAgentDid,
      accountId: instruction.payerAccountId,
    },
    payee: {
      payeeDid: instruction.payeeDid,
      settlementAddress: instruction.payeeAddress,
    },
    amount: instruction.amount,
    asset: instruction.asset,
    chain: instruction.chain,
    mandateRef: instruction.mandateRef,
    policyRef: instruction.policyRef,
    purpose: {
      category: "service-payment",
      description: instruction.purpose,
      referenceId: "agent-payment-tool",
    },
  };
}

export function buildWalletPaymentUrl(args: {
  walletDemoUrl: string;
  actionRef: IdRef;
  instruction: AgentPaymentInstruction;
}): string {
  const url = new URL(args.walletDemoUrl);
  url.searchParams.set("actionRef", args.actionRef);
  url.searchParams.set("to", args.instruction.payeeAddress);
  url.searchParams.set("amount", args.instruction.amount);
  url.searchParams.set("tokenAddress", args.instruction.tokenAddress);
  return url.toString();
}
