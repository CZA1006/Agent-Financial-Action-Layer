import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const version = process.argv[2];
const allowOverwrite = process.argv.includes("--allow-overwrite");

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: node scripts/publish-openapi-snapshot.mjs <x.y.z> [--allow-overwrite]');
  process.exit(1);
}

execFileSync("node", ["scripts/export-openapi.mjs"], {
  cwd: root,
  stdio: "inherit",
});

const releaseRoot = resolve(
  root,
  process.env.AFAL_OPENAPI_RELEASES_DIR ?? "docs/specs/openapi/releases"
);
const releaseName = `v${version}`;
const releaseDir = resolve(releaseRoot, releaseName);
const outputYamlPath = resolve(releaseDir, "openapi.yaml");
const outputJsonPath = resolve(releaseDir, "openapi.json");
const outputManifestPath = resolve(releaseDir, "manifest.json");
const outputReleaseNotesPath = resolve(releaseDir, "release-notes.md");
const releaseIndexPath = resolve(releaseRoot, "index.json");

if (existsSync(releaseDir) && !allowOverwrite) {
  console.error(`snapshot path already exists: ${releaseDir}`);
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });

const latestYamlPath = resolve(root, "docs/specs/openapi/latest.yaml");
const latestJsonPath = resolve(root, "docs/specs/openapi/latest.json");
const latestManifestPath = resolve(root, "docs/specs/openapi/manifest.json");
const releaseNotesTemplatePath = resolve(
  root,
  "docs/specs/openapi/releases/release-notes-template.md"
);
const latestManifest = JSON.parse(readFileSync(latestManifestPath, "utf8"));

copyFileSync(latestYamlPath, outputYamlPath);
copyFileSync(latestJsonPath, outputJsonPath);

if (!existsSync(outputReleaseNotesPath)) {
  writeFileSync(
    outputReleaseNotesPath,
    renderReleaseNotesStub({
      version,
      releaseName,
      latestManifest,
      previousRelease: findPreviousRelease(releaseRoot, version),
    })
  );
}

const releaseNotesContents = readFileSync(outputReleaseNotesPath, "utf8");
const notesStatus = parseReleaseNotesStatus(releaseNotesContents);

const snapshotManifest = {
  artifact: latestManifest.artifact,
  version,
  openapi: latestManifest.openapi,
  title: latestManifest.title,
  generatedAt: new Date().toISOString(),
  source: {
    draftYaml: latestManifest.source.yamlDraft,
    draftJson: latestManifest.source.jsonDraft,
    latestYaml: latestManifest.published.yaml,
    latestJson: latestManifest.published.json,
    latestManifest: latestManifest.published.manifest,
  },
  published: {
    yaml: outputYamlPath.replace(`${root}/`, ""),
    json: outputJsonPath.replace(`${root}/`, ""),
    manifest: outputManifestPath.replace(`${root}/`, ""),
    releaseNotes: outputReleaseNotesPath.replace(`${root}/`, ""),
  },
  notesStatus,
  notesFinalized: notesStatus === "finalized",
  snapshot: {
    release: releaseName,
    immutable: true,
    sourceVersion: latestManifest.version,
  },
  git: latestManifest.git,
};

writeFileSync(outputManifestPath, JSON.stringify(snapshotManifest, null, 2) + "\n");

const releaseEntries = readReleaseEntries(releaseRoot);

const releaseCatalog = {
  artifact: latestManifest.artifact,
  updatedAt: new Date().toISOString(),
  draftVersion: latestManifest.version,
  latestRelease: releaseEntries[0]?.release ?? null,
  releases: releaseEntries,
};

writeFileSync(releaseIndexPath, JSON.stringify(releaseCatalog, null, 2) + "\n");

console.log(`published ${outputYamlPath}`);
console.log(`published ${outputJsonPath}`);
console.log(`published ${outputManifestPath}`);
console.log(`published ${outputReleaseNotesPath}`);
console.log(`published ${releaseIndexPath}`);

function readReleaseEntries(releaseRootPath) {
  return readdirSync(releaseRootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^v\d+\.\d+\.\d+$/.test(entry.name))
    .map((entry) => {
      const manifestPath = resolve(releaseRootPath, entry.name, "manifest.json");
      if (!existsSync(manifestPath)) {
        return null;
      }

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      return {
        version: manifest.version,
        release: manifest.snapshot.release,
        openapi: manifest.openapi,
        title: manifest.title,
        generatedAt: manifest.generatedAt,
        sourceVersion: manifest.snapshot.sourceVersion,
        notesStatus: manifest.notesStatus ?? "draft-stub",
        notesFinalized: Boolean(manifest.notesFinalized),
        published: manifest.published,
        git: manifest.git,
      };
    })
    .filter(Boolean)
    .sort((left, right) => compareVersions(right.version, left.version));
}

function findPreviousRelease(releaseRootPath, currentVersion) {
  const lowerVersions = readReleaseEntries(releaseRootPath).filter(
    (entry) => compareVersions(entry.version, currentVersion) < 0
  );

  return lowerVersions[0]?.release ?? "none";
}

function renderReleaseNotesStub({ version, releaseName, latestManifest, previousRelease }) {
  const template = readFileSync(releaseNotesTemplatePath, "utf8");
  const publishDate = new Date().toISOString().slice(0, 10);
  const gitCommit = latestManifest.git?.commit ?? "unknown";

  return template
    .replaceAll("vX.Y.Z", releaseName)
    .replaceAll("X.Y.Z", version)
    .replace("`0.x.y-draft`", `\`${latestManifest.version}\``)
    .replace("`YYYY-MM-DD`", `\`${publishDate}\``)
    .replace("`<40-char commit>`", `\`${gitCommit}\``)
    .replace("`vA.B.C` or `none`", `\`${previousRelease}\``);
}

function parseReleaseNotesStatus(contents) {
  const match = contents.match(/<!--\s*release-notes-status:\s*(draft-stub|finalized)\s*-->/);
  return match?.[1] ?? "draft-stub";
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}
