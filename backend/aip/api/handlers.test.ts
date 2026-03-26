import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { paymentFlowFixtures } from "../../../sdk/fixtures";
import { createSeededInMemoryAipService } from "../bootstrap";
import { createAipApiHandlers, handleFreezeIdentity, handleResolveIdentity, handleRevokeCredential, handleVerifyCredential } from "./handlers";

describe("AIP API adapter", () => {
  test("returns a success envelope for resolveIdentity", async () => {
    const response = await handleResolveIdentity({
      capability: "resolveIdentity",
      requestRef: "req-aip-identity-001",
      input: {
        subjectDid: paymentFlowFixtures.agentDid.id,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.statusCode, 200);
      assert.equal(response.data.id, paymentFlowFixtures.agentDid.id);
    }
  });

  test("returns a success envelope for verifyCredential with a valid credential", async () => {
    const response = await handleVerifyCredential({
      capability: "verifyCredential",
      requestRef: "req-aip-verify-001",
      input: {
        credentialId: paymentFlowFixtures.authorityCredential.id,
      },
    });

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.statusCode, 200);
      assert.equal(response.data.valid, true);
      assert.equal(response.data.credentialId, paymentFlowFixtures.authorityCredential.id);
    }
  });

  test("returns a success envelope for verifyCredential with an invalid but known credential", async () => {
    const aip = createSeededInMemoryAipService();
    await aip.revokeCredential(paymentFlowFixtures.policyCredential.id, "2026-03-25T10:00:00Z");

    const response = await handleVerifyCredential(
      {
        capability: "verifyCredential",
        requestRef: "req-aip-verify-002",
        input: {
          credentialId: paymentFlowFixtures.policyCredential.id,
        },
      },
      aip
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.valid, false);
      assert.equal(response.data.credentialStatus, "revoked");
    }
  });

  test("returns a success envelope for freezeIdentity", async () => {
    const aip = createSeededInMemoryAipService();
    const response = await handleFreezeIdentity(
      {
        capability: "freezeIdentity",
        requestRef: "req-aip-freeze-001",
        input: {
          subjectDid: paymentFlowFixtures.agentDid.id,
          updatedAt: "2026-03-25T10:05:00Z",
        },
      },
      aip
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.status, "frozen");
      assert.equal(response.data.updatedAt, "2026-03-25T10:05:00Z");
    }
  });

  test("returns a success envelope for revokeCredential", async () => {
    const aip = createSeededInMemoryAipService();
    const response = await handleRevokeCredential(
      {
        capability: "revokeCredential",
        requestRef: "req-aip-revoke-001",
        input: {
          credentialId: paymentFlowFixtures.policyCredential.id,
          revokedAt: "2026-03-25T10:10:00Z",
        },
      },
      aip
    );

    assert.equal(response.ok, true);
    if (response.ok) {
      assert.equal(response.data.status, "revoked");
      assert.equal(response.data.revokedAt, "2026-03-25T10:10:00Z");
    }
  });

  test("maps unknown DID to a 404 response", async () => {
    const response = await handleResolveIdentity({
      capability: "resolveIdentity",
      requestRef: "req-aip-identity-404",
      input: {
        subjectDid: "did:afal:agent:missing-404",
      },
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 404);
      assert.equal(response.error.code, "not-found");
    }
  });

  test("maps unknown credential to a 404 response", async () => {
    const response = await handleVerifyCredential({
      capability: "verifyCredential",
      requestRef: "req-aip-verify-404",
      input: {
        credentialId: "cred-missing-404",
      },
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.statusCode, 404);
      assert.equal(response.error.code, "not-found");
    }
  });

  test("supports generic capability dispatch", async () => {
    const handlers = createAipApiHandlers();

    const identityResponse = await handlers.invokeCapability({
      capability: "resolveIdentity",
      requestRef: "req-aip-dispatch-001",
      input: {
        subjectDid: paymentFlowFixtures.agentDid.id,
      },
    });

    const verifyResponse = await handlers.invokeCapability({
      capability: "verifyCredential",
      requestRef: "req-aip-dispatch-002",
      input: {
        credentialId: paymentFlowFixtures.authorityCredential.id,
      },
    });

    assert.equal(identityResponse.ok, true);
    assert.equal(verifyResponse.ok, true);
  });
});
