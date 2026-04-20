import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { SqliteExternalAgentClientStore } from "./sqlite-store";

test("SQLite external agent client store persists clients and replay records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-external-clients-"));
  const filePath = join(dir, "afal-integration.sqlite");

  try {
    const store = new SqliteExternalAgentClientStore({ filePath });
    await store.putClient({
      clientId: "client-alpha",
      tenantId: "tenant-alpha",
      agentId: "agent-alpha",
      subjectDid: "did:afal:agent:alpha",
      mandateRefs: ["mnd-0001"],
      paymentPayeeDid: "did:afal:agent:payee-alpha",
      auth: {
        signingKey: "secret-alpha",
        active: true,
        createdAt: "2026-03-30T00:00:00Z",
      },
      createdAt: "2026-03-30T00:00:00Z",
      updatedAt: "2026-03-30T00:00:00Z",
    });
    await store.putReplayRecord({
      clientId: "client-alpha",
      replayKey: "req-001:2026-03-30T00:00:00Z",
      requestRef: "req-001",
      timestamp: "2026-03-30T00:00:00Z",
      seenAt: "2026-03-30T00:00:01Z",
    });

    const second = new SqliteExternalAgentClientStore({ filePath });
    const client = await second.getClient("client-alpha");
    const replay = await second.getReplayRecord(
      "client-alpha",
      "req-001:2026-03-30T00:00:00Z"
    );

    assert.equal(client?.clientId, "client-alpha");
    assert.equal(client?.paymentPayeeDid, "did:afal:agent:payee-alpha");
    assert.equal(replay?.requestRef, "req-001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
