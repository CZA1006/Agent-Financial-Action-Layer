import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

test("publishes a versioned OpenAPI snapshot from the stable latest artifacts", () => {
  const releaseRoot = mkdtempSync(resolve(tmpdir(), "afal-openapi-release-"));

  execFileSync("node", ["scripts/publish-openapi-snapshot.mjs", "0.1.0"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AFAL_OPENAPI_RELEASES_DIR: releaseRoot,
    },
    stdio: "pipe",
  });

  const snapshotDir = resolve(releaseRoot, "v0.1.0");
  const yamlPath = resolve(snapshotDir, "openapi.yaml");
  const jsonPath = resolve(snapshotDir, "openapi.json");
  const manifestPath = resolve(snapshotDir, "manifest.json");
  const releaseNotesPath = resolve(snapshotDir, "release-notes.md");
  const releaseIndexPath = resolve(releaseRoot, "index.json");

  assert.equal(existsSync(yamlPath), true);
  assert.equal(existsSync(jsonPath), true);
  assert.equal(existsSync(manifestPath), true);
  assert.equal(existsSync(releaseNotesPath), true);
  assert.equal(existsSync(releaseIndexPath), true);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    artifact: string;
    version: string;
    published: {
      yaml: string;
      json: string;
      manifest: string;
      releaseNotes: string;
    };
    notesStatus: string;
    notesFinalized: boolean;
    snapshot: {
      release: string;
      immutable: boolean;
      sourceVersion: string;
    };
    git: {
      commit: string | null;
      dirty: boolean;
    };
  };

  assert.equal(manifest.artifact, "afal-openapi");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.snapshot.release, "v0.1.0");
  assert.equal(manifest.snapshot.immutable, true);
  assert.match(manifest.snapshot.sourceVersion, /^\d+\.\d+\.\d+-draft$/);
  assert.ok(manifest.published.yaml.endsWith("v0.1.0/openapi.yaml"));
  assert.ok(manifest.published.json.endsWith("v0.1.0/openapi.json"));
  assert.ok(manifest.published.manifest.endsWith("v0.1.0/manifest.json"));
  assert.ok(manifest.published.releaseNotes.endsWith("v0.1.0/release-notes.md"));
  assert.equal(manifest.notesStatus, "draft-stub");
  assert.equal(manifest.notesFinalized, false);
  assert.ok(manifest.git.commit === null || /^[0-9a-f]{40}$/.test(manifest.git.commit));
  assert.equal(typeof manifest.git.dirty, "boolean");

  const releaseNotes = readFileSync(releaseNotesPath, "utf8");
  assert.match(releaseNotes, /<!-- release-notes-status: draft-stub -->/);
  assert.match(releaseNotes, /# AFAL OpenAPI Release `v0\.1\.0`/);
  assert.match(releaseNotes, /- version: `0\.1\.0`/);
  assert.match(releaseNotes, /- previous release: `none`/);

  const releaseCatalog = JSON.parse(readFileSync(releaseIndexPath, "utf8")) as {
    artifact: string;
    draftVersion: string;
    latestRelease: string | null;
    releases: Array<{
      version: string;
      release: string;
      sourceVersion: string;
      notesStatus: string;
      notesFinalized: boolean;
      published: {
        yaml: string;
        json: string;
        manifest: string;
        releaseNotes: string;
      };
    }>;
  };

  assert.equal(releaseCatalog.artifact, "afal-openapi");
  assert.match(releaseCatalog.draftVersion, /^\d+\.\d+\.\d+-draft$/);
  assert.equal(releaseCatalog.latestRelease, "v0.1.0");
  assert.equal(releaseCatalog.releases.length, 1);
  assert.equal(releaseCatalog.releases[0]?.version, "0.1.0");
  assert.equal(releaseCatalog.releases[0]?.release, "v0.1.0");
  assert.match(releaseCatalog.releases[0]?.sourceVersion ?? "", /^\d+\.\d+\.\d+-draft$/);
  assert.equal(releaseCatalog.releases[0]?.notesStatus, "draft-stub");
  assert.equal(releaseCatalog.releases[0]?.notesFinalized, false);
  assert.ok(releaseCatalog.releases[0]?.published.yaml.endsWith("v0.1.0/openapi.yaml"));
  assert.ok(releaseCatalog.releases[0]?.published.releaseNotes.endsWith("v0.1.0/release-notes.md"));
});
