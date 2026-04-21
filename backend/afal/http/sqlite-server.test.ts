import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { SqliteAtsStore } from "../../ats";
import { ExternalAgentClientService, SqliteExternalAgentClientStore } from "../clients";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { HttpSettlementNotificationPort } from "../notifications";
import { createSeededSqliteAfalHttpServer, handleAfalNodeHttpRequest } from "./sqlite-server";
import { AFAL_HTTP_ROUTES } from "./types";

test("SQLite AFAL HTTP server adapter executes payment flow and persists integration state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-sqlite-http-server-"));

  try {
    const sqlite = createSeededSqliteAfalHttpServer(dir);

    const response = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.executePayment,
      bodyText: JSON.stringify({
        requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
        input: {
          requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      }),
    });

    const parsed = JSON.parse(response.bodyText) as { ok: boolean };

    assert.equal(response.statusCode, 200);
    assert.equal(parsed.ok, true);

    const second = createSeededSqliteAfalHttpServer(dir);
    const atsStore = new SqliteAtsStore({ filePath: second.paths.ats });
    const outputStore = new JsonFileAfalOutputStore({ filePath: second.paths.afalOutputs });

    const budget = await atsStore.getMonetaryBudget(
      paymentFlowFixtures.monetaryBudgetInitial.budgetId
    );
    const receipt = await outputStore.getReceipt(paymentFlowFixtures.paymentReceipt.receiptId);

    assert.equal(budget?.consumedAmount, paymentFlowFixtures.monetaryBudgetFinal.consumedAmount);
    assert.equal(receipt?.receiptId, paymentFlowFixtures.paymentReceipt.receiptId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SQLite AFAL HTTP server adapter rejects invalid JSON request bodies", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-sqlite-http-server-"));

  try {
    const sqlite = createSeededSqliteAfalHttpServer(dir);
    const response = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.executePayment,
      bodyText: "{not-json",
    });

    const parsed = JSON.parse(response.bodyText) as {
      ok: boolean;
      error?: {
        code?: string;
      };
    };

    assert.equal(response.statusCode, 400);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error?.code, "bad-request");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SQLite AFAL HTTP server adapter enforces operator auth on notification admin routes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-sqlite-http-server-auth-"));

  try {
    const sqlite = createSeededSqliteAfalHttpServer(dir, {
      notifications: new HttpSettlementNotificationPort({
        paymentCallbackUrls: {
          [paymentFlowFixtures.paymentIntentCreated.payee.payeeDid]:
            "https://receiver.example/payment",
        },
        fetchImpl: async () => new Response(null, { status: 202 }),
      }),
      notificationWorker: {
        start: false,
      },
      operatorAuth: {
        token: "operator-secret",
      },
    });

    const unauthorized = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.listNotificationDeliveries,
      bodyText: JSON.stringify({
        requestRef: "req-http-notification-list-auth-server-001",
        input: {},
      }),
    });
    const authorized = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.listNotificationDeliveries,
      headers: {
        "x-afal-operator-token": "operator-secret",
      },
      bodyText: JSON.stringify({
        requestRef: "req-http-notification-list-auth-server-002",
        input: {},
      }),
    });

    const unauthorizedBody = JSON.parse(unauthorized.bodyText) as {
      ok: boolean;
      error?: { code?: string };
    };
    const authorizedBody = JSON.parse(authorized.bodyText) as { ok: boolean };

    assert.equal(unauthorized.statusCode, 403);
    assert.equal(unauthorizedBody.ok, false);
    assert.equal(unauthorizedBody.error?.code, "operator-auth-required");
    assert.equal(authorized.statusCode, 200);
    assert.equal(authorizedBody.ok, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SQLite AFAL HTTP server adapter enforces external client auth on public routes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-sqlite-http-server-client-auth-"));

  try {
    const sqlite = createSeededSqliteAfalHttpServer(dir, {
      externalClientAuth: {
        enabled: true,
      },
    });
    const clientService = new ExternalAgentClientService({
      store: new SqliteExternalAgentClientStore({
        filePath: sqlite.paths.afalExternalClients,
        seed: {
          clients: [],
          replayRecords: [],
        },
      }),
      now: () => new Date("2026-03-30T00:00:10Z"),
    });
    await clientService.provisionClient({
      clientId: "client-sqlite-http-001",
      tenantId: "tenant-sqlite-http-001",
      agentId: "agent-sqlite-http-001",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRefs: [paymentFlowFixtures.paymentIntentCreated.mandateRef],
    });
    const authorizedRequestRef = "req-http-client-sqlite-001";
    const headers = await clientService.createSignedHeaders({
      clientId: "client-sqlite-http-001",
      requestRef: authorizedRequestRef,
      timestamp: new Date().toISOString(),
    });

    const unauthorized = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.requestPaymentApproval,
      bodyText: JSON.stringify({
        requestRef: "req-http-client-sqlite-unauthorized",
        input: {
          requestRef: "req-http-client-sqlite-unauthorized",
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      }),
    });
    const authorized = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.requestPaymentApproval,
      headers,
      bodyText: JSON.stringify({
        requestRef: authorizedRequestRef,
        input: {
          requestRef: authorizedRequestRef,
          intent: paymentFlowFixtures.paymentIntentCreated,
          monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
        },
      }),
    });

    const unauthorizedBody = JSON.parse(unauthorized.bodyText) as {
      ok: boolean;
      error?: { code?: string };
    };
    const authorizedBody = JSON.parse(authorized.bodyText) as { ok: boolean };

    assert.equal(unauthorized.statusCode, 403);
    assert.equal(unauthorizedBody.ok, false);
    assert.equal(unauthorizedBody.error?.code, "client-auth-required");
    assert.equal(authorized.statusCode, 200);
    assert.equal(authorizedBody.ok, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("SQLite AFAL HTTP server adapter registers and lists external callback registrations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-sqlite-http-server-callbacks-"));

  try {
    const sqlite = createSeededSqliteAfalHttpServer(dir, {
      externalClientAuth: {
        enabled: true,
      },
    });
    const clientService = new ExternalAgentClientService({
      store: new SqliteExternalAgentClientStore({
        filePath: sqlite.paths.afalExternalClients,
        seed: {
          clients: [],
          replayRecords: [],
        },
      }),
      now: () => new Date("2026-03-30T00:00:10Z"),
    });
    await clientService.provisionClient({
      clientId: "client-sqlite-callback-001",
      tenantId: "tenant-sqlite-callback-001",
      agentId: "agent-sqlite-callback-001",
      subjectDid: paymentFlowFixtures.paymentIntentCreated.payer.agentDid,
      mandateRefs: [paymentFlowFixtures.paymentIntentCreated.mandateRef],
      paymentPayeeDid: "did:afal:agent:payee-sqlite-callback",
      resourceProviderDid: "did:afal:institution:provider-sqlite-callback",
    });

    const registerRequestRef = "req-http-client-sqlite-callback-register-001";
    const registerTimestamp = new Date().toISOString();
    const registerHeaders = await clientService.createSignedHeaders({
      clientId: "client-sqlite-callback-001",
      requestRef: registerRequestRef,
      timestamp: registerTimestamp,
    });
    const registerResponse = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.registerExternalCallback,
      headers: registerHeaders,
      bodyText: JSON.stringify({
        requestRef: registerRequestRef,
        input: {
          paymentSettlementUrl: "https://receiver.example/payment",
          resourceSettlementUrl: "https://receiver.example/resource",
        },
      }),
    });

    const listRequestRef = "req-http-client-sqlite-callback-list-001";
    const listTimestamp = new Date().toISOString();
    const listHeaders = await clientService.createSignedHeaders({
      clientId: "client-sqlite-callback-001",
      requestRef: listRequestRef,
      timestamp: listTimestamp,
    });
    const listResponse = await handleAfalNodeHttpRequest(sqlite, {
      method: "POST",
      url: AFAL_HTTP_ROUTES.listExternalCallbackRegistrations,
      headers: listHeaders,
      bodyText: JSON.stringify({
        requestRef: listRequestRef,
        input: {},
      }),
    });

    const registerBody = JSON.parse(registerResponse.bodyText) as {
      ok: boolean;
      data?: {
        callbackRegistration?: {
          paymentSettlementUrl?: string;
          resourceSettlementUrl?: string;
        };
      };
    };
    const listBody = JSON.parse(listResponse.bodyText) as {
      ok: boolean;
      data?: Array<{ clientId: string }>;
    };

    assert.equal(registerResponse.statusCode, 200);
    assert.equal(registerBody.ok, true);
    assert.equal(
      registerBody.data?.callbackRegistration?.paymentSettlementUrl,
      "https://receiver.example/payment"
    );
    assert.equal(
      registerBody.data?.callbackRegistration?.resourceSettlementUrl,
      "https://receiver.example/resource"
    );

    assert.equal(listResponse.statusCode, 200);
    assert.equal(listBody.ok, true);
    assert.equal(listBody.data?.length, 1);
    assert.equal(listBody.data?.[0]?.clientId, "client-sqlite-callback-001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
