import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { SqliteAfalAdminAuditStore } from "./admin-audit";

test("AFAL admin audit SQLite store persists entries across store re-instantiation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "afal-admin-audit-sqlite-"));
  const filePath = join(dir, "afal-integration.sqlite");

  try {
    const first = new SqliteAfalAdminAuditStore({
      filePath,
      seed: {
        entries: [],
      },
    });

    await first.putAuditEntry({
      auditId: "admin-audit-001",
      requestRef: "req-admin-audit-001",
      action: "runNotificationWorker",
      createdAt: "2026-03-24T12:30:00Z",
      targetRef: "notif-payint-0001",
      details: {
        redelivered: 1,
      },
    });

    const second = new SqliteAfalAdminAuditStore({ filePath });
    const entry = await second.getAuditEntry("admin-audit-001");
    const listed = await second.listAuditEntries();

    assert.equal(entry?.auditId, "admin-audit-001");
    assert.equal(entry?.action, "runNotificationWorker");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.targetRef, "notif-payint-0001");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
