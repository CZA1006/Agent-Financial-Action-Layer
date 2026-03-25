import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd(), "docs/specs/openapi");
const port = Number(process.env.PORT ?? 3210);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};

function safePathname(urlPathname) {
  const candidate = normalize(urlPathname === "/" ? "/index.html" : urlPathname);
  const resolved = resolve(root, `.${candidate}`);
  return resolved.startsWith(root) ? resolved : null;
}

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const filePath = safePathname(requestUrl.pathname);

  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const contentType = contentTypes[extname(filePath)] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": contentType });
  createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`AFAL OpenAPI preview available at http://127.0.0.1:${port}`);
  console.log(`Serving ${join("docs", "specs", "openapi")}`);
});
