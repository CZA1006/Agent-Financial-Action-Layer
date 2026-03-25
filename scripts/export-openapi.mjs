import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const inputPath = resolve(root, "docs/specs/afal-http-openapi-draft.yaml");
const draftOutputPath = resolve(root, "docs/specs/afal-http-openapi-draft.json");
const stableJsonOutputPath = resolve(root, "docs/specs/openapi/latest.json");
const stableYamlOutputPath = resolve(root, "docs/specs/openapi/latest.yaml");
const manifestOutputPath = resolve(root, "docs/specs/openapi/manifest.json");

mkdirSync(dirname(draftOutputPath), { recursive: true });
mkdirSync(dirname(stableJsonOutputPath), { recursive: true });

const rubyProgram = `
  require "yaml"
  require "json"

  input_path = ARGV[0]
  document = YAML.load_file(input_path)
  STDOUT.write(JSON.pretty_generate(document) + "\\n")
`;

const jsonOutput = execFileSync("ruby", ["-e", rubyProgram, inputPath], {
  encoding: "utf8",
});
const yamlSource = readFileSync(inputPath, "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const openapiDocument = JSON.parse(jsonOutput);

function readGitOutput(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

const gitCommit = readGitOutput(["rev-parse", "HEAD"]);
const gitDirty = Boolean(readGitOutput(["status", "--porcelain"]));
const manifest = {
  artifact: "afal-openapi",
  version: `${packageJson.version}-draft`,
  openapi: openapiDocument.openapi,
  title: openapiDocument.info?.title ?? "AFAL OpenAPI",
  generatedAt: new Date().toISOString(),
  source: {
    yamlDraft: "docs/specs/afal-http-openapi-draft.yaml",
    jsonDraft: "docs/specs/afal-http-openapi-draft.json",
  },
  published: {
    yaml: "docs/specs/openapi/latest.yaml",
    json: "docs/specs/openapi/latest.json",
    preview: "docs/specs/openapi/index.html",
    manifest: "docs/specs/openapi/manifest.json",
    releases: "docs/specs/openapi/releases/index.json",
  },
  git: {
    commit: gitCommit,
    dirty: gitDirty,
  },
};

writeFileSync(draftOutputPath, jsonOutput);
writeFileSync(stableJsonOutputPath, jsonOutput);
writeFileSync(stableYamlOutputPath, yamlSource);
writeFileSync(manifestOutputPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`exported ${draftOutputPath}`);
console.log(`published ${stableJsonOutputPath}`);
console.log(`published ${stableYamlOutputPath}`);
console.log(`published ${manifestOutputPath}`);
