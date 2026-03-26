import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { paymentFlowFixtures } from "../../sdk/fixtures";
import { createSeededAipRecords } from "./bootstrap";
import { JsonFileAipStore } from "./file-store";
import { InMemoryAipService } from "./service";

test("AIP JSON file store persists seeded records across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-aip-store-"));

  try {
    const filePath = join(dir, "aip-store.json");
    const seeded = createSeededAipRecords();
    const store = new JsonFileAipStore({
      filePath,
      seed: seeded,
    });

    const identity = await store.getIdentity(paymentFlowFixtures.agentDid.id);
    const credential = await store.getCredential(paymentFlowFixtures.policyCredential.id);

    assert.equal(identity?.id, paymentFlowFixtures.agentDid.id);
    assert.equal(credential?.credential.id, paymentFlowFixtures.policyCredential.id);

    const reopenedStore = new JsonFileAipStore({ filePath });
    const reopenedIdentity = await reopenedStore.getIdentity(paymentFlowFixtures.agentDid.id);
    const reopenedCredential = await reopenedStore.getCredential(
      paymentFlowFixtures.policyCredential.id
    );

    assert.equal(reopenedIdentity?.id, paymentFlowFixtures.agentDid.id);
    assert.equal(reopenedCredential?.credential.id, paymentFlowFixtures.policyCredential.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("AIP service state survives re-instantiation when backed by the JSON file store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-aip-service-"));

  try {
    const filePath = join(dir, "aip-store.json");
    const seed = createSeededAipRecords();
    const firstService = new InMemoryAipService({
      store: new JsonFileAipStore({
        filePath,
        seed,
      }),
    });

    await firstService.freezeIdentity(paymentFlowFixtures.agentDid.id, "2026-03-25T10:00:00Z");
    await firstService.revokeCredential(
      paymentFlowFixtures.policyCredential.id,
      "2026-03-25T10:05:00Z"
    );

    const secondService = new InMemoryAipService({
      store: new JsonFileAipStore({ filePath }),
    });

    const identity = await secondService.resolveIdentity(paymentFlowFixtures.agentDid.id);
    const credential = await secondService.getCredential(paymentFlowFixtures.policyCredential.id);
    const verified = await secondService.verifyCredential(paymentFlowFixtures.policyCredential.id);

    assert.equal(identity.status, "frozen");
    assert.equal(credential.status, "revoked");
    assert.equal(verified, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
