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

test("payment rail service exposes the MetaMask wallet demo surface", async () => {
  const page = await handlePaymentRailNodeHttpRequest({
    method: "GET",
    url: PAYMENT_RAIL_SERVICE_ROUTES.walletDemo,
  });
  const script = await handlePaymentRailNodeHttpRequest({
    method: "GET",
    url: PAYMENT_RAIL_SERVICE_ROUTES.walletDemoScript,
  });

  assert.equal(page.statusCode, 200);
  assert.match(page.bodyText, /AFAL MetaMask Payment Demo/);
  assert.match(page.bodyText, /Base Sepolia USDC/);
  assert.equal(script.statusCode, 200);
  assert.match(script.bodyText, /wallet_switchEthereumChain/);
  assert.match(script.bodyText, /wallet-payments\/confirm/);
});

test("payment rail service records a wallet confirmation and settles with its tx hash", async () => {
  const state = createPaymentRailServiceState({
    requireWalletConfirmation: true,
  });

  const missing = await handlePaymentRailNodeHttpRequest(
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
    },
    state
  );

  assert.equal(missing.statusCode, 409);
  assert.match(missing.bodyText, /wallet-transfer-not-confirmed/);

  const confirmation = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment,
      bodyText: JSON.stringify({
        requestRef: "req-wallet-confirm-payint-0001",
        input: {
          actionRef: paymentFlowFixtures.paymentIntentCreated.intentId,
          txHash: "0xwalletconfirmed",
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: 84532,
          confirmedAt: "2026-04-27T04:00:00Z",
        },
      }),
    },
    state
  );

  assert.equal(confirmation.statusCode, 200);

  const settled = await handlePaymentRailNodeHttpRequest(
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
    },
    state
  );
  const parsed = JSON.parse(settled.bodyText) as {
    ok: true;
    data: {
      txHash: string;
      amount: string;
      chain: string;
      destination: {
        settlementAddress?: string;
      };
    };
  };

  assert.equal(settled.statusCode, 200);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.txHash, "0xwalletconfirmed");
  assert.equal(parsed.data.amount, "0.01");
  assert.equal(parsed.data.chain, "base-sepolia");
  assert.equal(parsed.data.destination.settlementAddress, "0x2222222222222222222222222222222222222222");
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
