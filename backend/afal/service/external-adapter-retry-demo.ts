import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  HttpPaymentRailAdapter,
  HttpResourceProviderAdapter,
} from "../settlement/http-adapters";
import { createSeededSqliteAfalBundle, getSeededSqliteAfalPaths } from "./sqlite";
import { startPaymentRailStubServer } from "../../../app/payment-rail/server";
import { startProviderServiceStubServer } from "../../../app/provider-service/server";

const PAYMENT_RAIL_SERVICE_TOKEN = "payment-rail-secret";
const PROVIDER_SERVICE_TOKEN = "provider-service-secret";
const AFAL_EXTERNAL_SERVICE_ID = "afal-runtime";
const PAYMENT_RAIL_SIGNING_KEY = "payment-rail-signing-secret";
const PROVIDER_SERVICE_SIGNING_KEY = "provider-service-signing-secret";

export interface ExternalAdapterRetryDemoResult {
  summary: {
    dataDir: string;
    paymentRailUrl: string;
    providerServiceUrl: string;
    integrationDb: string;
    paymentRailAttempts: number;
    providerUsageAttempts: number;
    providerSettlementAttempts: number;
    paymentSettlementRef: string;
    resourceSettlementRef: string;
  };
}

export async function runExternalAdapterRetryDemo(
  dataDir: string
): Promise<ExternalAdapterRetryDemoResult> {
  const paymentRail = await startPaymentRailStubServer({
    port: 0,
    failurePlan: {
      executePaymentFailuresBeforeSuccess: 1,
    },
    auth: {
      token: PAYMENT_RAIL_SERVICE_TOKEN,
      signingKey: PAYMENT_RAIL_SIGNING_KEY,
    },
  });
  const providerService = await startProviderServiceStubServer({
    port: 0,
    failurePlan: {
      confirmUsageFailuresBeforeSuccess: 1,
      settleResourceUsageFailuresBeforeSuccess: 1,
    },
    auth: {
      token: PROVIDER_SERVICE_TOKEN,
      signingKey: PROVIDER_SERVICE_SIGNING_KEY,
    },
  });

  try {
    const bundle = createSeededSqliteAfalBundle(dataDir, {
      paymentAdapter: new HttpPaymentRailAdapter({
        baseUrl: paymentRail.url,
        retry: {
          maxAttempts: 3,
          backoffMs: 0,
        },
        auth: {
          token: PAYMENT_RAIL_SERVICE_TOKEN,
          serviceId: AFAL_EXTERNAL_SERVICE_ID,
          signingKey: PAYMENT_RAIL_SIGNING_KEY,
        },
      }),
      resourceAdapter: new HttpResourceProviderAdapter({
        baseUrl: providerService.url,
        retry: {
          maxAttempts: 3,
          backoffMs: 0,
        },
        auth: {
          token: PROVIDER_SERVICE_TOKEN,
          serviceId: AFAL_EXTERNAL_SERVICE_ID,
          signingKey: PROVIDER_SERVICE_SIGNING_KEY,
        },
      }),
    });

    const payment = await bundle.runtime.executePayment({
      capability: "executePayment",
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        intent: paymentFlowFixtures.paymentIntentCreated,
        monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
      },
    });

    const resource = await bundle.runtime.settleResourceUsage({
      capability: "settleResourceUsage",
      requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
      input: {
        requestRef: resourceFlowFixtures.capabilityResponse.requestRef,
        intent: resourceFlowFixtures.resourceIntentCreated,
        resourceBudgetRef: resourceFlowFixtures.resourceBudgetInitial.budgetId,
        resourceQuotaRef: resourceFlowFixtures.resourceQuotaInitial.quotaId,
      },
    });

    return {
      summary: {
        dataDir,
        paymentRailUrl: paymentRail.url,
        providerServiceUrl: providerService.url,
        integrationDb: getSeededSqliteAfalPaths(dataDir).integrationDb,
        paymentRailAttempts: paymentRail.state.executePaymentAttempts,
        providerUsageAttempts: providerService.state.confirmUsageAttempts,
        providerSettlementAttempts: providerService.state.settleResourceUsageAttempts,
        paymentSettlementRef: payment.settlement.settlementId,
        resourceSettlementRef: resource.settlement.settlementId,
      },
    };
  } finally {
    await paymentRail.close();
    await providerService.close();
  }
}

async function main(): Promise<void> {
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-external-adapter-retry-data");
  const result = await runExternalAdapterRetryDemo(dataDir);
  console.log(JSON.stringify(result.summary, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
