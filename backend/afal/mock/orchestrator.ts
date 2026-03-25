import {
  paymentFlowFixtures,
  resourceFlowFixtures,
  type PaymentFlowFixtures,
  type ResourceFlowFixtures,
} from "../../../sdk/fixtures";
import type {
  AccountRecord,
  ActionReceipt,
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  CapabilityResponse,
  ChallengeRecord,
  Did,
  IdRef,
  IdentityRecord,
  MonetaryBudget,
  PaymentIntent,
  ResourceBudget,
  ResourceIntent,
  ResourceQuota,
  SettlementRecord,
  Timestamp,
} from "../../../sdk/types";
import type {
  AfalOrchestrationPorts,
  AipPort,
  AmnPort,
  AtsPort,
  CapabilityResponsePort,
  PaymentFlowInput,
  PaymentFlowOrchestrator,
  PaymentFlowOutput,
  PaymentSettlementPort,
  ProviderUsageConfirmation,
  ReceiptPort,
  ResourceFlowInput,
  ResourceFlowOrchestrator,
  ResourceFlowOutput,
  ResourceSettlementPort,
  TrustedSurfacePort,
} from "../interfaces";

type KnownFlow = "payment" | "resource";
type AnyFixtures = PaymentFlowFixtures | ResourceFlowFixtures;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertKnown(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertCredentialVerified(
  aip: AipPort,
  credentialId: IdRef,
  label: string
): Promise<void> {
  const isValid = await aip.verifyCredential(credentialId);
  assertKnown(isValid, `Mock AFAL flow requires a verified ${label} credential: "${credentialId}"`);
}

function getFlowByActionRef(actionRef: IdRef): KnownFlow {
  if (actionRef === paymentFlowFixtures.paymentIntentCreated.intentId) {
    return "payment";
  }

  if (actionRef === resourceFlowFixtures.resourceIntentCreated.intentId) {
    return "resource";
  }

  throw new Error(`Unknown actionRef "${actionRef}" for mock AFAL flow`);
}

function getPaymentFixtures(intentOrRef: PaymentIntent | IdRef): PaymentFlowFixtures {
  const intentId = typeof intentOrRef === "string" ? intentOrRef : intentOrRef.intentId;
  assertKnown(
    intentId === paymentFlowFixtures.paymentIntentCreated.intentId,
    `Mock payment orchestrator only supports intent "${paymentFlowFixtures.paymentIntentCreated.intentId}"`
  );
  return paymentFlowFixtures;
}

function getResourceFixtures(intentOrRef: ResourceIntent | IdRef): ResourceFlowFixtures {
  const intentId = typeof intentOrRef === "string" ? intentOrRef : intentOrRef.intentId;
  assertKnown(
    intentId === resourceFlowFixtures.resourceIntentCreated.intentId,
    `Mock resource orchestrator only supports intent "${resourceFlowFixtures.resourceIntentCreated.intentId}"`
  );
  return resourceFlowFixtures;
}

function getFixturesByActionRef(actionRef: IdRef): AnyFixtures {
  return getFlowByActionRef(actionRef) === "payment"
    ? paymentFlowFixtures
    : resourceFlowFixtures;
}

function getIdentityByDid(subjectDid: Did): IdentityRecord {
  const identities = [
    paymentFlowFixtures.ownerDid,
    paymentFlowFixtures.institutionDid,
    paymentFlowFixtures.agentDid,
    resourceFlowFixtures.ownerDid,
    resourceFlowFixtures.institutionDid,
    resourceFlowFixtures.agentDid,
  ];
  const identity = identities.find((candidate) => candidate.id === subjectDid);
  assertKnown(identity, `Unknown DID "${subjectDid}" for mock identity resolution`);
  return identity;
}

function getKnownCredentialIds(): Set<IdRef> {
  return new Set([
    paymentFlowFixtures.ownershipCredential.id,
    paymentFlowFixtures.kycCredential.id,
    paymentFlowFixtures.kybCredential.id,
    paymentFlowFixtures.authorityCredential.id,
    paymentFlowFixtures.policyCredential.id,
    resourceFlowFixtures.ownershipCredential.id,
    resourceFlowFixtures.kycCredential.id,
    resourceFlowFixtures.kybCredential.id,
    resourceFlowFixtures.authorityCredential.id,
    resourceFlowFixtures.policyCredential.id,
  ]);
}

function overlayDecision(
  template: AuthorizationDecision,
  args: {
    actionRef: IdRef;
    actionType: "payment" | "resource";
    subjectDid: Did;
    mandateRef: IdRef;
    policyRef?: IdRef;
    accountRef?: IdRef;
  }
): AuthorizationDecision {
  return {
    ...clone(template),
    actionRef: args.actionRef,
    actionType: args.actionType,
    subjectDid: args.subjectDid,
    mandateRef: args.mandateRef,
    policyRef: args.policyRef,
    accountRef: args.accountRef,
  };
}

class MockAipPort implements AipPort {
  private readonly credentialIds = getKnownCredentialIds();

  async resolveIdentity(subjectDid: Did): Promise<IdentityRecord> {
    return clone(getIdentityByDid(subjectDid));
  }

  async verifyCredential(credentialId: IdRef): Promise<boolean> {
    return this.credentialIds.has(credentialId);
  }
}

class MockAtsPort implements AtsPort {
  async getAccountState(accountRef: IdRef): Promise<AccountRecord> {
    const accounts = [
      paymentFlowFixtures.treasuryAccount,
      paymentFlowFixtures.operatingAccount,
      resourceFlowFixtures.treasuryAccount,
      resourceFlowFixtures.operatingAccount,
    ];
    const account = accounts.find((candidate) => candidate.accountId === accountRef);
    assertKnown(account, `Unknown accountRef "${accountRef}" for mock ATS state`);
    return clone(account);
  }

  async getMonetaryBudgetState(budgetRef: IdRef): Promise<MonetaryBudget> {
    assertKnown(
      budgetRef === paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      `Unknown monetary budget "${budgetRef}" for mock ATS state`
    );
    return clone(paymentFlowFixtures.monetaryBudgetInitial);
  }

  async getResourceBudgetState(budgetRef: IdRef): Promise<ResourceBudget> {
    assertKnown(
      budgetRef === resourceFlowFixtures.resourceBudgetInitial.budgetId,
      `Unknown resource budget "${budgetRef}" for mock ATS state`
    );
    return clone(resourceFlowFixtures.resourceBudgetInitial);
  }

  async getResourceQuotaState(quotaRef: IdRef): Promise<ResourceQuota> {
    assertKnown(
      quotaRef === resourceFlowFixtures.resourceQuotaInitial.quotaId,
      `Unknown resource quota "${quotaRef}" for mock ATS state`
    );
    return clone(resourceFlowFixtures.resourceQuotaInitial);
  }
}

class MockAmnPort implements AmnPort {
  async evaluateAuthorization(args: {
    actionRef: IdRef;
    actionType: "payment" | "resource";
    subjectDid: Did;
    mandateRef: IdRef;
    policyRef?: IdRef;
    accountRef: IdRef;
  }): Promise<AuthorizationDecision> {
    const fixtures =
      args.actionType === "payment"
        ? getPaymentFixtures(args.actionRef)
        : getResourceFixtures(args.actionRef);

    return overlayDecision(fixtures.authorizationDecisionInitial, args);
  }

  async createChallengeRecord(decision: AuthorizationDecision): Promise<ChallengeRecord> {
    const fixtures = getFixturesByActionRef(decision.actionRef);
    return {
      ...clone(fixtures.challengeRecord),
      actionRef: decision.actionRef,
      actionType: decision.actionType,
      subjectDid: decision.subjectDid,
      mandateRef: decision.mandateRef,
      policyRef: decision.policyRef,
      reasonCode: decision.reasonCode ?? fixtures.challengeRecord.reasonCode,
    };
  }

  async buildApprovalContext(challenge: ChallengeRecord): Promise<ApprovalContext> {
    const fixtures = getFixturesByActionRef(challenge.actionRef);
    return {
      ...clone(fixtures.approvalContext),
      challengeRef: challenge.challengeId,
      actionRef: challenge.actionRef,
      actionType: fixtures.challengeRecord.actionType,
      subjectDid: fixtures.approvalContext.subjectDid,
    };
  }

  async recordApprovalResult(result: ApprovalResult): Promise<ApprovalResult> {
    const fixtures = getFixturesByActionRef(result.actionRef);
    return {
      ...clone(fixtures.approvalResult),
      ...clone(result),
    };
  }

  async finalizeAuthorization(args: {
    priorDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
  }): Promise<AuthorizationDecision> {
    if (args.approvalResult.result !== "approved") {
      return {
        ...clone(args.priorDecision),
        result: args.approvalResult.result === "expired" ? "expired" : "rejected",
        challengeState: args.approvalResult.result,
        reasonCode: `approval-${args.approvalResult.result}`,
        evaluatedAt: args.approvalResult.decidedAt,
      };
    }

    const fixtures = getFixturesByActionRef(args.priorDecision.actionRef);
    return overlayDecision(fixtures.authorizationDecisionFinal, {
      actionRef: args.priorDecision.actionRef,
      actionType: args.priorDecision.actionType as "payment" | "resource",
      subjectDid: args.priorDecision.subjectDid,
      mandateRef: args.priorDecision.mandateRef,
      policyRef: args.priorDecision.policyRef,
      accountRef: args.priorDecision.accountRef,
    });
  }
}

class MockTrustedSurfacePort implements TrustedSurfacePort {
  async requestApproval(context: ApprovalContext): Promise<ApprovalResult> {
    const fixtures = getFixturesByActionRef(context.actionRef);
    return {
      ...clone(fixtures.approvalResult),
      challengeRef: context.challengeRef,
      actionRef: context.actionRef,
    };
  }
}

class MockPaymentSettlementPort implements PaymentSettlementPort {
  async executePayment(
    intent: PaymentIntent,
    decision: AuthorizationDecision
  ): Promise<SettlementRecord> {
    const fixtures = getPaymentFixtures(intent);
    return {
      ...clone(fixtures.settlementRecord),
      actionRef: intent.intentId,
      decisionRef: decision.decisionId,
      sourceAccountRef: intent.payer.accountId,
      destination: clone(intent.payee),
      asset: intent.asset,
      amount: intent.amount,
      chain: intent.chain,
    };
  }
}

class MockResourceSettlementPort implements ResourceSettlementPort {
  async confirmResourceUsage(intent: ResourceIntent): Promise<ProviderUsageConfirmation> {
    const fixtures = getResourceFixtures(intent);
    return {
      ...clone(fixtures.providerUsageConfirmation),
      providerId: intent.provider.providerId,
      providerDid: intent.provider.providerDid,
      resourceClass: intent.resource.resourceClass,
      resourceUnit: intent.resource.resourceUnit,
      quantity: intent.resource.quantity,
    };
  }

  async settleResourceUsage(args: {
    intent: ResourceIntent;
    decision: AuthorizationDecision;
    usage: ProviderUsageConfirmation;
  }): Promise<SettlementRecord> {
    const fixtures = getResourceFixtures(args.intent);
    return {
      ...clone(fixtures.settlementRecord),
      actionRef: args.intent.intentId,
      decisionRef: args.decision.decisionId,
      sourceAccountRef: args.intent.requester.accountId,
      destination: clone(args.intent.provider),
      asset: args.intent.pricing.asset,
      amount: args.intent.pricing.maxSpend,
    };
  }
}

class MockReceiptPort implements ReceiptPort {
  async createApprovalReceipt(args: {
    actionRef: IdRef;
    decisionRef?: IdRef;
    approvalResult: ApprovalResult;
  }): Promise<ActionReceipt> {
    const fixtures = getFixturesByActionRef(args.actionRef);
    return {
      ...clone(fixtures.approvalReceipt),
      actionRef: args.actionRef,
      decisionRef: args.decisionRef ?? fixtures.approvalReceipt.decisionRef,
      issuedAt: args.approvalResult.decidedAt,
      evidence: {
        ...clone(fixtures.approvalReceipt.evidence),
        challengeRef: args.approvalResult.challengeRef,
        approvedBy: args.approvalResult.approvedBy,
        approvalChannel: args.approvalResult.approvalChannel,
        comment: args.approvalResult.comment,
      },
    };
  }

  async createActionReceipt(args: {
    receiptType: "payment" | "resource";
    actionRef: IdRef;
    decisionRef?: IdRef;
    settlementRef?: IdRef;
    evidence: Record<string, unknown>;
    issuedAt?: Timestamp;
  }): Promise<ActionReceipt> {
    const template =
      args.receiptType === "payment"
        ? getPaymentFixtures(args.actionRef).paymentReceipt
        : getResourceFixtures(args.actionRef).resourceReceipt;

    return {
      ...clone(template),
      actionRef: args.actionRef,
      decisionRef: args.decisionRef ?? template.decisionRef,
      settlementRef: args.settlementRef ?? template.settlementRef,
      issuedAt: args.issuedAt ?? template.issuedAt,
      evidence: clone(args.evidence),
    };
  }
}

class MockCapabilityResponsePort implements CapabilityResponsePort {
  async createCapabilityResponse(args: {
    capability: string;
    requestRef: IdRef;
    actionRef: IdRef;
    result: AuthorizationDecision["result"];
    decisionRef?: IdRef;
    challengeRef?: IdRef | null;
    settlementRef?: IdRef | null;
    receiptRef?: IdRef | null;
    message?: string;
  }): Promise<CapabilityResponse> {
    const fixtures = getFixturesByActionRef(args.actionRef);
    return {
      ...clone(fixtures.capabilityResponse),
      capability: args.capability,
      requestRef: args.requestRef,
      actionRef: args.actionRef,
      result: args.result,
      decisionRef: args.decisionRef ?? null,
      challengeRef: args.challengeRef ?? null,
      settlementRef: args.settlementRef ?? null,
      receiptRef: args.receiptRef ?? null,
      message: args.message ?? fixtures.capabilityResponse.message,
    };
  }
}

export function createMockAfalPorts(
  overrides: Partial<AfalOrchestrationPorts> = {}
): AfalOrchestrationPorts {
  const defaults: AfalOrchestrationPorts = {
    aip: new MockAipPort(),
    ats: new MockAtsPort(),
    amn: new MockAmnPort(),
    trustedSurface: new MockTrustedSurfacePort(),
    paymentSettlement: new MockPaymentSettlementPort(),
    resourceSettlement: new MockResourceSettlementPort(),
    receipts: new MockReceiptPort(),
    capabilityResponses: new MockCapabilityResponsePort(),
  };

  return {
    ...defaults,
    ...overrides,
  };
}

export class MockPaymentFlowOrchestrator implements PaymentFlowOrchestrator {
  constructor(private readonly ports: AfalOrchestrationPorts = createMockAfalPorts()) {}

  async executePaymentFlow(input: PaymentFlowInput): Promise<PaymentFlowOutput> {
    const fixtures = getPaymentFixtures(input.intent);
    const budgetRef = input.monetaryBudgetRef ?? fixtures.monetaryBudgetInitial.budgetId;

    await this.ports.aip.resolveIdentity(input.intent.payer.agentDid);
    await assertCredentialVerified(this.ports.aip, fixtures.ownershipCredential.id, "ownership");
    await assertCredentialVerified(this.ports.aip, fixtures.authorityCredential.id, "authority");
    await assertCredentialVerified(this.ports.aip, fixtures.policyCredential.id, "policy");
    await this.ports.ats.getAccountState(input.intent.payer.accountId);
    await this.ports.ats.getMonetaryBudgetState(budgetRef);

    const initialDecision = await this.ports.amn.evaluateAuthorization({
      actionRef: input.intent.intentId,
      actionType: "payment",
      subjectDid: input.intent.payer.agentDid,
      mandateRef: input.intent.mandateRef,
      policyRef: input.intent.policyRef,
      accountRef: input.intent.payer.accountId,
    });

    let challenge = undefined;
    let approvalContext = undefined;
    let approvalResult = undefined;
    let approvalReceipt = undefined;
    let finalDecision = initialDecision;

    if (initialDecision.result === "challenge-required") {
      challenge = await this.ports.amn.createChallengeRecord(initialDecision);
      approvalContext = await this.ports.amn.buildApprovalContext(challenge);
      approvalResult = await this.ports.trustedSurface.requestApproval(approvalContext);
      approvalResult = await this.ports.amn.recordApprovalResult(approvalResult);
      finalDecision = await this.ports.amn.finalizeAuthorization({
        priorDecision: initialDecision,
        approvalResult,
      });
      approvalReceipt = await this.ports.receipts.createApprovalReceipt({
        actionRef: input.intent.intentId,
        decisionRef: finalDecision.decisionId,
        approvalResult,
      });
    }

    assertKnown(
      finalDecision.result === "approved",
      `Mock payment flow stopped before settlement because authorization result was "${finalDecision.result}"`
    );

    const settlement = await this.ports.paymentSettlement.executePayment(input.intent, finalDecision);
    const paymentReceipt = await this.ports.receipts.createActionReceipt({
      receiptType: "payment",
      actionRef: input.intent.intentId,
      decisionRef: finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      issuedAt: fixtures.paymentReceipt.issuedAt,
      evidence: clone(fixtures.paymentReceipt.evidence),
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "executePayment",
      requestRef: input.requestRef,
      actionRef: input.intent.intentId,
      result: finalDecision.result,
      decisionRef: finalDecision.decisionId,
      challengeRef: challenge?.challengeId ?? null,
      settlementRef: settlement.settlementId,
      receiptRef: paymentReceipt.receiptId,
      message: fixtures.capabilityResponse.message,
    });

    return {
      intent: clone(fixtures.paymentIntentFinal),
      initialDecision,
      challenge,
      approvalContext,
      approvalResult,
      finalDecision,
      settlement,
      approvalReceipt,
      paymentReceipt,
      capabilityResponse,
      updatedBudget: clone(fixtures.monetaryBudgetFinal),
    };
  }
}

export class MockResourceFlowOrchestrator implements ResourceFlowOrchestrator {
  constructor(private readonly ports: AfalOrchestrationPorts = createMockAfalPorts()) {}

  async executeResourceSettlementFlow(input: ResourceFlowInput): Promise<ResourceFlowOutput> {
    const fixtures = getResourceFixtures(input.intent);

    await this.ports.aip.resolveIdentity(input.intent.requester.agentDid);
    await assertCredentialVerified(this.ports.aip, fixtures.ownershipCredential.id, "ownership");
    await assertCredentialVerified(this.ports.aip, fixtures.authorityCredential.id, "authority");
    await assertCredentialVerified(this.ports.aip, fixtures.policyCredential.id, "policy");
    await this.ports.ats.getAccountState(input.intent.requester.accountId);
    await this.ports.ats.getResourceBudgetState(input.resourceBudgetRef);
    await this.ports.ats.getResourceQuotaState(input.resourceQuotaRef);

    const initialDecision = await this.ports.amn.evaluateAuthorization({
      actionRef: input.intent.intentId,
      actionType: "resource",
      subjectDid: input.intent.requester.agentDid,
      mandateRef: input.intent.mandateRef,
      policyRef: input.intent.policyRef,
      accountRef: input.intent.requester.accountId,
    });

    let challenge = undefined;
    let approvalContext = undefined;
    let approvalResult = undefined;
    let approvalReceipt = undefined;
    let finalDecision = initialDecision;

    if (initialDecision.result === "challenge-required") {
      challenge = await this.ports.amn.createChallengeRecord(initialDecision);
      approvalContext = await this.ports.amn.buildApprovalContext(challenge);
      approvalResult = await this.ports.trustedSurface.requestApproval(approvalContext);
      approvalResult = await this.ports.amn.recordApprovalResult(approvalResult);
      finalDecision = await this.ports.amn.finalizeAuthorization({
        priorDecision: initialDecision,
        approvalResult,
      });
      approvalReceipt = await this.ports.receipts.createApprovalReceipt({
        actionRef: input.intent.intentId,
        decisionRef: finalDecision.decisionId,
        approvalResult,
      });
    }

    assertKnown(
      finalDecision.result === "approved",
      `Mock resource flow stopped before settlement because authorization result was "${finalDecision.result}"`
    );

    const usageConfirmation = await this.ports.resourceSettlement.confirmResourceUsage(input.intent);
    const settlement = await this.ports.resourceSettlement.settleResourceUsage({
      intent: input.intent,
      decision: finalDecision,
      usage: usageConfirmation,
    });
    const resourceReceipt = await this.ports.receipts.createActionReceipt({
      receiptType: "resource",
      actionRef: input.intent.intentId,
      decisionRef: finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      issuedAt: fixtures.resourceReceipt.issuedAt,
      evidence: clone(fixtures.resourceReceipt.evidence),
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "settleResourceUsage",
      requestRef: input.requestRef,
      actionRef: input.intent.intentId,
      result: finalDecision.result,
      decisionRef: finalDecision.decisionId,
      challengeRef: challenge?.challengeId ?? null,
      settlementRef: settlement.settlementId,
      receiptRef: resourceReceipt.receiptId,
      message: fixtures.capabilityResponse.message,
    });

    return {
      intent: clone(fixtures.resourceIntentFinal),
      initialDecision,
      challenge,
      approvalContext,
      approvalResult,
      finalDecision,
      usageConfirmation,
      settlement,
      approvalReceipt,
      resourceReceipt,
      capabilityResponse,
      updatedBudget: clone(fixtures.resourceBudgetFinal),
      updatedQuota: clone(fixtures.resourceQuotaFinal),
    };
  }
}

export function createMockPaymentFlowOrchestrator(
  ports: AfalOrchestrationPorts = createMockAfalPorts()
): PaymentFlowOrchestrator {
  return new MockPaymentFlowOrchestrator(ports);
}

export function createMockResourceFlowOrchestrator(
  ports: AfalOrchestrationPorts = createMockAfalPorts()
): ResourceFlowOrchestrator {
  return new MockResourceFlowOrchestrator(ports);
}
