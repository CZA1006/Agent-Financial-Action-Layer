import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { createSignedHeaders, getSandboxConfig, postJson } from "./common";

async function main(): Promise<void> {
  const requestRef = `req-sample-payment-${Date.now()}`;
  const { baseUrl, clientId, signingKey } = getSandboxConfig();

  const requestBody = {
    requestRef,
    input: {
      requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef:
        process.env.AFAL_MONETARY_BUDGET_REF ??
        paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  };

  const response = await postJson(
    `${baseUrl}${AFAL_HTTP_ROUTES.requestPaymentApproval}`,
    requestBody,
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  console.log(JSON.stringify(response, null, 2));
}

void main();
