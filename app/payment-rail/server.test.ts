import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../sdk/fixtures";
import {
  ExternalAdapterRequestError,
  HttpPaymentRailAdapter,
} from "../../backend/afal/settlement/http-adapters";
import {
  PAYMENT_RAIL_SERVICE_ROUTES,
  createPaymentRailServiceState,
  handlePaymentRailNodeHttpRequest,
} from "./server";

const PAYMENT_RAIL_SERVICE_TOKEN = "payment-rail-secret";
const AFAL_EXTERNAL_SERVICE_ID = "afal-runtime";
const PAYMENT_RAIL_SIGNING_KEY = "payment-rail-signing-secret";

test("payment rail service exposes health and executes the canonical payment settlement", async () => {
  const health = await handlePaymentRailNodeHttpRequest({
    method: "GET",
    url: PAYMENT_RAIL_SERVICE_ROUTES.health,
  });
  assert.equal(health.statusCode, 200);

  const adapter = new HttpPaymentRailAdapter({
    baseUrl: "http://payment-rail.test",
    fetchImpl: async (_input, init) => {
      const result = await handlePaymentRailNodeHttpRequest({
        method: init?.method,
        url: PAYMENT_RAIL_SERVICE_ROUTES.executePayment,
        bodyText: init?.body?.toString(),
      });
      return new Response(result.bodyText, {
        status: result.statusCode,
        headers: result.headers,
      });
    },
  });

  const settlement = await adapter.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );

  assert.equal(settlement.settlementId, paymentFlowFixtures.settlementRecord.settlementId);
});

test("payment rail service requires the configured shared token", async () => {
  const state = createPaymentRailServiceState();

  const unauthorized = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.executePayment,
      bodyText: JSON.stringify({
        requestRef: "req-payment-rail-payint-0001",
        input: {
          intent: paymentFlowFixtures.paymentIntentCreated,
          decision: paymentFlowFixtures.authorizationDecisionFinal,
        },
      }),
      headers: {},
    },
    state,
    {
      token: PAYMENT_RAIL_SERVICE_TOKEN,
      signingKey: PAYMENT_RAIL_SIGNING_KEY,
    }
  );

  assert.equal(unauthorized.statusCode, 403);

  const adapter = new HttpPaymentRailAdapter({
    baseUrl: "http://payment-rail.test",
    auth: {
      token: PAYMENT_RAIL_SERVICE_TOKEN,
      serviceId: AFAL_EXTERNAL_SERVICE_ID,
      signingKey: PAYMENT_RAIL_SIGNING_KEY,
    },
    fetchImpl: async (_input, init) => {
      const result = await handlePaymentRailNodeHttpRequest(
        {
          method: init?.method,
          url: PAYMENT_RAIL_SERVICE_ROUTES.executePayment,
          bodyText: init?.body?.toString(),
          headers: Object.fromEntries(
            Object.entries(init?.headers as Record<string, string> | undefined ?? {}).map(
              ([key, value]) => [key.toLowerCase(), value]
            )
          ),
        },
        state,
        {
          token: PAYMENT_RAIL_SERVICE_TOKEN,
          signingKey: PAYMENT_RAIL_SIGNING_KEY,
        }
      );
      return new Response(result.bodyText, {
        status: result.statusCode,
        headers: result.headers,
      });
    },
  });

  const settlement = await adapter.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );

  assert.equal(settlement.settlementId, paymentFlowFixtures.settlementRecord.settlementId);
});

test("payment rail service rejects invalid request signatures", async () => {
  const state = createPaymentRailServiceState();
  const invalid = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.executePayment,
      bodyText: JSON.stringify({
        requestRef: "req-payment-rail-payint-0001",
        input: {
          intent: paymentFlowFixtures.paymentIntentCreated,
          decision: paymentFlowFixtures.authorizationDecisionFinal,
        },
      }),
      headers: {
        "x-afal-service-token": PAYMENT_RAIL_SERVICE_TOKEN,
        "x-afal-service-id": AFAL_EXTERNAL_SERVICE_ID,
        "x-afal-request-timestamp": "2026-03-27T12:00:00Z",
        "x-afal-request-signature": "invalid-signature",
      },
    },
    state,
    {
      token: PAYMENT_RAIL_SERVICE_TOKEN,
      signingKey: PAYMENT_RAIL_SIGNING_KEY,
    }
  );

  assert.equal(invalid.statusCode, 403);
  assert.match(invalid.bodyText, /service-signature-invalid/);
});

test("payment rail adapter retries transient failures from the external service", async () => {
  const state = createPaymentRailServiceState({
    executePaymentFailuresBeforeSuccess: 1,
  });
  const adapter = new HttpPaymentRailAdapter({
    baseUrl: "http://payment-rail.test",
    retry: {
      maxAttempts: 2,
      backoffMs: 0,
    },
    fetchImpl: async (_input, init) => {
      const result = await handlePaymentRailNodeHttpRequest(
        {
          method: init?.method,
          url: PAYMENT_RAIL_SERVICE_ROUTES.executePayment,
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

  const settlement = await adapter.executePayment(
    paymentFlowFixtures.paymentIntentCreated,
    paymentFlowFixtures.authorizationDecisionFinal
  );

  assert.equal(settlement.settlementId, paymentFlowFixtures.settlementRecord.settlementId);
  assert.equal(state.executePaymentAttempts, 2);
  assert.equal(state.executePaymentFailuresRemaining, 0);
});

test("payment rail adapter does not retry non-retryable external failures", async () => {
  let calls = 0;
  const adapter = new HttpPaymentRailAdapter({
    baseUrl: "http://payment-rail.test",
    retry: {
      maxAttempts: 3,
      backoffMs: 0,
    },
    fetchImpl: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          ok: false,
          requestRef: "req-payment-rail-payint-0001",
          statusCode: 409,
          error: {
            code: "counterparty-rejected",
            message: "counterparty rejected settlement",
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
    adapter.executePayment(
      paymentFlowFixtures.paymentIntentCreated,
      paymentFlowFixtures.authorizationDecisionFinal
    ),
    (error) =>
      error instanceof ExternalAdapterRequestError &&
      error.statusCode === 409 &&
      error.code === "counterparty-rejected"
  );
  assert.equal(calls, 1);
});
