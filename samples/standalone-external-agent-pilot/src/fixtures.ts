export function createPaymentRequestTemplate() {
  return {
    requestRef: "req-standalone-payment",
    input: {
      requestRef: "req-standalone-payment",
      monetaryBudgetRef: process.env.AFAL_MONETARY_BUDGET_REF ?? "budg-money-001",
      intent: {
        intentId: "payint-standalone-0001",
        schemaVersion: "0.1",
        intentType: "payment",
        payer: {
          agentDid: "did:afal:agent:payment-agent-01",
          accountId: "acct-agent-001",
        },
        payee: {
          payeeDid: "did:afal:agent:fraud-service-01",
          settlementAddress: "0xFRAUDSERVICEPAYEE",
        },
        asset: "USDC",
        amount: "45.00",
        chain: "base",
        purpose: {
          category: "service-payment",
          description: "fraud detection request #standalone",
          referenceId: "svc-req-standalone",
        },
        mandateRef: "mnd-0001",
        policyRef: "cred-policy-0001",
        executionMode: "pre-authorized",
        challengeState: "required",
        status: "created",
        expiresAt: "2026-06-24T12:10:00Z",
        nonce: "n-standalone-0001",
        createdAt: "2026-06-24T12:05:00Z",
      },
    },
  };
}

export function createResourceRequestTemplate() {
  return {
    requestRef: "req-standalone-resource",
    input: {
      requestRef: "req-standalone-resource",
      resourceBudgetRef: process.env.AFAL_RESOURCE_BUDGET_REF ?? "budg-res-001",
      resourceQuotaRef: process.env.AFAL_RESOURCE_QUOTA_REF ?? "quota-001",
      intent: {
        intentId: "resint-standalone-0001",
        schemaVersion: "0.1",
        intentType: "resource",
        requester: {
          agentDid: "did:afal:agent:research-agent-01",
          accountId: "acct-agent-002",
        },
        provider: {
          providerId: "provider-openai",
          providerDid: "did:afal:institution:provider-openai",
        },
        resource: {
          resourceClass: "inference",
          resourceUnit: "tokens",
          quantity: 500000,
        },
        pricing: {
          maxSpend: "18.50",
          asset: "USDC",
        },
        budgetSource: {
          type: "ats-budget",
          reference: process.env.AFAL_RESOURCE_BUDGET_REF ?? "budg-res-001",
        },
        mandateRef: "mnd-0002",
        policyRef: "cred-policy-0002",
        executionMode: "pre-authorized",
        challengeState: "required",
        status: "created",
        expiresAt: "2026-06-24T12:30:00Z",
        nonce: "n-standalone-2001",
        createdAt: "2026-06-24T12:20:00Z",
      },
    },
  };
}
