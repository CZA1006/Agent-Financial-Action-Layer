import { pathToFileURL } from "node:url";

import { runAgentRuntimeTool, type AgentRuntimeToolCommand } from "../agent-payment-tool/agent-runtime-tool";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: JsonValue;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: JsonValue;
  };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

type AgentRuntimeRunner = (argv: string[]) => Promise<unknown>;

interface McpHandlerOptions {
  env?: NodeJS.ProcessEnv;
  runAgentTool?: AgentRuntimeRunner;
}

const PROTOCOL_VERSION = "2024-11-05";

const toolDefinitions: JsonValue[] = [
  {
    name: "afal_pay_and_gate",
    description:
      "Run the complete AFAL-governed payment flow and return deliverService=true only after settlement receipt validation passes.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        message: {
          type: "string",
          description:
            "Natural-language payment instruction, for example: Pay 0.01 USDC to payee agent at 0x... for fraud detection service.",
        },
        paymentMode: {
          type: "string",
          enum: ["agent-wallet", "wallet"],
          description:
            "agent-wallet uses the AFAL payment rail signer; wallet waits for external wallet confirmation.",
        },
        walletDemoUrl: {
          type: "string",
          description:
            "Payment rail wallet demo URL. Defaults to AFAL_WALLET_DEMO_URL.",
        },
        approvalComment: {
          type: "string",
          description: "Trusted-surface approval comment recorded by AFAL.",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "afal_request_payment",
    description:
      "Create an AFAL payment intent and return the approval session. This does not deliver paid service.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        message: { type: "string" },
        walletDemoUrl: { type: "string" },
      },
      required: ["message"],
    },
  },
  {
    name: "afal_approve_resume",
    description:
      "Approve an AFAL approval session and resume the action into settlement through the configured payment rail.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        approvalSessionRef: { type: "string" },
        comment: { type: "string" },
      },
      required: ["approvalSessionRef"],
    },
  },
  {
    name: "afal_provider_gate",
    description:
      "Verify AFAL settlement and receipt evidence before a payee/provider delivers paid service.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        actionRef: { type: "string" },
        expectedPayeeAddress: { type: "string" },
        expectedAmount: { type: "string" },
        expectedAsset: { type: "string" },
        expectedChain: { type: "string" },
        expectedTxHash: { type: "string" },
      },
      required: ["actionRef"],
    },
  },
];

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalString(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  if (field === undefined) {
    return undefined;
  }
  if (typeof field !== "string") {
    throw new Error(`${key} must be a string`);
  }
  return field;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const field = optionalString(value, key);
  if (!field) {
    throw new Error(`${key} must be set`);
  }
  return field;
}

function pushOption(argv: string[], flag: string, value: string | undefined): void {
  if (value) {
    argv.push(flag, value);
  }
}

function pushEnvOptions(argv: string[], env: NodeJS.ProcessEnv): void {
  pushOption(argv, "--base-url", env.AFAL_BASE_URL);
  pushOption(argv, "--client-id", env.AFAL_CLIENT_ID);
  pushOption(argv, "--signing-key", env.AFAL_SIGNING_KEY);
}

function buildAgentRuntimeArgv(
  toolName: string,
  rawArguments: unknown,
  env: NodeJS.ProcessEnv
): string[] {
  const args = asRecord(rawArguments ?? {}, "tool arguments");

  if (toolName === "afal_pay_and_gate") {
    const argv = ["pay-and-gate"];
    pushEnvOptions(argv, env);
    pushOption(argv, "--message", requiredString(args, "message"));
    pushOption(argv, "--wallet-demo-url", optionalString(args, "walletDemoUrl") ?? env.AFAL_WALLET_DEMO_URL);
    pushOption(argv, "--payment-mode", optionalString(args, "paymentMode") ?? env.AFAL_PAYMENT_MODE ?? "agent-wallet");
    pushOption(argv, "--comment", optionalString(args, "approvalComment") ?? env.AFAL_APPROVAL_COMMENT);
    return argv;
  }

  if (toolName === "afal_request_payment") {
    const argv = ["request-payment"];
    pushEnvOptions(argv, env);
    pushOption(argv, "--message", requiredString(args, "message"));
    pushOption(argv, "--wallet-demo-url", optionalString(args, "walletDemoUrl") ?? env.AFAL_WALLET_DEMO_URL);
    return argv;
  }

  if (toolName === "afal_approve_resume") {
    const argv = ["approve-resume"];
    pushOption(argv, "--base-url", env.AFAL_BASE_URL);
    pushOption(argv, "--approval-session-ref", requiredString(args, "approvalSessionRef"));
    pushOption(argv, "--comment", optionalString(args, "comment") ?? env.AFAL_APPROVAL_COMMENT);
    return argv;
  }

  if (toolName === "afal_provider_gate") {
    const argv = ["provider-gate"];
    pushEnvOptions(argv, env);
    pushOption(argv, "--action-ref", requiredString(args, "actionRef"));
    pushOption(argv, "--expected-payee-address", optionalString(args, "expectedPayeeAddress"));
    pushOption(argv, "--expected-amount", optionalString(args, "expectedAmount"));
    pushOption(argv, "--expected-asset", optionalString(args, "expectedAsset"));
    pushOption(argv, "--expected-chain", optionalString(args, "expectedChain"));
    pushOption(argv, "--expected-tx-hash", optionalString(args, "expectedTxHash"));
    return argv;
  }

  throw new Error(`Unknown AFAL MCP tool "${toolName}"`);
}

function textToolResult(value: unknown, isError = false): JsonValue {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    isError,
  };
}

function success(id: string | number | null, result: JsonValue): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

function failure(
  id: string | number | null,
  code: number,
  message: string,
  data?: JsonValue
): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function requestId(request: JsonRpcRequest): string | number | null {
  return request.id ?? null;
}

export async function handleMcpRequest(
  request: JsonRpcRequest,
  options: McpHandlerOptions = {}
): Promise<JsonRpcResponse | undefined> {
  const env = options.env ?? process.env;
  const runAgentTool = options.runAgentTool ?? runAgentRuntimeTool;

  if (request.method === "notifications/initialized" || request.id === undefined) {
    return undefined;
  }

  if (request.method === "initialize") {
    return success(requestId(request), {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "afal-payment-mcp-server",
        version: "0.1.0",
      },
    });
  }

  if (request.method === "tools/list") {
    return success(requestId(request), {
      tools: toolDefinitions,
    });
  }

  if (request.method === "tools/call") {
    try {
      const params = asRecord(request.params, "tools/call params");
      const toolName = requiredString(params, "name");
      const argv = buildAgentRuntimeArgv(toolName, params.arguments, env);
      const result = await runAgentTool(argv as [AgentRuntimeToolCommand, ...string[]]);
      return success(requestId(request), textToolResult(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return success(requestId(request), textToolResult(message, true));
    }
  }

  if (request.method === "ping") {
    return success(requestId(request), {});
  }

  return failure(requestId(request), -32601, `Method not found: ${request.method}`);
}

function parseContentLengthMessage(buffer: string): { message?: string; rest: string } {
  const headerEnd = buffer.indexOf("\r\n\r\n");
  if (headerEnd === -1) {
    return { rest: buffer };
  }
  const headers = buffer.slice(0, headerEnd).split("\r\n");
  const contentLengthHeader = headers.find((header) =>
    header.toLowerCase().startsWith("content-length:")
  );
  if (!contentLengthHeader) {
    throw new Error("Missing Content-Length header");
  }
  const contentLength = Number.parseInt(contentLengthHeader.split(":")[1]?.trim() ?? "", 10);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    throw new Error("Invalid Content-Length header");
  }
  const messageStart = headerEnd + 4;
  const messageEnd = messageStart + contentLength;
  if (buffer.length < messageEnd) {
    return { rest: buffer };
  }
  return {
    message: buffer.slice(messageStart, messageEnd),
    rest: buffer.slice(messageEnd),
  };
}

export function extractMcpMessages(buffer: string): { messages: string[]; rest: string } {
  const messages: string[] = [];
  let rest = buffer;

  while (rest.length > 0) {
    if (rest.startsWith("Content-Length:")) {
      const parsed = parseContentLengthMessage(rest);
      if (!parsed.message) {
        return { messages, rest: parsed.rest };
      }
      messages.push(parsed.message);
      rest = parsed.rest;
      continue;
    }

    const newlineIndex = rest.indexOf("\n");
    if (newlineIndex === -1) {
      return { messages, rest };
    }
    const line = rest.slice(0, newlineIndex).trim();
    rest = rest.slice(newlineIndex + 1);
    if (line) {
      messages.push(line);
    }
  }

  return { messages, rest };
}

async function runStdioServer(): Promise<void> {
  let buffer = "";

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    void (async () => {
      buffer += chunk;
      const extracted = extractMcpMessages(buffer);
      buffer = extracted.rest;

      for (const message of extracted.messages) {
        try {
          const request = JSON.parse(message) as JsonRpcRequest;
          const response = await handleMcpRequest(request);
          if (response) {
            process.stdout.write(`${JSON.stringify(response)}\n`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const response = failure(null, -32700, `Parse error: ${errorMessage}`);
          process.stdout.write(`${JSON.stringify(response)}\n`);
        }
      }
    })().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`AFAL MCP server error: ${message}\n`);
    });
  });
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void runStdioServer();
}
