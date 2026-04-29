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
import { ERC20_TRANSFER_TOPIC, JsonRpcWalletPaymentVerifier } from "./onchain-verifier";

const PAYMENT_RAIL_SERVICE_TOKEN = "payment-rail-secret";
const AFAL_EXTERNAL_SERVICE_ID = "afal-runtime";
const PAYMENT_RAIL_SIGNING_KEY = "payment-rail-signing-secret";
const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_CHAIN_ID_HEX = "0x14a34";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const WALLET_FROM = "0x1111111111111111111111111111111111111111";
const WALLET_PAYEE = "0x2222222222222222222222222222222222222222";
const WALLET_TX_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const walletPaymentIntent = {
  ...paymentFlowFixtures.paymentIntentCreated,
  payee: {
    ...paymentFlowFixtures.paymentIntentCreated.payee,
    settlementAddress: WALLET_PAYEE,
  },
  amount: "0.01",
  chain: "base-sepolia",
};

function indexedAddress(address: string): string {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

function jsonRpcResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function createReceiptFetch(options?: {
  txHash?: string;
  from?: string;
  to?: string;
  tokenAddress?: string;
  amountData?: string;
  status?: string;
}): typeof fetch {
  return async (_input, init) => {
    const body = JSON.parse(init?.body?.toString() ?? "{}") as {
      id: number;
      method: string;
    };
    if (body.method === "eth_chainId") {
      return jsonRpcResponse({
        jsonrpc: "2.0",
        id: body.id,
        result: BASE_SEPOLIA_CHAIN_ID_HEX,
      });
    }
    if (body.method === "eth_getTransactionReceipt") {
      return jsonRpcResponse({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          transactionHash: options?.txHash ?? WALLET_TX_HASH,
          status: options?.status ?? "0x1",
          blockNumber: "0x123",
          logs: [
            {
              address: options?.tokenAddress ?? BASE_SEPOLIA_USDC,
              topics: [
                ERC20_TRANSFER_TOPIC,
                indexedAddress(options?.from ?? WALLET_FROM),
                indexedAddress(options?.to ?? WALLET_PAYEE),
              ],
              data: options?.amountData ?? "0x2710",
            },
          ],
        },
      });
    }
    return jsonRpcResponse({
      jsonrpc: "2.0",
      id: body.id,
      error: {
        code: -32601,
        message: `unsupported method ${body.method}`,
      },
    });
  };
}

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
  const pageHeaders = page.headers as Record<string, string>;
  const scriptHeaders = script.headers as Record<string, string>;

  assert.equal(page.statusCode, 200);
  assert.match(page.bodyText, /AFAL MetaMask Payment Demo/);
  assert.match(page.bodyText, /Base Sepolia USDC/);
  assert.match(pageHeaders["cache-control"], /no-store/);
  assert.equal(script.statusCode, 200);
  assert.match(scriptHeaders["cache-control"], /no-store/);
  assert.match(script.bodyText, /wallet_switchEthereumChain/);
  assert.match(script.bodyText, /wallet-payments\/confirm/);
  assert.match(script.bodyText, /BASE_SEPOLIA_USDC/);
  assert.match(script.bodyText, /Invalid token address/);
  assert.match(script.bodyText, /resetToken/);
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
          intent: walletPaymentIntent,
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
          actionRef: walletPaymentIntent.intentId,
          txHash: "0xwalletconfirmed",
          from: WALLET_FROM,
          to: WALLET_PAYEE,
          tokenAddress: BASE_SEPOLIA_USDC,
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: BASE_SEPOLIA_CHAIN_ID,
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
          intent: walletPaymentIntent,
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
  assert.equal(parsed.data.destination.settlementAddress, WALLET_PAYEE);
});

test("payment rail service verifies wallet confirmations against an onchain ERC-20 Transfer receipt", async () => {
  const state = createPaymentRailServiceState({
    walletVerifier: new JsonRpcWalletPaymentVerifier({
      rpcUrl: "http://base-sepolia-rpc.test",
      fetchImpl: createReceiptFetch(),
      now: () => new Date("2026-04-27T04:01:00Z"),
    }),
  });

  const confirmation = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment,
      bodyText: JSON.stringify({
        requestRef: "req-wallet-confirm-payint-0001",
        input: {
          actionRef: walletPaymentIntent.intentId,
          txHash: WALLET_TX_HASH,
          from: WALLET_FROM,
          to: WALLET_PAYEE,
          tokenAddress: BASE_SEPOLIA_USDC,
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: BASE_SEPOLIA_CHAIN_ID,
        },
      }),
    },
    state
  );
  const parsed = JSON.parse(confirmation.bodyText) as {
    ok: true;
    data: {
      verification: {
        ok: true;
        chainId: number;
        txHash: string;
        logIndex: number;
      };
    };
  };

  assert.equal(confirmation.statusCode, 200);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.verification.ok, true);
  assert.equal(parsed.data.verification.chainId, BASE_SEPOLIA_CHAIN_ID);
  assert.equal(parsed.data.verification.txHash, WALLET_TX_HASH);
  assert.equal(parsed.data.verification.logIndex, 0);
});

test("payment rail service rejects wallet confirmations without a matching onchain transfer", async () => {
  const state = createPaymentRailServiceState({
    walletVerifier: new JsonRpcWalletPaymentVerifier({
      rpcUrl: "http://base-sepolia-rpc.test",
      fetchImpl: createReceiptFetch({
        amountData: "0x270f",
      }),
    }),
  });

  const confirmation = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment,
      bodyText: JSON.stringify({
        requestRef: "req-wallet-confirm-payint-0001",
        input: {
          actionRef: walletPaymentIntent.intentId,
          txHash: WALLET_TX_HASH,
          from: WALLET_FROM,
          to: WALLET_PAYEE,
          tokenAddress: BASE_SEPOLIA_USDC,
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: BASE_SEPOLIA_CHAIN_ID,
        },
      }),
    },
    state
  );

  assert.equal(confirmation.statusCode, 422);
  assert.match(confirmation.bodyText, /wallet-transfer-verification-failed/);
  assert.match(confirmation.bodyText, /expected ERC-20 Transfer event/);
});

test("payment rail service rejects reused wallet tx hashes for different actions", async () => {
  const state = createPaymentRailServiceState();

  const first = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment,
      bodyText: JSON.stringify({
        requestRef: "req-wallet-confirm-payint-0001",
        input: {
          actionRef: "payint-0001",
          txHash: WALLET_TX_HASH,
          from: WALLET_FROM,
          to: WALLET_PAYEE,
          tokenAddress: BASE_SEPOLIA_USDC,
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: BASE_SEPOLIA_CHAIN_ID,
        },
      }),
    },
    state
  );
  const second = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment,
      bodyText: JSON.stringify({
        requestRef: "req-wallet-confirm-payint-0002",
        input: {
          actionRef: "payint-0002",
          txHash: WALLET_TX_HASH,
          from: WALLET_FROM,
          to: WALLET_PAYEE,
          tokenAddress: BASE_SEPOLIA_USDC,
          amount: "0.01",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: BASE_SEPOLIA_CHAIN_ID,
        },
      }),
    },
    state
  );

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 409);
  assert.match(second.bodyText, /wallet-transfer-replay/);
});

test("payment rail service rejects wallet settlements that do not match the AFAL intent", async () => {
  const state = createPaymentRailServiceState({
    requireWalletConfirmation: true,
  });

  const confirmation = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.confirmWalletPayment,
      bodyText: JSON.stringify({
        requestRef: "req-wallet-confirm-payint-0001",
        input: {
          actionRef: walletPaymentIntent.intentId,
          txHash: WALLET_TX_HASH,
          from: WALLET_FROM,
          to: WALLET_PAYEE,
          tokenAddress: BASE_SEPOLIA_USDC,
          amount: "0.02",
          asset: "USDC",
          chain: "base-sepolia",
          chainId: BASE_SEPOLIA_CHAIN_ID,
        },
      }),
    },
    state
  );
  const settled = await handlePaymentRailNodeHttpRequest(
    {
      method: "POST",
      url: PAYMENT_RAIL_SERVICE_ROUTES.executePayment,
      bodyText: JSON.stringify({
        requestRef: "req-payment-rail-payint-0001",
        input: {
          intent: walletPaymentIntent,
          decision: paymentFlowFixtures.authorizationDecisionFinal,
        },
      }),
    },
    state
  );

  assert.equal(confirmation.statusCode, 200);
  assert.equal(settled.statusCode, 500);
  assert.match(settled.bodyText, /does not match intent amount/);
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
