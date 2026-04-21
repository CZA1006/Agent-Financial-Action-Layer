import { createSignedHeaders, getSandboxConfig, loadEnvFileIfPresent, postJson, printJson } from "./common";
import { createResourceRequestTemplate } from "./fixtures";
import { AFAL_ROUTES } from "./routes";

async function main(): Promise<void> {
  await loadEnvFileIfPresent();
  const requestRef = `req-standalone-resource-${Date.now()}`;
  const { baseUrl, clientId, signingKey } = getSandboxConfig();
  const resourceRequestTemplate = createResourceRequestTemplate();

  const requestBody = {
    ...resourceRequestTemplate,
    requestRef,
    input: {
      ...resourceRequestTemplate.input,
      requestRef,
      intent: {
        ...resourceRequestTemplate.input.intent,
      },
    },
  };

  const response = await postJson(
    `${baseUrl}${AFAL_ROUTES.requestResourceApproval}`,
    requestBody,
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  await printJson(response);
}

await main();
