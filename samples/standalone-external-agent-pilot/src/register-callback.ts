import { getSandboxConfig, createSignedHeaders, loadEnvFileIfPresent, postJson, printJson } from "./common";
import { AFAL_ROUTES } from "./routes";

async function main(): Promise<void> {
  await loadEnvFileIfPresent();
  const requestRef = `req-standalone-callback-register-${Date.now()}`;
  const { baseUrl, clientId, signingKey } = getSandboxConfig();

  const response = await postJson(
    `${baseUrl}${AFAL_ROUTES.registerCallback}`,
    {
      requestRef,
      input: {
        paymentSettlementUrl: process.env.AFAL_PAYMENT_CALLBACK_URL,
        resourceSettlementUrl: process.env.AFAL_RESOURCE_CALLBACK_URL,
      },
    },
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  await printJson(response);
}

await main();
