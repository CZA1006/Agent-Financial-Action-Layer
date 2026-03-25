import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

test("ships a static OpenAPI preview page bound to the stable latest.json artifact", () => {
  const previewPath = resolve(process.cwd(), "docs/specs/openapi/index.html");
  const previewHtml = readFileSync(previewPath, "utf8");

  assert.match(previewHtml, /AFAL OpenAPI Preview/);
  assert.match(previewHtml, /SwaggerUIBundle/);
  assert.match(previewHtml, /url:\s*"\.\/latest\.json"/);
  assert.match(previewHtml, /docs\/specs\/openapi\/latest\.json/);
});
