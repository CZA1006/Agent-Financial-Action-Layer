import { pathToFileURL } from "node:url";
import { join } from "node:path";

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

export interface ExternalAdapterDemoResult {
  summary: {
    dataDir: string;
    paymentRailUrl: string;
    providerServiceUrl: string;
    integrationDb: string;
    payment: {
      actionRef: string;
      settlementRef: string;
      receiptRef: string;
    };
    resource: {
      actionRef: string;
      usageReceiptRef: string;
      settlementRef: string;
      receiptRef: string;
    };
  };
}

export async function runExternalAdapterDemo(dataDir: string): Promise<ExternalAdapterDemoResult> {
  const paymentRail = await startPaymentRailStubServer({
    port: 0,
    auth: {
      token: PAYMENT_RAIL_SERVICE_TOKEN,
      signingKey: PAYMENT_RAIL_SIGNING_KEY,
    },
  });
  const providerService = await startProviderServiceStubServer({
    port: 0,
    auth: {
      token: PROVIDER_SERVICE_TOKEN,
      signingKey: PROVIDER_SERVICE_SIGNING_KEY,
    },
  });

  try {
    const bundle = createSeededSqliteAfalBundle(dataDir, {
      paymentAdapter: new HttpPaymentRailAdapter({
        baseUrl: paymentRail.url,
        auth: {
          token: PAYMENT_RAIL_SERVICE_TOKEN,
          serviceId: AFAL_EXTERNAL_SERVICE_ID,
          signingKey: PAYMENT_RAIL_SIGNING_KEY,
        },
      }),
      resourceAdapter: new HttpResourceProviderAdapter({
        baseUrl: providerService.url,
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
        payment: {
          actionRef: payment.intent.intentId,
          settlementRef: payment.settlement.settlementId,
          receiptRef: payment.paymentReceipt.receiptId,
        },
        resource: {
          actionRef: resource.intent.intentId,
          usageReceiptRef: resource.usageConfirmation.usageReceiptRef,
          settlementRef: resource.settlement.settlementId,
          receiptRef: resource.resourceReceipt.receiptId,
        },
      },
    };
  } finally {
    await paymentRail.close();
    await providerService.close();
  }
}

async function main(): Promise<void> {
  const dataDir = process.argv[2] ?? join(process.cwd(), ".afal-external-adapter-data");
  const result = await runExternalAdapterDemo(dataDir);
  console.log(JSON.stringify(result.summary, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
