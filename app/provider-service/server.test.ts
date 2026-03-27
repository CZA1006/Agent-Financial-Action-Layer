import assert from "node:assert/strict";
import { test } from "node:test";

import { resourceFlowFixtures } from "../../sdk/fixtures";
import {
  ExternalAdapterRequestError,
  HttpResourceProviderAdapter,
} from "../../backend/afal/settlement/http-adapters";
import {
  PROVIDER_SERVICE_ROUTES,
  createProviderServiceState,
  handleProviderServiceNodeHttpRequest,
} from "./server";

const PROVIDER_SERVICE_TOKEN = "provider-service-secret";
const AFAL_EXTERNAL_SERVICE_ID = "afal-runtime";
const PROVIDER_SERVICE_SIGNING_KEY = "provider-service-signing-secret";

test("provider service exposes health and executes canonical usage confirmation and settlement", async () => {
  const health = await handleProviderServiceNodeHttpRequest({
    method: "GET",
    url: PROVIDER_SERVICE_ROUTES.health,
  });
  assert.equal(health.statusCode, 200);

  const adapter = new HttpResourceProviderAdapter({
    baseUrl: "http://provider.test",
    fetchImpl: async (input, init) => {
      const url = new URL(String(input));
      const result = await handleProviderServiceNodeHttpRequest({
        method: init?.method,
        url: url.pathname,
        bodyText: init?.body?.toString(),
      });
      return new Response(result.bodyText, {
        status: result.statusCode,
        headers: result.headers,
      });
    },
  });

  const usage = await adapter.confirmResourceUsage(resourceFlowFixtures.resourceIntentCreated);
  const settlement = await adapter.settleResourceUsage({
    intent: resourceFlowFixtures.resourceIntentCreated,
    decision: resourceFlowFixtures.authorizationDecisionFinal,
    usage,
  });

  assert.equal(
    usage.usageReceiptRef,
    resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
  );
  assert.equal(settlement.settlementId, resourceFlowFixtures.settlementRecord.settlementId);
});

test("provider service requires the configured shared token", async () => {
  const state = createProviderServiceState();

  const unauthorized = await handleProviderServiceNodeHttpRequest(
    {
      method: "POST",
      url: PROVIDER_SERVICE_ROUTES.confirmUsage,
      bodyText: JSON.stringify({
        requestRef: "req-provider-usage-resint-0001",
        input: {
          intent: resourceFlowFixtures.resourceIntentCreated,
        },
      }),
      headers: {},
    },
    state,
    {
      token: PROVIDER_SERVICE_TOKEN,
      signingKey: PROVIDER_SERVICE_SIGNING_KEY,
    }
  );

  assert.equal(unauthorized.statusCode, 403);

  const adapter = new HttpResourceProviderAdapter({
    baseUrl: "http://provider.test",
    auth: {
      token: PROVIDER_SERVICE_TOKEN,
      serviceId: AFAL_EXTERNAL_SERVICE_ID,
      signingKey: PROVIDER_SERVICE_SIGNING_KEY,
    },
    fetchImpl: async (input, init) => {
      const url = new URL(String(input));
      const result = await handleProviderServiceNodeHttpRequest(
        {
          method: init?.method,
          url: url.pathname,
          bodyText: init?.body?.toString(),
          headers: Object.fromEntries(
            Object.entries(init?.headers as Record<string, string> | undefined ?? {}).map(
              ([key, value]) => [key.toLowerCase(), value]
            )
          ),
        },
        state,
        {
          token: PROVIDER_SERVICE_TOKEN,
          signingKey: PROVIDER_SERVICE_SIGNING_KEY,
        }
      );
      return new Response(result.bodyText, {
        status: result.statusCode,
        headers: result.headers,
      });
    },
  });

  const usage = await adapter.confirmResourceUsage(resourceFlowFixtures.resourceIntentCreated);

  assert.equal(
    usage.usageReceiptRef,
    resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
  );
});

test("provider service rejects invalid request signatures", async () => {
  const state = createProviderServiceState();
  const invalid = await handleProviderServiceNodeHttpRequest(
    {
      method: "POST",
      url: PROVIDER_SERVICE_ROUTES.confirmUsage,
      bodyText: JSON.stringify({
        requestRef: "req-provider-usage-resint-0001",
        input: {
          intent: resourceFlowFixtures.resourceIntentCreated,
        },
      }),
      headers: {
        "x-afal-service-token": PROVIDER_SERVICE_TOKEN,
        "x-afal-service-id": AFAL_EXTERNAL_SERVICE_ID,
        "x-afal-request-timestamp": "2026-03-27T12:00:00Z",
        "x-afal-request-signature": "invalid-signature",
      },
    },
    state,
    {
      token: PROVIDER_SERVICE_TOKEN,
      signingKey: PROVIDER_SERVICE_SIGNING_KEY,
    }
  );

  assert.equal(invalid.statusCode, 403);
  assert.match(invalid.bodyText, /service-signature-invalid/);
});

test("provider adapter retries transient usage and settlement failures", async () => {
  const state = createProviderServiceState({
    confirmUsageFailuresBeforeSuccess: 1,
    settleResourceUsageFailuresBeforeSuccess: 1,
  });
  const adapter = new HttpResourceProviderAdapter({
    baseUrl: "http://provider.test",
    retry: {
      maxAttempts: 2,
      backoffMs: 0,
    },
    fetchImpl: async (input, init) => {
      const url = new URL(String(input));
      const result = await handleProviderServiceNodeHttpRequest(
        {
          method: init?.method,
          url: url.pathname,
          bodyText: init?.body?.toString(),
        },
        state
      );
      return new Response(result.bodyText, {
        status: result.statusCode,
        headers: result.headers,
      });
    },
  });

  const usage = await adapter.confirmResourceUsage(resourceFlowFixtures.resourceIntentCreated);
  const settlement = await adapter.settleResourceUsage({
    intent: resourceFlowFixtures.resourceIntentCreated,
    decision: resourceFlowFixtures.authorizationDecisionFinal,
    usage,
  });

  assert.equal(
    usage.usageReceiptRef,
    resourceFlowFixtures.providerUsageConfirmation.usageReceiptRef
  );
  assert.equal(settlement.settlementId, resourceFlowFixtures.settlementRecord.settlementId);
  assert.equal(state.confirmUsageAttempts, 2);
  assert.equal(state.settleResourceUsageAttempts, 2);
});

test("provider adapter does not retry non-retryable external failures", async () => {
  let calls = 0;
  const adapter = new HttpResourceProviderAdapter({
    baseUrl: "http://provider.test",
    retry: {
      maxAttempts: 3,
      backoffMs: 0,
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          ok: false,
          requestRef: "req-provider-usage-resint-0001",
          statusCode: 409,
          error: {
            code: "quota-closed",
            message: "provider quota is closed",
          },
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    },
  });

  await assert.rejects(
    adapter.confirmResourceUsage(resourceFlowFixtures.resourceIntentCreated),
    (error) =>
      error instanceof ExternalAdapterRequestError &&
      error.statusCode === 409 &&
      error.code === "quota-closed"
  );
  assert.equal(calls, 1);
});
