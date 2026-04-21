import { getSandboxConfig, createSignedHeaders, loadEnvFileIfPresent, postJson, printJson } from "./common";
import { AFAL_ROUTES } from "./routes";

async function main(): Promise<void> {
  await loadEnvFileIfPresent();
  const requestRef = `req-standalone-callback-get-${Date.now()}`;
  const { baseUrl, clientId, signingKey } = getSandboxConfig();

  const response = await postJson(
    `${baseUrl}${AFAL_ROUTES.getCallback}`,
    {
      requestRef,
      input: {},
    },
    createSignedHeaders({ clientId, signingKey, requestRef })
  );

  await printJson(response);
}

await main();
