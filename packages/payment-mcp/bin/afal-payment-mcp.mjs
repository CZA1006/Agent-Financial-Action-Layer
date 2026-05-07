#!/usr/bin/env node
import { runStdioServer } from "../src/server.mjs";

runStdioServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`AFAL payment MCP server failed: ${message}\n`);
  process.exit(1);
});
