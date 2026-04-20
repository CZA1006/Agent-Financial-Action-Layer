import { AFAL_HTTP_ROUTES } from "../../backend/afal/http/types";
import { resourceFlowFixtures } from "../../sdk/fixtures";
import { createSignedHeaders, getSandboxConfig, postJson } from "./common";

async function main(): Promise<void> {
  const requestRef = `req-sample-resource-${Date.now()}`;
  const { baseUrl, clientId, signingKey } = getSandboxConfig();

  const requestBody = {
    requestRef,
    input: {
      requestRef,
      intent: resourceFlowFixtures.resourceIntentCreated,
      resourceBudgetRef:
        process.env.AFAL_RESOURCE_BUDGET_REF ??
        resourceFlowFixtures.resourceBudgetInitial.budgetId,
      resourceQuotaRef:
        process.env.AFAL_RESOURCE_QUOTA_REF ??
        resourceFlowFixtures.resourceQuotaInitial.quotaId,
    },
  };

  const response = await postJson(
    `${baseUrl}${AFAL_HTTP_ROUTES.requestResourceApproval}`,
    requestBody,
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  console.log(JSON.stringify(response, null, 2));
}

void main();
