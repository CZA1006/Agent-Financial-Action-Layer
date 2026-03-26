import assert from "node:assert/strict";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../sdk/fixtures";
import { createSeededAipRecords, createSeededInMemoryAipService } from "./bootstrap";
import { InMemoryAipService, createCredentialRecord } from "./service";
import { InMemoryAipStore } from "./store";

test("AIP service resolves seeded identities", async () => {
  const service = createSeededInMemoryAipService();

  const identity = await service.resolveIdentity(paymentFlowFixtures.agentDid.id);

  assert.equal(identity.id, paymentFlowFixtures.agentDid.id);
  assert.equal(identity.status, "active");
});

test("AIP service verifies seeded active credentials", async () => {
  const service = createSeededInMemoryAipService();

  const verified = await service.verifyCredential(paymentFlowFixtures.authorityCredential.id);

  assert.equal(verified, true);
});

test("AIP service rejects missing credentials", async () => {
  const service = createSeededInMemoryAipService();

  const verified = await service.verifyCredential("cred-missing-001");

  assert.equal(verified, false);
});

test("AIP service rejects revoked credentials", async () => {
  const service = createSeededInMemoryAipService();

  await service.revokeCredential(paymentFlowFixtures.policyCredential.id, "2026-03-25T09:15:00Z");
  const verified = await service.verifyCredential(paymentFlowFixtures.policyCredential.id);
  const record = await service.getCredential(paymentFlowFixtures.policyCredential.id);

  assert.equal(verified, false);
  assert.equal(record.status, "revoked");
  assert.equal(record.credential.credentialStatus?.status, "revoked");
});

test("AIP service rejects credentials when the subject identity is frozen", async () => {
  const service = createSeededInMemoryAipService();

  await service.freezeIdentity(paymentFlowFixtures.agentDid.id, "2026-03-25T09:20:00Z");
  const verified = await service.verifyCredential(paymentFlowFixtures.ownershipCredential.id);
  const identity = await service.resolveIdentity(paymentFlowFixtures.agentDid.id);

  assert.equal(verified, false);
  assert.equal(identity.status, "frozen");
});

test("AIP service rejects expired credentials", async () => {
  const service = new InMemoryAipService({
    identities: [paymentFlowFixtures.agentDid],
    credentials: [
      createCredentialRecord({
        ...paymentFlowFixtures.authorityCredential,
        id: "cred-auth-expired-001",
        expirationDate: "2020-01-01T00:00:00Z",
      }),
    ],
  });

  const verified = await service.verifyCredential("cred-auth-expired-001");

  assert.equal(verified, false);
});

test("AIP service reads and updates state through the injected store", async () => {
  const store = new InMemoryAipStore({
    identities: [paymentFlowFixtures.agentDid],
    credentials: [createCredentialRecord(paymentFlowFixtures.ownershipCredential)],
  });
  const service = new InMemoryAipService({ store });

  await service.freezeIdentity(paymentFlowFixtures.agentDid.id, "2026-03-25T09:30:00Z");

  const identity = await store.getIdentity(paymentFlowFixtures.agentDid.id);
  const verified = await service.verifyCredential(paymentFlowFixtures.ownershipCredential.id);

  assert.equal(identity?.status, "frozen");
  assert.equal(verified, false);
});

test("AIP bootstrap produces deduplicated seeded records", () => {
  const records = createSeededAipRecords();
  const identityIds = new Set(records.identities.map((identity) => identity.id));
  const credentialIds = new Set(records.credentials.map((record) => record.credential.id));

  assert.equal(records.identities.length, identityIds.size);
  assert.equal(records.credentials.length, credentialIds.size);
  assert.ok(identityIds.has(paymentFlowFixtures.agentDid.id));
  assert.ok(credentialIds.has(paymentFlowFixtures.policyCredential.id));
});
