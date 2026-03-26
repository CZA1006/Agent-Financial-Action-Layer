import {
  paymentFlowFixtures,
  resourceFlowFixtures,
  type PaymentFlowFixtures,
  type ResourceFlowFixtures,
} from "../../../sdk/fixtures";
import type { IdRef, PaymentIntent, ResourceIntent } from "../../../sdk/types";
import type { AtsAdminPort } from "../../ats";
import type { OutputAdminPort } from "../outputs";
import type { SettlementAdminPort } from "../settlement";
import type {
  ActionStatusOutput,
  AfalOrchestrationPorts,
  PaymentFlowInput,
  PaymentFlowOrchestrator,
  PaymentFlowOutput,
  PaymentApprovalRequestOutput,
  ResumeApprovedActionOutput,
  ResourceFlowInput,
  ResourceFlowOrchestrator,
  ResourceFlowOutput,
  ResourceApprovalRequestOutput,
} from "../interfaces";
import type {
  AfalModuleService,
  ApplyApprovalResultCommand,
  AfalServiceCommand,
  AfalServiceResult,
  ExecutePaymentCommand,
  GetActionStatusCommand,
  GetApprovalSessionCommand,
  RequestPaymentApprovalCommand,
  RequestResourceApprovalCommand,
  ResumeApprovalSessionCommand,
  ResumeApprovedActionCommand,
  SettleResourceUsageCommand,
} from "./interfaces";
import {
  createMockAfalPorts,
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "../mock";
import type { CapabilityResponse } from "../../../sdk/types";

export interface AfalRuntimeServiceOptions {
  ports?: AfalOrchestrationPorts;
  paymentOrchestrator?: PaymentFlowOrchestrator;
  resourceOrchestrator?: ResourceFlowOrchestrator;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertKnown(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertCredentialVerified(
  aip: AfalOrchestrationPorts["aip"],
  credentialId: IdRef,
  label: string
): Promise<void> {
  const isValid = await aip.verifyCredential(credentialId);
  assertKnown(isValid, `Mock AFAL flow requires a verified ${label} credential: "${credentialId}"`);
}

function getPaymentFixtures(intentOrRef: PaymentIntent | IdRef): PaymentFlowFixtures {
  const intentId = typeof intentOrRef === "string" ? intentOrRef : intentOrRef.intentId;
  assertKnown(
    intentId === paymentFlowFixtures.paymentIntentCreated.intentId,
    `Mock payment runtime only supports intent "${paymentFlowFixtures.paymentIntentCreated.intentId}"`
  );
  return paymentFlowFixtures;
}

function getResourceFixtures(intentOrRef: ResourceIntent | IdRef): ResourceFlowFixtures {
  const intentId = typeof intentOrRef === "string" ? intentOrRef : intentOrRef.intentId;
  assertKnown(
    intentId === resourceFlowFixtures.resourceIntentCreated.intentId,
    `Mock resource runtime only supports intent "${resourceFlowFixtures.resourceIntentCreated.intentId}"`
  );
  return resourceFlowFixtures;
}

function canReserveMonetaryBudget(
  port: AfalOrchestrationPorts["ats"]
): port is AfalOrchestrationPorts["ats"] &
  Pick<AtsAdminPort, "reserveMonetaryBudget"> {
  return "reserveMonetaryBudget" in port && typeof port.reserveMonetaryBudget === "function";
}

function canSettleMonetaryReservation(
  port: AfalOrchestrationPorts["ats"]
): port is AfalOrchestrationPorts["ats"] &
  Pick<AtsAdminPort, "settleMonetaryReservation"> {
  return (
    "settleMonetaryReservation" in port &&
    typeof port.settleMonetaryReservation === "function"
  );
}

function canReleaseMonetaryReservation(
  port: AfalOrchestrationPorts["ats"]
): port is AfalOrchestrationPorts["ats"] &
  Pick<AtsAdminPort, "releaseMonetaryReservation"> {
  return (
    "releaseMonetaryReservation" in port &&
    typeof port.releaseMonetaryReservation === "function"
  );
}

function canReserveResourceCapacity(
  port: AfalOrchestrationPorts["ats"]
): port is AfalOrchestrationPorts["ats"] &
  Pick<AtsAdminPort, "reserveResourceCapacity"> {
  return "reserveResourceCapacity" in port && typeof port.reserveResourceCapacity === "function";
}

function canSettleResourceReservation(
  port: AfalOrchestrationPorts["ats"]
): port is AfalOrchestrationPorts["ats"] &
  Pick<AtsAdminPort, "settleResourceReservation"> {
  return (
    "settleResourceReservation" in port &&
    typeof port.settleResourceReservation === "function"
  );
}

function canReleaseResourceReservation(
  port: AfalOrchestrationPorts["ats"]
): port is AfalOrchestrationPorts["ats"] &
  Pick<AtsAdminPort, "releaseResourceReservation"> {
  return (
    "releaseResourceReservation" in port &&
    typeof port.releaseResourceReservation === "function"
  );
}

function canListReceipts(
  port: AfalOrchestrationPorts["receipts"]
): port is AfalOrchestrationPorts["receipts"] & Pick<OutputAdminPort, "listReceipts"> {
  return "listReceipts" in port && typeof port.listReceipts === "function";
}

function canListCapabilityResponses(
  port: AfalOrchestrationPorts["capabilityResponses"]
): port is AfalOrchestrationPorts["capabilityResponses"] &
  Pick<OutputAdminPort, "listCapabilityResponses"> {
  return (
    "listCapabilityResponses" in port && typeof port.listCapabilityResponses === "function"
  );
}

function canGetSettlement(
  port: AfalOrchestrationPorts["paymentSettlement"] | AfalOrchestrationPorts["resourceSettlement"]
): port is (AfalOrchestrationPorts["paymentSettlement"] | AfalOrchestrationPorts["resourceSettlement"]) &
  Pick<SettlementAdminPort, "getSettlement"> {
  return "getSettlement" in port && typeof port.getSettlement === "function";
}

function canGetUsageConfirmation(
  port: AfalOrchestrationPorts["resourceSettlement"]
): port is AfalOrchestrationPorts["resourceSettlement"] &
  Pick<SettlementAdminPort, "getUsageConfirmation"> {
  return "getUsageConfirmation" in port && typeof port.getUsageConfirmation === "function";
}

function isUnknownIntentError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Unknown payment intent") ||
      error.message.includes("Unknown resource intent"))
  );
}

function selectLatestCapabilityResponse(
  entries: CapabilityResponse[]
): CapabilityResponse | undefined {
  return [...entries].sort((left, right) => {
    const leftValue = left.respondedAt ?? "";
    const rightValue = right.respondedAt ?? "";
    return rightValue.localeCompare(leftValue);
  })[0];
}

export class AfalRuntimeService
  implements
    PaymentFlowOrchestrator,
    ResourceFlowOrchestrator,
    AfalModuleService
{
  readonly ports: AfalOrchestrationPorts;
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

  async requestPaymentApproval(
    command: RequestPaymentApprovalCommand
  ): Promise<PaymentApprovalRequestOutput> {
    const fixtures = getPaymentFixtures(command.input.intent);
    let intentState = await this.ports.intents.createPaymentIntent(command.input.intent);

    await this.ports.aip.resolveIdentity(intentState.payer.agentDid);
    await assertCredentialVerified(this.ports.aip, fixtures.ownershipCredential.id, "ownership");
    await assertCredentialVerified(this.ports.aip, fixtures.authorityCredential.id, "authority");
    await assertCredentialVerified(this.ports.aip, fixtures.policyCredential.id, "policy");
    await this.ports.ats.getAccountState(intentState.payer.accountId);

    const budgetRef = command.input.monetaryBudgetRef ?? fixtures.monetaryBudgetInitial.budgetId;
    const currentBudget = await this.ports.ats.getMonetaryBudgetState(budgetRef);
    const reservedBudget = canReserveMonetaryBudget(this.ports.ats)
      ? (
          await this.ports.ats.reserveMonetaryBudget({
            reservationId: `resv-${intentState.intentId}`,
            budgetRef,
            accountRef: intentState.payer.accountId,
            actionRef: intentState.intentId,
            amount: intentState.amount,
            createdAt: intentState.createdAt,
          })
        ).budget
      : currentBudget;

    const initialDecision = await this.ports.amn.evaluateAuthorization({
      actionRef: intentState.intentId,
      actionType: "payment",
      subjectDid: intentState.payer.agentDid,
      mandateRef: intentState.mandateRef,
      policyRef: intentState.policyRef,
      accountRef: intentState.payer.accountId,
    });
    assertKnown(
      initialDecision.result === "challenge-required",
      `AFAL approval request requires an authorization result of "challenge-required", got "${initialDecision.result}"`
    );

    const approvalRequest = await this.ports.amn.createApprovalRequest(initialDecision);
    await this.ports.intents.createPendingExecution({
      approvalSessionRef: approvalRequest.approvalSession.approvalSessionId,
      actionRef: intentState.intentId,
      actionType: "payment",
      requestRef: command.requestRef,
      reservationRef: reservedBudget !== currentBudget ? `resv-${intentState.intentId}` : undefined,
      monetaryBudgetRef: budgetRef,
      status: "pending",
      createdAt: approvalRequest.approvalSession.createdAt,
      updatedAt: approvalRequest.approvalSession.updatedAt,
    });
    intentState = await this.ports.intents.markPaymentChallenge({
      intentId: intentState.intentId,
      decisionRef: initialDecision.decisionId,
      challengeRef: approvalRequest.challenge.challengeId,
      challengeState: "pending-approval",
      status: "pending-approval",
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "requestPaymentApproval",
      requestRef: command.requestRef,
      actionRef: intentState.intentId,
      result: "pending-approval",
      decisionRef: initialDecision.decisionId,
      challengeRef: approvalRequest.challenge.challengeId,
      message: "Payment request is pending trusted-surface approval",
    });

    return {
      intent: intentState,
      initialDecision,
      challenge: approvalRequest.challenge,
      approvalContext: approvalRequest.approvalContext,
      approvalSession: approvalRequest.approvalSession,
      capabilityResponse,
      updatedBudget: reservedBudget,
    };
  }

  async executePayment(command: ExecutePaymentCommand): Promise<PaymentFlowOutput> {
    return this.executePaymentFlow(command.input);
  }

  async executeResourceSettlementFlow(
    input: ResourceFlowInput
  ): Promise<ResourceFlowOutput> {
    return this.resourceOrchestrator.executeResourceSettlementFlow(input);
  }

  async requestResourceApproval(
    command: RequestResourceApprovalCommand
  ): Promise<ResourceApprovalRequestOutput> {
    const fixtures = getResourceFixtures(command.input.intent);
    let intentState = await this.ports.intents.createResourceIntent(command.input.intent);

    await this.ports.aip.resolveIdentity(intentState.requester.agentDid);
    await assertCredentialVerified(this.ports.aip, fixtures.ownershipCredential.id, "ownership");
    await assertCredentialVerified(this.ports.aip, fixtures.authorityCredential.id, "authority");
    await assertCredentialVerified(this.ports.aip, fixtures.policyCredential.id, "policy");
    await this.ports.ats.getAccountState(intentState.requester.accountId);

    const currentBudget = await this.ports.ats.getResourceBudgetState(command.input.resourceBudgetRef);
    const currentQuota = await this.ports.ats.getResourceQuotaState(command.input.resourceQuotaRef);
    const reserved = canReserveResourceCapacity(this.ports.ats)
      ? await this.ports.ats.reserveResourceCapacity({
          reservationId: `resv-${intentState.intentId}`,
          budgetRef: command.input.resourceBudgetRef,
          quotaRef: command.input.resourceQuotaRef,
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
    assertKnown(
      initialDecision.result === "challenge-required",
      `AFAL approval request requires an authorization result of "challenge-required", got "${initialDecision.result}"`
    );

    const approvalRequest = await this.ports.amn.createApprovalRequest(initialDecision);
    await this.ports.intents.createPendingExecution({
      approvalSessionRef: approvalRequest.approvalSession.approvalSessionId,
      actionRef: intentState.intentId,
      actionType: "resource",
      requestRef: command.requestRef,
      reservationRef: reserved ? `resv-${intentState.intentId}` : undefined,
      resourceBudgetRef: command.input.resourceBudgetRef,
      resourceQuotaRef: command.input.resourceQuotaRef,
      status: "pending",
      createdAt: approvalRequest.approvalSession.createdAt,
      updatedAt: approvalRequest.approvalSession.updatedAt,
    });
    intentState = await this.ports.intents.markResourceChallenge({
      intentId: intentState.intentId,
      decisionRef: initialDecision.decisionId,
      challengeRef: approvalRequest.challenge.challengeId,
      challengeState: "pending-approval",
      status: "pending-approval",
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "requestResourceApproval",
      requestRef: command.requestRef,
      actionRef: intentState.intentId,
      result: "pending-approval",
      decisionRef: initialDecision.decisionId,
      challengeRef: approvalRequest.challenge.challengeId,
      message: "Resource request is pending trusted-surface approval",
    });

    return {
      intent: intentState,
      initialDecision,
      challenge: approvalRequest.challenge,
      approvalContext: approvalRequest.approvalContext,
      approvalSession: approvalRequest.approvalSession,
      capabilityResponse,
      updatedBudget: reserved?.budget ?? currentBudget,
      updatedQuota: reserved?.quota ?? currentQuota,
    };
  }

  async settleResourceUsage(
    command: SettleResourceUsageCommand
  ): Promise<ResourceFlowOutput> {
    return this.executeResourceSettlementFlow(command.input);
  }

  async getActionStatus(command: GetActionStatusCommand): Promise<ActionStatusOutput> {
    try {
      const intent = await this.ports.intents.getPaymentIntent(command.input.actionRef);
      return this.buildPaymentActionStatus(intent);
    } catch (error) {
      if (!isUnknownIntentError(error)) {
        throw error;
      }
    }

    try {
      const intent = await this.ports.intents.getResourceIntent(command.input.actionRef);
      return this.buildResourceActionStatus(intent);
    } catch (error) {
      if (!isUnknownIntentError(error)) {
        throw error;
      }
    }

    throw new Error(`Unknown actionRef "${command.input.actionRef}"`);
  }

  async getApprovalSession(command: GetApprovalSessionCommand) {
    return this.ports.amn.getApprovalSession(command.input.approvalSessionRef);
  }

  async applyApprovalResult(command: ApplyApprovalResultCommand) {
    return this.ports.amn.applyApprovalResult(command.input);
  }

  async resumeApprovalSession(command: ResumeApprovalSessionCommand) {
    return this.ports.amn.resumeAuthorizationSession(command.input.approvalSessionRef);
  }

  async resumeApprovedAction(
    command: ResumeApprovedActionCommand
  ): Promise<ResumeApprovedActionOutput> {
    const pendingExecution = await this.ports.intents.getPendingExecution(
      command.input.approvalSessionRef
    );
    const resumed = await this.ports.amn.resumeAuthorizationSession(
      command.input.approvalSessionRef
    );
    const approvalSession = await this.ports.amn.getApprovalSession(command.input.approvalSessionRef);
    const initialDecision = await this.ports.amn.getDecision(approvalSession.priorDecisionRef);
    const approvalContext = await this.ports.amn.getApprovalContext(
      approvalSession.approvalContextRef
    );

    if (pendingExecution.actionType === "payment") {
      return this.resumeApprovedPaymentAction({
        requestRef: pendingExecution.requestRef,
        pendingExecution,
        initialDecision,
        approvalContext,
        ...resumed,
      });
    }

    return this.resumeApprovedResourceAction({
      requestRef: pendingExecution.requestRef,
      pendingExecution,
      initialDecision,
      approvalContext,
      ...resumed,
    });
  }

  private async buildPaymentActionStatus(intent: PaymentIntent): Promise<ActionStatusOutput> {
    const receipts = canListReceipts(this.ports.receipts)
      ? (await this.ports.receipts.listReceipts()).filter((receipt) => receipt.actionRef === intent.intentId)
      : [];
    const capabilityResponses = canListCapabilityResponses(this.ports.capabilityResponses)
      ? (
          await this.ports.capabilityResponses.listCapabilityResponses()
        ).filter((response) => response.actionRef === intent.intentId)
      : [];

    return {
      actionType: "payment",
      intent,
      finalDecision: intent.decisionRef
        ? await this.ports.amn.getDecision(intent.decisionRef)
        : undefined,
      settlement:
        intent.settlementRef && canGetSettlement(this.ports.paymentSettlement)
          ? await this.ports.paymentSettlement.getSettlement(intent.settlementRef)
          : undefined,
      approvalReceipt: receipts.find((receipt) => receipt.receiptType === "approval"),
      paymentReceipt: receipts.find((receipt) => receipt.receiptType === "payment"),
      capabilityResponse: selectLatestCapabilityResponse(capabilityResponses),
    };
  }

  private async buildResourceActionStatus(intent: ResourceIntent): Promise<ActionStatusOutput> {
    const receipts = canListReceipts(this.ports.receipts)
      ? (await this.ports.receipts.listReceipts()).filter((receipt) => receipt.actionRef === intent.intentId)
      : [];
    const capabilityResponses = canListCapabilityResponses(this.ports.capabilityResponses)
      ? (
          await this.ports.capabilityResponses.listCapabilityResponses()
        ).filter((response) => response.actionRef === intent.intentId)
      : [];

    return {
      actionType: "resource",
      intent,
      finalDecision: intent.decisionRef
        ? await this.ports.amn.getDecision(intent.decisionRef)
        : undefined,
      usageConfirmation:
        intent.usageReceiptRef && canGetUsageConfirmation(this.ports.resourceSettlement)
          ? await this.ports.resourceSettlement.getUsageConfirmation(intent.usageReceiptRef)
          : undefined,
      settlement:
        intent.settlementRef && canGetSettlement(this.ports.resourceSettlement)
          ? await this.ports.resourceSettlement.getSettlement(intent.settlementRef)
          : undefined,
      approvalReceipt: receipts.find((receipt) => receipt.receiptType === "approval"),
      resourceReceipt: receipts.find((receipt) => receipt.receiptType === "resource"),
      capabilityResponse: selectLatestCapabilityResponse(capabilityResponses),
    };
  }

  private async resumeApprovedPaymentAction(args: {
    requestRef: IdRef;
    pendingExecution: Awaited<ReturnType<AfalOrchestrationPorts["intents"]["getPendingExecution"]>>;
    initialDecision: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["getDecision"]>>;
    approvalContext: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["getApprovalContext"]>>;
    finalDecision: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["finalDecision"];
    approvalResult: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["approvalResult"];
    approvalSession: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["approvalSession"];
    challenge: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["challenge"];
  }): Promise<PaymentFlowOutput> {
    const fixtures = getPaymentFixtures(args.pendingExecution.actionRef);
    const intent = await this.ports.intents.getPaymentIntent(args.pendingExecution.actionRef);

    if (args.finalDecision.result !== "approved") {
      if (args.pendingExecution.reservationRef && canReleaseMonetaryReservation(this.ports.ats)) {
        await this.ports.ats.releaseMonetaryReservation({
          reservationRef: args.pendingExecution.reservationRef,
          releasedAt: args.approvalResult.decidedAt,
          reasonCode: args.finalDecision.result,
        });
      }
      await this.ports.intents.markPaymentChallenge({
        intentId: intent.intentId,
        decisionRef: args.finalDecision.decisionId,
        challengeRef: args.challenge.challengeId,
        challengeState: args.finalDecision.challengeState,
        status: args.finalDecision.result === "expired" ? "expired" : "rejected",
      });
      await this.ports.intents.markPendingExecution({
        approvalSessionRef: args.approvalSession.approvalSessionId,
        status: "released",
        updatedAt: args.approvalResult.decidedAt,
        finalDecisionRef: args.finalDecision.decisionId,
      });
      throw new Error(
        `AFAL pending payment could not resume because authorization result was "${args.finalDecision.result}"`
      );
    }

    const approvalReceipt = await this.ports.receipts.createApprovalReceipt({
      actionRef: intent.intentId,
      decisionRef: args.finalDecision.decisionId,
      approvalResult: args.approvalResult,
    });

    let settlement;
    try {
      settlement = await this.ports.paymentSettlement.executePayment(intent, args.finalDecision);
    } catch (error) {
      if (args.pendingExecution.reservationRef && canReleaseMonetaryReservation(this.ports.ats)) {
        await this.ports.ats.releaseMonetaryReservation({
          reservationRef: args.pendingExecution.reservationRef,
          reasonCode: "settlement-failed",
        });
      }
      await this.ports.intents.markPendingExecution({
        approvalSessionRef: args.approvalSession.approvalSessionId,
        status: "failed",
        updatedAt: new Date().toISOString(),
        finalDecisionRef: args.finalDecision.decisionId,
      });
      throw error;
    }

    const paymentReceipt = await this.ports.receipts.createActionReceipt({
      receiptType: "payment",
      actionRef: intent.intentId,
      decisionRef: args.finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      issuedAt: fixtures.paymentReceipt.issuedAt,
      evidence: clone(fixtures.paymentReceipt.evidence),
    });
    const settledIntent = await this.ports.intents.markPaymentSettlement({
      intentId: intent.intentId,
      decisionRef: args.finalDecision.decisionId,
      challengeRef: args.challenge.challengeId,
      challengeState: args.finalDecision.challengeState,
      settlementRef: settlement.settlementId,
      receiptRef: paymentReceipt.receiptId,
      status: "settled",
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "resumeApprovedAction",
      requestRef: args.requestRef,
      actionRef: settledIntent.intentId,
      result: args.finalDecision.result,
      decisionRef: args.finalDecision.decisionId,
      challengeRef: args.challenge.challengeId,
      settlementRef: settlement.settlementId,
      receiptRef: paymentReceipt.receiptId,
      message: fixtures.capabilityResponse.message,
    });
    const updatedBudget =
      args.pendingExecution.reservationRef && canSettleMonetaryReservation(this.ports.ats)
        ? (
            await this.ports.ats.settleMonetaryReservation({
              reservationRef: args.pendingExecution.reservationRef,
              settledAt: settlement.settledAt ?? settlement.executedAt,
            })
          ).budget
        : await this.ports.ats.getMonetaryBudgetState(
            args.pendingExecution.monetaryBudgetRef ?? fixtures.monetaryBudgetInitial.budgetId
          );
    await this.ports.intents.markPendingExecution({
      approvalSessionRef: args.approvalSession.approvalSessionId,
      status: "resumed",
      updatedAt: settlement.settledAt ?? settlement.executedAt,
      finalDecisionRef: args.finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      receiptRef: paymentReceipt.receiptId,
    });

    return {
      intent: settledIntent,
      initialDecision: args.initialDecision,
      challenge: args.challenge,
      approvalContext: args.approvalContext,
      approvalResult: args.approvalResult,
      finalDecision: args.finalDecision,
      settlement,
      approvalReceipt,
      paymentReceipt,
      capabilityResponse,
      updatedBudget,
    };
  }

  private async resumeApprovedResourceAction(args: {
    requestRef: IdRef;
    pendingExecution: Awaited<ReturnType<AfalOrchestrationPorts["intents"]["getPendingExecution"]>>;
    initialDecision: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["getDecision"]>>;
    approvalContext: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["getApprovalContext"]>>;
    finalDecision: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["finalDecision"];
    approvalResult: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["approvalResult"];
    approvalSession: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["approvalSession"];
    challenge: Awaited<ReturnType<AfalOrchestrationPorts["amn"]["resumeAuthorizationSession"]>>["challenge"];
  }): Promise<ResourceFlowOutput> {
    const fixtures = getResourceFixtures(args.pendingExecution.actionRef);
    const intent = await this.ports.intents.getResourceIntent(args.pendingExecution.actionRef);

    if (args.finalDecision.result !== "approved") {
      if (args.pendingExecution.reservationRef && canReleaseResourceReservation(this.ports.ats)) {
        await this.ports.ats.releaseResourceReservation({
          reservationRef: args.pendingExecution.reservationRef,
          releasedAt: args.approvalResult.decidedAt,
          reasonCode: args.finalDecision.result,
        });
      }
      await this.ports.intents.markResourceChallenge({
        intentId: intent.intentId,
        decisionRef: args.finalDecision.decisionId,
        challengeRef: args.challenge.challengeId,
        challengeState: args.finalDecision.challengeState,
        status: args.finalDecision.result === "expired" ? "expired" : "rejected",
      });
      await this.ports.intents.markPendingExecution({
        approvalSessionRef: args.approvalSession.approvalSessionId,
        status: "released",
        updatedAt: args.approvalResult.decidedAt,
        finalDecisionRef: args.finalDecision.decisionId,
      });
      throw new Error(
        `AFAL pending resource action could not resume because authorization result was "${args.finalDecision.result}"`
      );
    }

    const approvalReceipt = await this.ports.receipts.createApprovalReceipt({
      actionRef: intent.intentId,
      decisionRef: args.finalDecision.decisionId,
      approvalResult: args.approvalResult,
    });

    let usageConfirmation;
    let settlement;
    try {
      usageConfirmation = await this.ports.resourceSettlement.confirmResourceUsage(intent);
      settlement = await this.ports.resourceSettlement.settleResourceUsage({
        intent,
        decision: args.finalDecision,
        usage: usageConfirmation,
      });
    } catch (error) {
      if (args.pendingExecution.reservationRef && canReleaseResourceReservation(this.ports.ats)) {
        await this.ports.ats.releaseResourceReservation({
          reservationRef: args.pendingExecution.reservationRef,
          reasonCode: "settlement-failed",
        });
      }
      await this.ports.intents.markPendingExecution({
        approvalSessionRef: args.approvalSession.approvalSessionId,
        status: "failed",
        updatedAt: new Date().toISOString(),
        finalDecisionRef: args.finalDecision.decisionId,
      });
      throw error;
    }

    const resourceReceipt = await this.ports.receipts.createActionReceipt({
      receiptType: "resource",
      actionRef: intent.intentId,
      decisionRef: args.finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      issuedAt: fixtures.resourceReceipt.issuedAt,
      evidence: clone(fixtures.resourceReceipt.evidence),
    });
    const settledIntent = await this.ports.intents.markResourceSettlement({
      intentId: intent.intentId,
      decisionRef: args.finalDecision.decisionId,
      challengeRef: args.challenge.challengeId,
      challengeState: args.finalDecision.challengeState,
      usageReceiptRef: usageConfirmation.usageReceiptRef,
      settlementRef: settlement.settlementId,
      status: "settled",
    });
    const capabilityResponse = await this.ports.capabilityResponses.createCapabilityResponse({
      capability: "resumeApprovedAction",
      requestRef: args.requestRef,
      actionRef: settledIntent.intentId,
      result: args.finalDecision.result,
      decisionRef: args.finalDecision.decisionId,
      challengeRef: args.challenge.challengeId,
      settlementRef: settlement.settlementId,
      receiptRef: resourceReceipt.receiptId,
      message: fixtures.capabilityResponse.message,
    });
    const settledReservation =
      args.pendingExecution.reservationRef && canSettleResourceReservation(this.ports.ats)
        ? await this.ports.ats.settleResourceReservation({
            reservationRef: args.pendingExecution.reservationRef,
            settledAt: settlement.settledAt ?? settlement.executedAt,
          })
        : undefined;
    const updatedBudget = settledReservation
      ? settledReservation.budget
      : await this.ports.ats.getResourceBudgetState(
          args.pendingExecution.resourceBudgetRef ?? fixtures.resourceBudgetInitial.budgetId
        );
    const updatedQuota = settledReservation
      ? settledReservation.quota
      : await this.ports.ats.getResourceQuotaState(
          args.pendingExecution.resourceQuotaRef ?? fixtures.resourceQuotaInitial.quotaId
        );
    await this.ports.intents.markPendingExecution({
      approvalSessionRef: args.approvalSession.approvalSessionId,
      status: "resumed",
      updatedAt: settlement.settledAt ?? settlement.executedAt,
      finalDecisionRef: args.finalDecision.decisionId,
      settlementRef: settlement.settlementId,
      receiptRef: resourceReceipt.receiptId,
      usageReceiptRef: usageConfirmation.usageReceiptRef,
    });

    return {
      intent: settledIntent,
      initialDecision: args.initialDecision,
      challenge: args.challenge,
      approvalContext: args.approvalContext,
      approvalResult: args.approvalResult,
      finalDecision: args.finalDecision,
      usageConfirmation,
      settlement,
      approvalReceipt,
      resourceReceipt,
      capabilityResponse,
      updatedBudget,
      updatedQuota,
    };
  }

  async invoke(command: AfalServiceCommand): Promise<AfalServiceResult> {
    if (command.capability === "requestPaymentApproval") {
      return this.requestPaymentApproval(command);
    }

    if (command.capability === "executePayment") {
      return this.executePayment(command);
    }

    if (command.capability === "requestResourceApproval") {
      return this.requestResourceApproval(command);
    }

    if (command.capability === "settleResourceUsage") {
      return this.settleResourceUsage(command);
    }

    if (command.capability === "getActionStatus") {
      return this.getActionStatus(command);
    }

    if (command.capability === "getApprovalSession") {
      return this.getApprovalSession(command);
    }

    if (command.capability === "applyApprovalResult") {
      return this.applyApprovalResult(command);
    }

    if (command.capability === "resumeApprovalSession") {
      return this.resumeApprovalSession(command);
    }

    return this.resumeApprovedAction(command);
  }
}

export function createAfalRuntimeService(
  options: AfalRuntimeServiceOptions = {}
): AfalRuntimeService {
  return new AfalRuntimeService(options);
}
