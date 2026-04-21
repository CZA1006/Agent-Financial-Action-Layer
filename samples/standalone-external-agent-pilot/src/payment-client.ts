import { createSignedHeaders, getSandboxConfig, loadEnvFileIfPresent, postJson, printJson } from "./common";
import { createPaymentRequestTemplate } from "./fixtures";
import { AFAL_ROUTES } from "./routes";

async function main(): Promise<void> {
  await loadEnvFileIfPresent();
  const requestRef = `req-standalone-payment-${Date.now()}`;
  const { baseUrl, clientId, signingKey } = getSandboxConfig();
  const paymentRequestTemplate = createPaymentRequestTemplate();

  const requestBody = {
    ...paymentRequestTemplate,
    requestRef,
    input: {
      ...paymentRequestTemplate.input,
      requestRef,
      intent: {
        ...paymentRequestTemplate.input.intent,
      },
    },
  };

  const response = await postJson(
    `${baseUrl}${AFAL_ROUTES.requestPaymentApproval}`,
    requestBody,
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  await printJson(response);
}

await main();
