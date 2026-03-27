import {
  paymentFlowFixtures,
  resourceFlowFixtures,
  type PaymentFlowFixtures,
  type ResourceFlowFixtures,
} from "../../../sdk/fixtures";
import { createSeededAfalOutputService } from "../outputs";
import { createSeededAfalSettlementService } from "../settlement";
import { createSeededAfalIntentStateService } from "../state";
import { createSeededInMemoryAipService } from "../../aip";
import { createSeededInMemoryAmnService } from "../../amn";
import type { AtsAdminPort } from "../../ats";
import { createSeededInMemoryAtsService } from "../../ats";
import type {
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  ChallengeRecord,
  Did,
  IdRef,
  PaymentIntent,
  ResourceIntent,
} from "../../../sdk/types";
import type {
  AfalOrchestrationPorts,
  AipPort,
  AmnPort,
  AtsPort,
  PaymentFlowInput,
  PaymentFlowOrchestrator,
  PaymentFlowOutput,
  ResourceFlowInput,
  ResourceFlowOrchestrator,
  ResourceFlowOutput,
  TrustedSurfacePort,
} from "../interfaces";
import { NoopSettlementNotificationPort } from "../notifications";

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

function canConsumeMonetaryBudget(port: AtsPort): port is AtsPort & Pick<AtsAdminPort, "consumeMonetaryBudget"> {
  return "consumeMonetaryBudget" in port && typeof port.consumeMonetaryBudget === "function";
}

function canReserveMonetaryBudget(
  port: AtsPort
): port is AtsPort & Pick<AtsAdminPort, "reserveMonetaryBudget" | "settleMonetaryReservation" | "releaseMonetaryReservation"> {
  return (
    "reserveMonetaryBudget" in port &&
    typeof port.reserveMonetaryBudget === "function" &&
    "settleMonetaryReservation" in port &&
    typeof port.settleMonetaryReservation === "function" &&
    "releaseMonetaryReservation" in port &&
    typeof port.releaseMonetaryReservation === "function"
  );
}

function canConsumeResourceBudget(
  port: AtsPort
): port is AtsPort & Pick<AtsAdminPort, "consumeResourceBudget"> {
  return "consumeResourceBudget" in port && typeof port.consumeResourceBudget === "function";
}

function canConsumeResourceQuota(
  port: AtsPort
): port is AtsPort & Pick<AtsAdminPort, "consumeResourceQuota"> {
  return "consumeResourceQuota" in port && typeof port.consumeResourceQuota === "function";
}

function canReserveResourceCapacity(
  port: AtsPort
): port is AtsPort &
  Pick<AtsAdminPort, "reserveResourceCapacity" | "settleResourceReservation" | "releaseResourceReservation"> {
  return (
    "reserveResourceCapacity" in port &&
    typeof port.reserveResourceCapacity === "function" &&
    "settleResourceReservation" in port &&
    typeof port.settleResourceReservation === "function" &&
    "releaseResourceReservation" in port &&
    typeof port.releaseResourceReservation === "function"
  );
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

export function createMockAfalPorts(
  overrides: Partial<AfalOrchestrationPorts> = {}
): AfalOrchestrationPorts {
  const outputs = createSeededAfalOutputService();
  const settlement = createSeededAfalSettlementService();
  const intents = createSeededAfalIntentStateService();
  const defaults: AfalOrchestrationPorts = {
    aip: createSeededInMemoryAipService(),
    ats: createSeededInMemoryAtsService(),
    amn: createSeededInMemoryAmnService(),
    intents,
    trustedSurface: new MockTrustedSurfacePort(),
    paymentSettlement: settlement,
    resourceSettlement: settlement,
    receipts: outputs,
    capabilityResponses: outputs,
    notifications: new NoopSettlementNotificationPort(),
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
    let intentState = await this.ports.intents.createPaymentIntent(input.intent);

    await this.ports.aip.resolveIdentity(intentState.payer.agentDid);
    await assertCredentialVerified(this.ports.aip, fixtures.ownershipCredential.id, "ownership");
    await assertCredentialVerified(this.ports.aip, fixtures.authorityCredential.id, "authority");
    await assertCredentialVerified(this.ports.aip, fixtures.policyCredential.id, "policy");
    await this.ports.ats.getAccountState(intentState.payer.accountId);
    await this.ports.ats.getMonetaryBudgetState(budgetRef);
    const monetaryReservation = canReserveMonetaryBudget(this.ports.ats)
      ? await this.ports.ats.reserveMonetaryBudget({
          reservationId: `resv-${intentState.intentId}`,
          budgetRef,
          accountRef: intentState.payer.accountId,
          actionRef: intentState.intentId,
          amount: intentState.amount,
          createdAt: intentState.createdAt,
        })
      : undefined;

    const initialDecision = await this.ports.amn.evaluateAuthorization({
      actionRef: intentState.intentId,
      actionType: "payment",
      subjectDid: intentState.payer.agentDid,
      mandateRef: intentState.mandateRef,
      policyRef: intentState.policyRef,
      accountRef: intentState.payer.accountId,
    });

    let challenge = undefined;
    let approvalContext = undefined;
    let approvalResult = undefined;
    let approvalReceipt = undefined;
    let finalDecision = initialDecision;

    if (initialDecision.result === "challenge-required") {
      const approvalRequest = await this.ports.amn.createApprovalRequest(initialDecision);
      challenge = approvalRequest.challenge;
      intentState = await this.ports.intents.markPaymentChallenge({
        intentId: intentState.intentId,
        decisionRef: initialDecision.decisionId,
        challengeRef: challenge.challengeId,
        challengeState: "pending-approval",
        status: "pending-approval",
      });
      approvalContext = approvalRequest.approvalContext;
      approvalResult = await this.ports.trustedSurface.requestApproval(approvalContext);
      const appliedApproval = await this.ports.amn.applyApprovalResult({
        approvalSessionRef: approvalRequest.approvalSession.approvalSessionId,
        result: approvalResult,
      });
      approvalResult = appliedApproval.approvalResult;
      challenge = appliedApproval.challenge;
      finalDecision = (
        await this.ports.amn.resumeAuthorizationSession(
          approvalRequest.approvalSession.approvalSessionId
        )
      ).finalDecision;
      approvalReceipt = await this.ports.receipts.createApprovalReceipt({
        actionRef: intentState.intentId,
        decisionRef: finalDecision.decisionId,
        approvalResult,
      });
    }

    if (finalDecision.result !== "approved") {
      if (monetaryReservation && canReserveMonetaryBudget(this.ports.ats)) {
        await this.ports.ats.releaseMonetaryReservation({
          reservationRef: monetaryReservation.reservation.reservationId,
          releasedAt: approvalResult?.decidedAt,
          reasonCode: finalDecision.result,
        });
      }
      throw new Error(
        `Mock payment flow stopped before settlement because authorization result was "${finalDecision.result}"`
      );
    }

    let settlement;
    try {
      settlement = await this.ports.paymentSettlement.executePayment(intentState, finalDecision);
    } catch (error) {
      if (monetaryReservation && canReserveMonetaryBudget(this.ports.ats)) {
        await this.ports.ats.releaseMonetaryReservation({
          reservationRef: monetaryReservation.reservation.reservationId,
          reasonCode: "settlement-failed",
        });
      }
      throw error;
    }
    const paymentReceipt = await this.ports.receipts.createActionReceipt({
      receiptType: "payment",
      actionRef: intentState.intentId,
      decisionRef: finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      issuedAt: fixtures.paymentReceipt.issuedAt,
      evidence: clone(fixtures.paymentReceipt.evidence),
    });
    intentState = await this.ports.intents.markPaymentSettlement({
      intentId: intentState.intentId,
      decisionRef: finalDecision.decisionId,
      challengeRef: challenge?.challengeId,
      challengeState: finalDecision.challengeState,
      settlementRef: settlement.settlementId,
      receiptRef: paymentReceipt.receiptId,
      status: "settled",
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "executePayment",
      requestRef: input.requestRef,
      actionRef: intentState.intentId,
      result: finalDecision.result,
      decisionRef: finalDecision.decisionId,
      challengeRef: challenge?.challengeId ?? null,
      settlementRef: settlement.settlementId,
      receiptRef: paymentReceipt.receiptId,
      message: fixtures.capabilityResponse.message,
    });
    const updatedBudget = monetaryReservation && canReserveMonetaryBudget(this.ports.ats)
      ? (
          await this.ports.ats.settleMonetaryReservation({
            reservationRef: monetaryReservation.reservation.reservationId,
            settledAt: settlement.settledAt ?? settlement.executedAt,
          })
        ).budget
      : canConsumeMonetaryBudget(this.ports.ats)
      ? await this.ports.ats.consumeMonetaryBudget({
          budgetRef,
          amount: intentState.amount,
          updatedAt: settlement.settledAt ?? settlement.executedAt,
        })
      : clone(fixtures.monetaryBudgetFinal);

    return {
      intent: intentState,
      initialDecision,
      challenge,
      approvalContext,
      approvalResult,
      finalDecision,
      settlement,
      approvalReceipt,
      paymentReceipt,
      capabilityResponse,
      updatedBudget,
    };
  }
}

export class MockResourceFlowOrchestrator implements ResourceFlowOrchestrator {
  constructor(private readonly ports: AfalOrchestrationPorts = createMockAfalPorts()) {}

  async executeResourceSettlementFlow(input: ResourceFlowInput): Promise<ResourceFlowOutput> {
    const fixtures = getResourceFixtures(input.intent);
    let intentState = await this.ports.intents.createResourceIntent(input.intent);

    await this.ports.aip.resolveIdentity(intentState.requester.agentDid);
    await assertCredentialVerified(this.ports.aip, fixtures.ownershipCredential.id, "ownership");
    await assertCredentialVerified(this.ports.aip, fixtures.authorityCredential.id, "authority");
    await assertCredentialVerified(this.ports.aip, fixtures.policyCredential.id, "policy");
    await this.ports.ats.getAccountState(intentState.requester.accountId);
    await this.ports.ats.getResourceBudgetState(input.resourceBudgetRef);
    await this.ports.ats.getResourceQuotaState(input.resourceQuotaRef);
    const resourceReservation = canReserveResourceCapacity(this.ports.ats)
      ? await this.ports.ats.reserveResourceCapacity({
          reservationId: `resv-${intentState.intentId}`,
          budgetRef: input.resourceBudgetRef,
          quotaRef: input.resourceQuotaRef,
          accountRef: intentState.requester.accountId,
          actionRef: intentState.intentId,
          quantity: intentState.resource.quantity,
          createdAt: intentState.createdAt,
        })
      : undefined;

    const initialDecision = await this.ports.amn.evaluateAuthorization({
      actionRef: intentState.intentId,
      actionType: "resource",
      subjectDid: intentState.requester.agentDid,
      mandateRef: intentState.mandateRef,
      policyRef: intentState.policyRef,
      accountRef: intentState.requester.accountId,
    });

    let challenge = undefined;
    let approvalContext = undefined;
    let approvalResult = undefined;
    let approvalReceipt = undefined;
    let finalDecision = initialDecision;

    if (initialDecision.result === "challenge-required") {
      const approvalRequest = await this.ports.amn.createApprovalRequest(initialDecision);
      challenge = approvalRequest.challenge;
      intentState = await this.ports.intents.markResourceChallenge({
        intentId: intentState.intentId,
        decisionRef: initialDecision.decisionId,
        challengeRef: challenge.challengeId,
        challengeState: "pending-approval",
        status: "pending-approval",
      });
      approvalContext = approvalRequest.approvalContext;
      approvalResult = await this.ports.trustedSurface.requestApproval(approvalContext);
      const appliedApproval = await this.ports.amn.applyApprovalResult({
        approvalSessionRef: approvalRequest.approvalSession.approvalSessionId,
        result: approvalResult,
      });
      approvalResult = appliedApproval.approvalResult;
      challenge = appliedApproval.challenge;
      finalDecision = (
        await this.ports.amn.resumeAuthorizationSession(
          approvalRequest.approvalSession.approvalSessionId
        )
      ).finalDecision;
      approvalReceipt = await this.ports.receipts.createApprovalReceipt({
        actionRef: intentState.intentId,
        decisionRef: finalDecision.decisionId,
        approvalResult,
      });
    }

    if (finalDecision.result !== "approved") {
      if (resourceReservation && canReserveResourceCapacity(this.ports.ats)) {
        await this.ports.ats.releaseResourceReservation({
          reservationRef: resourceReservation.reservation.reservationId,
          releasedAt: approvalResult?.decidedAt,
          reasonCode: finalDecision.result,
        });
      }
      throw new Error(
        `Mock resource flow stopped before settlement because authorization result was "${finalDecision.result}"`
      );
    }

    let usageConfirmation;
    let settlement;
    try {
      usageConfirmation = await this.ports.resourceSettlement.confirmResourceUsage(intentState);
      settlement = await this.ports.resourceSettlement.settleResourceUsage({
        intent: intentState,
        decision: finalDecision,
        usage: usageConfirmation,
      });
    } catch (error) {
      if (resourceReservation && canReserveResourceCapacity(this.ports.ats)) {
        await this.ports.ats.releaseResourceReservation({
          reservationRef: resourceReservation.reservation.reservationId,
          reasonCode: "settlement-failed",
        });
      }
      throw error;
    }
    const resourceReceipt = await this.ports.receipts.createActionReceipt({
      receiptType: "resource",
      actionRef: intentState.intentId,
      decisionRef: finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      issuedAt: fixtures.resourceReceipt.issuedAt,
      evidence: clone(fixtures.resourceReceipt.evidence),
    });
    intentState = await this.ports.intents.markResourceSettlement({
      intentId: intentState.intentId,
      decisionRef: finalDecision.decisionId,
      challengeRef: challenge?.challengeId,
      challengeState: finalDecision.challengeState,
      usageReceiptRef: usageConfirmation.usageReceiptRef,
      settlementRef: settlement.settlementId,
      status: "settled",
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "settleResourceUsage",
      requestRef: input.requestRef,
      actionRef: intentState.intentId,
      result: finalDecision.result,
      decisionRef: finalDecision.decisionId,
      challengeRef: challenge?.challengeId ?? null,
      settlementRef: settlement.settlementId,
      receiptRef: resourceReceipt.receiptId,
      message: fixtures.capabilityResponse.message,
    });
    const settledResourceReservation = resourceReservation && canReserveResourceCapacity(this.ports.ats)
      ? await this.ports.ats.settleResourceReservation({
          reservationRef: resourceReservation.reservation.reservationId,
          settledAt: settlement.settledAt ?? settlement.executedAt,
        })
      : undefined;
    const updatedBudget = settledResourceReservation
      ? settledResourceReservation.budget
      : canConsumeResourceBudget(this.ports.ats)
      ? await this.ports.ats.consumeResourceBudget({
          budgetRef: input.resourceBudgetRef,
          quantity: intentState.resource.quantity,
          updatedAt: settlement.settledAt ?? settlement.executedAt,
        })
      : clone(fixtures.resourceBudgetFinal);
    const updatedQuota = settledResourceReservation
      ? settledResourceReservation.quota
      : canConsumeResourceQuota(this.ports.ats)
      ? await this.ports.ats.consumeResourceQuota({
          quotaRef: input.resourceQuotaRef,
          quantity: intentState.resource.quantity,
          updatedAt: settlement.settledAt ?? settlement.executedAt,
        })
      : clone(fixtures.resourceQuotaFinal);

    return {
      intent: intentState,
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
      updatedBudget,
      updatedQuota,
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
