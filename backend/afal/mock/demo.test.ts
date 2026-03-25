import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import { runMockAfalDemo } from "./demo";
import {
  createMockAfalPorts,
  createMockPaymentFlowOrchestrator,
  createMockResourceFlowOrchestrator,
} from "./orchestrator";

describe("AFAL mock orchestrator skeleton", () => {
  test("replays the canonical payment flow", async () => {
    const orchestrator = createMockPaymentFlowOrchestrator();

    const output = await orchestrator.executePaymentFlow({
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    });

    assert.equal(output.initialDecision.result, "challenge-required");
    assert.equal(output.challenge?.challengeId, paymentFlowFixtures.challengeRecord.challengeId);
    assert.equal(output.approvalResult?.result, "approved");
    assert.equal(output.finalDecision.result, "approved");
    assert.equal(output.settlement.settlementId, paymentFlowFixtures.settlementRecord.settlementId);
    assert.equal(output.paymentReceipt.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
    assert.equal(output.intent.status, "settled");
    assert.equal(output.updatedBudget?.availableAmount, paymentFlowFixtures.monetaryBudgetFinal.availableAmount);
  });

  test("replays the canonical resource settlement flow", async () => {
    const orchestrator = createMockResourceFlowOrchestrator();

    const output = await orchestrator.executeResourceSettlementFlow({
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
    });

    assert.equal(output.initialDecision.result, "challenge-required");
    assert.equal(output.challenge?.challengeId, resourceFlowFixtures.challengeRecord.challengeId);
    assert.equal(output.approvalResult?.result, "approved");
    assert.equal(output.finalDecision.result, "approved");
    assert.equal(
      output.usageConfirmation.usageReceiptRef,
      resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
    );
    assert.equal(output.settlement.settlementId, resourceFlowFixtures.settlementRecord.settlementId);
    assert.equal(output.resourceReceipt.receiptId, resourceFlowFixtures.resourceReceipt.receiptId);
    assert.equal(output.intent.status, "settled");
    assert.equal(output.updatedBudget.availableQuantity, resourceFlowFixtures.resourceBudgetFinal.availableQuantity);
    assert.equal(output.updatedQuota.usedQuantity, resourceFlowFixtures.resourceQuotaFinal.usedQuantity);
  });

  test("produces a compact demo summary for CLI and fixture checks", async () => {
    const result = await runMockAfalDemo();

    assert.deepEqual(result.summary, {
      payment: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intentId: paymentFlowFixtures.paymentIntentCreated.intentId,
        result: "approved",
        challengeId: paymentFlowFixtures.challengeRecord.challengeId,
        settlementId: paymentFlowFixtures.settlementRecord.settlementId,
        receiptId: paymentFlowFixtures.paymentReceipt.receiptId,
        amount: paymentFlowFixtures.paymentIntentFinal.amount,
        asset: paymentFlowFixtures.paymentIntentFinal.asset,
      },
      resource: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intentId: resourceFlowFixtures.resourceIntentCreated.intentId,
        result: "approved",
        challengeId: resourceFlowFixtures.challengeRecord.challengeId,
        usageReceiptRef: resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef,
        settlementId: resourceFlowFixtures.settlementRecord.settlementId,
        receiptId: resourceFlowFixtures.resourceReceipt.receiptId,
        quantity: resourceFlowFixtures.resourceIntentFinal.resource.quantity,
        maxSpend: resourceFlowFixtures.resourceIntentFinal.pricing.maxSpend,
        asset: resourceFlowFixtures.resourceIntentFinal.pricing.asset,
      },
    });
  });

  test("fails the payment flow when a required credential cannot be verified", async () => {
    const basePorts = createMockAfalPorts();
    const orchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        aip: {
          resolveIdentity: (subjectDid) => basePorts.aip.resolveIdentity(subjectDid),
          verifyCredential: async (credentialId) =>
            credentialId === paymentFlowFixtures.policyCredential.id
              ? false
              : basePorts.aip.verifyCredential(credentialId),
        },
      })
    );

    await assert.rejects(
      () =>
        orchestrator.executePaymentFlow({
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        }),
      /verified policy credential/
    );
  });

  test("stops before settlement when payment approval is rejected", async () => {
    const basePorts = createMockAfalPorts();
    let settlementCalls = 0;

    const orchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        trustedSurface: {
          requestApproval: async (context) => ({
            ...paymentFlowFixtures.approvalResult,
            challengeRef: context.challengeRef,
            actionRef: context.actionRef,
            result: "rejected",
            approvalReceiptRef: undefined,
            comment: "Rejected in negative-path test",
          }),
        },
        paymentSettlement: {
          executePayment: async (intent, decision) => {
            settlementCalls += 1;
            return basePorts.paymentSettlement.executePayment(intent, decision);
          },
        },
      })
    );

    await assert.rejects(
      () =>
        orchestrator.executePaymentFlow({
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        }),
      /authorization result was "rejected"/
    );

    assert.equal(settlementCalls, 0);
  });

  test("stops before settlement when payment approval expires", async () => {
    const basePorts = createMockAfalPorts();
    let settlementCalls = 0;

    const orchestrator = createMockPaymentFlowOrchestrator(
      createMockAfalPorts({
        trustedSurface: {
          requestApproval: async (context) => ({
            ...paymentFlowFixtures.approvalResult,
            challengeRef: context.challengeRef,
            actionRef: context.actionRef,
            result: "expired",
            approvalReceiptRef: undefined,
            comment: "Approval timed out in negative-path test",
          }),
        },
        paymentSettlement: {
          executePayment: async (intent, decision) => {
            settlementCalls += 1;
            return basePorts.paymentSettlement.executePayment(intent, decision);
          },
        },
      })
    );

    await assert.rejects(
      () =>
        orchestrator.executePaymentFlow({
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        }),
      /authorization result was "expired"/
    );

    assert.equal(settlementCalls, 0);
  });

  test("fails the payment flow on an unknown subject DID", async () => {
    const orchestrator = createMockPaymentFlowOrchestrator();

    await assert.rejects(
      () =>
        orchestrator.executePaymentFlow({
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: {
            ...paymentFlowFixtures.paymentIntentCreated,
            payer: {
              ...paymentFlowFixtures.paymentIntentCreated.payer,
              agentDid: "did:afal:agent:missing-agent",
            },
          },
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        }),
      /Unknown DID/
    );
  });

  test("fails the payment flow on an unknown account reference", async () => {
    const orchestrator = createMockPaymentFlowOrchestrator();

    await assert.rejects(
      () =>
        orchestrator.executePaymentFlow({
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: {
            ...paymentFlowFixtures.paymentIntentCreated,
            payer: {
              ...paymentFlowFixtures.paymentIntentCreated.payer,
              accountId: "acct-missing",
            },
          },
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        }),
      /Unknown accountRef/
    );
  });

  test("fails the resource flow on an unknown budget reference", async () => {
    const orchestrator = createMockResourceFlowOrchestrator();

    await assert.rejects(
      () =>
        orchestrator.executeResourceSettlementFlow({
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: "budg-res-missing",
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        }),
      /Unknown resource budget/
    );
  });

  test("fails the resource flow on an unknown quota reference", async () => {
    const orchestrator = createMockResourceFlowOrchestrator();

    await assert.rejects(
      () =>
        orchestrator.executeResourceSettlementFlow({
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: "quota-missing",
        }),
      /Unknown resource quota/
    );
  });

  test("stops before resource settlement when approval is cancelled", async () => {
    let usageCalls = 0;
    let settlementCalls = 0;

    const orchestrator = createMockResourceFlowOrchestrator(
      createMockAfalPorts({
        trustedSurface: {
          requestApproval: async (context) => ({
            ...resourceFlowFixtures.approvalResult,
            challengeRef: context.challengeRef,
            actionRef: context.actionRef,
            result: "cancelled",
            approvalReceiptRef: undefined,
            comment: "Approval cancelled in negative-path test",
          }),
        },
        resourceSettlement: {
          confirmResourceUsage: async (intent) => {
            usageCalls += 1;
            return {
              ...resourceFlowFixtures.providerUsageConfirmation,
              providerId: intent.provider.providerId,
              providerDid: intent.provider.providerDid,
            };
          },
          settleResourceUsage: async () => {
            settlementCalls += 1;
            return resourceFlowFixtures.settlementRecord;
          },
        },
      })
    );

    await assert.rejects(
      () =>
        orchestrator.executeResourceSettlementFlow({
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        }),
      /authorization result was "rejected"/
    );

    assert.equal(usageCalls, 0);
    assert.equal(settlementCalls, 0);
  });

  test("propagates provider usage confirmation failure and skips resource settlement", async () => {
    let settlementCalls = 0;

    const orchestrator = createMockResourceFlowOrchestrator(
      createMockAfalPorts({
        resourceSettlement: {
          confirmResourceUsage: async () => {
            throw new Error("Provider usage confirmation failed");
          },
          settleResourceUsage: async () => {
            settlementCalls += 1;
            return resourceFlowFixtures.settlementRecord;
          },
        },
      })
    );

    await assert.rejects(
      () =>
        orchestrator.executeResourceSettlementFlow({
          requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
          intent: resourceFlowFixtures.resourceIntentCreated,
          resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
          resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
        }),
      /Provider usage confirmation failed/
    );

    assert.equal(settlementCalls, 0);
  });
});
