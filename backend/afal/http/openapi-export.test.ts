import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

test("exports the AFAL OpenAPI draft to stable YAML and JSON artifacts", () => {
  execFileSync("node", ["scripts/export-openapi.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  const draftYamlPath = resolve(process.cwd(), "docs/specs/afal-http-openapi-draft.yaml");
  const artifactPath = resolve(process.cwd(), "docs/specs/afal-http-openapi-draft.json");
  const stableJsonPath = resolve(process.cwd(), "docs/specs/openapi/latest.json");
  const stableYamlPath = resolve(process.cwd(), "docs/specs/openapi/latest.yaml");
  const manifestPath = resolve(process.cwd(), "docs/specs/openapi/manifest.json");
  const draftYamlContents = readFileSync(draftYamlPath, "utf8");
  const draftContents = readFileSync(artifactPath, "utf8");
  const stableJsonContents = readFileSync(stableJsonPath, "utf8");
  const stableYamlContents = readFileSync(stableYamlPath, "utf8");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    artifact: string;
    version: string;
    openapi: string;
    title: string;
    generatedAt: string;
    source: {
      yamlDraft: string;
      jsonDraft: string;
    };
    published: {
      yaml: string;
      json: string;
      preview: string;
      manifest: string;
      releases: string;
    };
    git: {
      commit: string | null;
      dirty: boolean;
    };
  };
  const document = JSON.parse(draftContents) as {
    openapi: string;
    info: { title: string };
    paths: Record<string, unknown>;
    components: {
      responses: Record<string, unknown>;
      schemas: Record<string, unknown>;
    };
  };

  assert.equal(stableJsonContents, draftContents);
  assert.equal(stableYamlContents, draftYamlContents);
  assert.equal(manifest.artifact, "afal-openapi");
  assert.equal(manifest.openapi, "3.1.0");
  assert.equal(manifest.title, "AFAL Phase 1 HTTP Capability Contract");
  assert.equal(manifest.source.yamlDraft, "docs/specs/afal-http-openapi-draft.yaml");
  assert.equal(manifest.source.jsonDraft, "docs/specs/afal-http-openapi-draft.json");
  assert.equal(manifest.published.yaml, "docs/specs/openapi/latest.yaml");
  assert.equal(manifest.published.json, "docs/specs/openapi/latest.json");
  assert.equal(manifest.published.preview, "docs/specs/openapi/index.html");
  assert.equal(manifest.published.manifest, "docs/specs/openapi/manifest.json");
  assert.equal(manifest.published.releases, "docs/specs/openapi/releases/index.json");
  assert.ok(!Number.isNaN(Date.parse(manifest.generatedAt)));
  assert.ok(manifest.git.commit === null || /^[0-9a-f]{40}$/.test(manifest.git.commit));
  assert.equal(typeof manifest.git.dirty, "boolean");

  assert.equal(document.openapi, "3.1.0");
  assert.equal(document.info.title, "AFAL Phase 1 HTTP Capability Contract");
  assert.deepEqual(Object.keys(document.paths).sort(), [
    "/actions/get",
    "/approval-sessions/apply-result",
    "/approval-sessions/get",
    "/approval-sessions/resume",
    "/approval-sessions/resume-action",
    "/capabilities/execute-payment",
    "/capabilities/request-payment-approval",
    "/capabilities/request-resource-approval",
    "/capabilities/settle-resource-usage",
  ]);

  assert.ok(document.components.schemas.RequestPaymentApprovalHttpRequest);
  assert.ok(document.components.schemas.ExecutePaymentHttpRequest);
  assert.ok(document.components.schemas.RequestResourceApprovalHttpRequest);
  assert.ok(document.components.schemas.SettleResourceUsageHttpRequest);
  assert.ok(document.components.schemas.GetActionStatusHttpRequest);
  assert.ok(document.components.schemas.GetApprovalSessionHttpRequest);
  assert.ok(document.components.schemas.ApplyApprovalResultHttpRequest);
  assert.ok(document.components.schemas.ResumeApprovalSessionHttpRequest);
  assert.ok(document.components.schemas.ResumeApprovedActionHttpRequest);
  assert.ok(document.components.schemas.PaymentActionStatusOutput);
  assert.ok(document.components.schemas.ResourceActionStatusOutput);
  assert.ok(document.components.schemas.GetActionStatusSuccessResponse);
  assert.ok(document.components.schemas.PaymentApprovalRequestOutput);
  assert.ok(document.components.schemas.PaymentFlowOutput);
  assert.ok(document.components.schemas.ResourceApprovalRequestOutput);
  assert.ok(document.components.schemas.ResourceFlowOutput);
  assert.ok(document.components.schemas.ResumeApprovedActionSuccessResponse);
  assert.ok(document.components.schemas.AuthorizationDecision);
  assert.ok(document.components.schemas.ApprovalSession);
  assert.ok(document.components.schemas.CapabilityResponse);

  const forbiddenResponse = document.components.responses.ForbiddenResponse as {
    content: {
      "application/json": {
        examples: Record<string, unknown>;
      };
    };
  };
  const conflictResponse = document.components.responses.ConflictResponse as {
    content: {
      "application/json": {
        examples: Record<string, unknown>;
      };
    };
  };
  const providerFailureResponse = document.components.responses.ProviderFailureResponse as {
    content: {
      "application/json": {
        examples: Record<string, unknown>;
      };
    };
  };

  assert.ok(forbiddenResponse.content["application/json"].examples["credential-verification-failed"]);
  assert.ok(forbiddenResponse.content["application/json"].examples["authorization-rejected"]);
  assert.ok(conflictResponse.content["application/json"].examples["authorization-expired"]);
  assert.ok(conflictResponse.content["application/json"].examples["authorization-cancelled"]);
  assert.ok(providerFailureResponse.content["application/json"].examples["provider-usage-confirmation-failed"]);
});
