import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ExternalAgentAuthError,
  ExternalAgentClientService,
  InMemoryExternalAgentClientStore,
} from "./index";

test("external agent client service provisions a client and builds signed headers", async () => {
  const service = new ExternalAgentClientService({
    now: () => new Date("2026-03-30T00:00:00Z"),
  });

  const client = await service.provisionClient({
    clientId: "client-demo",
    tenantId: "tenant-demo",
    agentId: "agent-demo",
    subjectDid: "did:afal:agent:demo",
    mandateRefs: ["mnd-0001"],
    paymentPayeeDid: "did:afal:agent:payee-demo",
    paymentSettlementUrl: "https://receiver.example/payment",
  });
  const headers = await service.createSignedHeaders({
    clientId: client.clientId,
    requestRef: "req-demo-001",
    timestamp: "2026-03-30T00:00:00Z",
  });
  const paymentUrls = await service.getPaymentCallbackUrls();

  assert.equal(headers["x-afal-client-id"], "client-demo");
  assert.ok(headers["x-afal-request-signature"]);
  assert.equal(
    paymentUrls["did:afal:agent:payee-demo"],
    "https://receiver.example/payment"
  );
});

test("external agent client service authenticates signed requests and rejects replay", async () => {
  const store = new InMemoryExternalAgentClientStore({
    clients: [
      {
        clientId: "client-auth",
        tenantId: "tenant-auth",
        agentId: "agent-auth",
        subjectDid: "did:afal:agent:auth",
        mandateRefs: ["mnd-0001"],
        auth: {
          signingKey: "secret-auth",
          active: true,
          createdAt: "2026-03-30T00:00:00Z",
        },
        createdAt: "2026-03-30T00:00:00Z",
        updatedAt: "2026-03-30T00:00:00Z",
      },
    ],
  });
  const service = new ExternalAgentClientService({
    store,
    now: () => new Date("2026-03-30T00:00:10Z"),
  });
  const headers = await service.createSignedHeaders({
    clientId: "client-auth",
    requestRef: "req-auth-001",
    timestamp: "2026-03-30T00:00:00Z",
  });

  const first = await service.authenticateRequest({
    clientId: headers["x-afal-client-id"],
    requestRef: "req-auth-001",
    timestamp: headers["x-afal-request-timestamp"],
    signature: headers["x-afal-request-signature"],
    subjectDid: "did:afal:agent:auth",
  });

  assert.equal(first.clientId, "client-auth");

  await assert.rejects(
    service.authenticateRequest({
      clientId: headers["x-afal-client-id"],
      requestRef: "req-auth-001",
      timestamp: headers["x-afal-request-timestamp"],
      signature: headers["x-afal-request-signature"],
      subjectDid: "did:afal:agent:auth",
    }),
    (error: unknown) =>
      error instanceof ExternalAgentAuthError &&
      error.code === "request-replay-detected"
  );
});

test("external agent client service registers callback URLs with validation", async () => {
  const service = new ExternalAgentClientService({
    now: () => new Date("2026-03-30T00:00:00Z"),
  });

  await service.provisionClient({
    clientId: "client-callback",
    tenantId: "tenant-callback",
    agentId: "agent-callback",
    subjectDid: "did:afal:agent:callback",
    mandateRefs: ["mnd-0001"],
    paymentPayeeDid: "did:afal:agent:payee-callback",
    resourceProviderDid: "did:afal:institution:provider-callback",
  });

  const registered = await service.registerCallback("client-callback", {
    paymentSettlementUrl: "https://receiver.example/payment",
    resourceSettlementUrl: "https://receiver.example/resource",
  });
  const listed = await service.listCallbackRegistrations("client-callback");

  assert.equal(registered.callbackRegistration?.paymentSettlementUrl, "https://receiver.example/payment");
  assert.equal(
    registered.callbackRegistration?.resourceSettlementUrl,
    "https://receiver.example/resource"
  );
  assert.deepEqual(registered.callbackRegistration?.eventTypes, [
    "payment.settled",
    "resource.settled",
  ]);
  assert.equal(listed.length, 1);

  await assert.rejects(
    service.registerCallback("client-callback", {}),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "ExternalAgentClientValidationError"
  );
});
