import type {
  CommonActionStatus,
  IdRef,
  PaymentIntent,
  ResourceIntent,
  ChallengeState,
} from "../../../sdk/types";

export interface PaymentIntentReader {
  getPaymentIntent(intentId: IdRef): Promise<PaymentIntent>;
  listPaymentIntents(): Promise<PaymentIntent[]>;
}

export interface ResourceIntentReader {
  getResourceIntent(intentId: IdRef): Promise<ResourceIntent>;
  listResourceIntents(): Promise<ResourceIntent[]>;
}

export interface IntentStateAdminPort extends PaymentIntentReader, ResourceIntentReader {
  createPaymentIntent(intent: PaymentIntent): Promise<PaymentIntent>;
  createResourceIntent(intent: ResourceIntent): Promise<ResourceIntent>;
  markPaymentChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    status: CommonActionStatus;
  }): Promise<PaymentIntent>;
  markPaymentSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    settlementRef: IdRef;
    receiptRef: IdRef;
    status: CommonActionStatus;
  }): Promise<PaymentIntent>;
  markResourceChallenge(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    status: CommonActionStatus;
  }): Promise<ResourceIntent>;
  markResourceSettlement(args: {
    intentId: IdRef;
    decisionRef?: IdRef;
    challengeRef?: IdRef;
    challengeState: ChallengeState;
    usageReceiptRef: IdRef;
    settlementRef: IdRef;
    status: CommonActionStatus;
  }): Promise<ResourceIntent>;
}

export interface PaymentIntentTemplateResolver {
  resolvePaymentIntentTemplate(intentId: IdRef): PaymentIntent | undefined;
}

export interface ResourceIntentTemplateResolver {
  resolveResourceIntentTemplate(intentId: IdRef): ResourceIntent | undefined;
}
