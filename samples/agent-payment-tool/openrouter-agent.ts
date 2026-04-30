import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runAfalPaymentTool } from "./afal-payment-tool";

export type AgentPaymentToolName = "afal_request_payment" | "abort";

export interface AgentPaymentToolDecision {
  tool: AgentPaymentToolName;
  arguments: {
    message: string;
  };
  rationale: string;
}

export interface OpenRouterAgentPaymentArgs {
  message: string;
  baseUrl: string;
  clientId: string;
  signingKey: string;
  walletDemoUrl: string;
  openRouterApiKey?: string;
  openRouterModel: string;
  openRouterBaseUrl?: string;
  mockLlm: boolean;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function getArgValue(argv: string[], index: number): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${argv[index]} requires a value`);
  }
  return value;
}

async function loadEnvFile(envFilePath = resolve(process.cwd(), ".env")): Promise<void> {
  let raw = "";
  try {
    raw = await readFile(envFilePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv: string[]): OpenRouterAgentPaymentArgs {
  const args: Partial<OpenRouterAgentPaymentArgs> = {
    message: process.env.AFAL_AGENT_PAYMENT_MESSAGE,
    baseUrl: process.env.AFAL_BASE_URL,
    clientId: process.env.AFAL_CLIENT_ID,
    signingKey: process.env.AFAL_SIGNING_KEY,
    walletDemoUrl: process.env.AFAL_WALLET_DEMO_URL ?? "http://34.44.95.42:3412/wallet-demo",
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL,
    mockLlm: process.env.AFAL_AGENT_MOCK_LLM === "true",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--message") {
      args.message = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--base-url") {
      args.baseUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--client-id") {
      args.clientId = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--signing-key") {
      args.signingKey = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--wallet-demo-url") {
      args.walletDemoUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--model") {
      args.openRouterModel = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--openrouter-base-url") {
      args.openRouterBaseUrl = getArgValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--mock-llm") {
      args.mockLlm = true;
    }
  }

  return {
    message: required("AFAL_AGENT_PAYMENT_MESSAGE or --message", args.message),
    baseUrl: required("AFAL_BASE_URL or --base-url", args.baseUrl),
    clientId: required("AFAL_CLIENT_ID or --client-id", args.clientId),
    signingKey: required("AFAL_SIGNING_KEY or --signing-key", args.signingKey),
    walletDemoUrl: required("AFAL_WALLET_DEMO_URL or --wallet-demo-url", args.walletDemoUrl),
    openRouterApiKey: args.openRouterApiKey,
    openRouterModel: required("OPENROUTER_MODEL or --model", args.openRouterModel),
    openRouterBaseUrl: args.openRouterBaseUrl,
    mockLlm: Boolean(args.mockLlm),
  };
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/u);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  throw new Error("LLM response did not contain a JSON object");
}

export function parseAgentPaymentToolDecision(raw: string): AgentPaymentToolDecision {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<AgentPaymentToolDecision>;
  if (parsed.tool !== "afal_request_payment" && parsed.tool !== "abort") {
    throw new Error('Agent decision tool must be "afal_request_payment" or "abort"');
  }
  if (typeof parsed.rationale !== "string" || parsed.rationale.trim().length === 0) {
    throw new Error("Agent decision must include a non-empty rationale");
  }
  const message = parsed.arguments?.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Agent decision must include arguments.message");
  }
  return {
    tool: parsed.tool,
    arguments: {
      message: message.trim(),
    },
    rationale: parsed.rationale.trim(),
  };
}

function buildAgentPrompt(message: string): string {
  return [
    "You are an agent runtime with one payment tool: afal_request_payment.",
    "If the user asks to pay, buy, unlock a paid service, or compensate another agent, you must call afal_request_payment before claiming work is complete.",
    "Do not say payment has happened unless the AFAL tool is called and returns a payment action.",
    "Return JSON only with this exact schema:",
    '{"tool":"afal_request_payment"|"abort","arguments":{"message":"payment instruction"},"rationale":"short reason"}',
    "",
    "User message:",
    message,
  ].join("\n");
}

async function requestOpenRouterToolDecision(
  args: OpenRouterAgentPaymentArgs
): Promise<AgentPaymentToolDecision> {
  if (args.mockLlm) {
    return {
      tool: "afal_request_payment",
      arguments: {
        message: args.message,
      },
      rationale: "Mock LLM selected the mandatory AFAL payment tool for a payment request.",
    };
  }

  const apiKey = required("OPENROUTER_API_KEY", args.openRouterApiKey);
  const response = await fetch(
    `${args.openRouterBaseUrl ?? "https://openrouter.ai/api/v1"}/chat/completions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://github.com/CZA1006/Agent-Financial-Action-Layer",
        "x-title": "AFAL OpenRouter Agent Payment Tool Sample",
      },
      body: JSON.stringify({
        model: args.openRouterModel,
        messages: [
          {
            role: "user",
            content: buildAgentPrompt(args.message),
          },
        ],
        temperature: 0,
      }),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `OpenRouter request failed [${response.status}] ${bodyText || "empty response body"}`
    );
  }

  const body = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter response did not contain assistant content");
  }
  return parseAgentPaymentToolDecision(content);
}

export async function runOpenRouterAgentPaymentToolSample(args: OpenRouterAgentPaymentArgs) {
  const decision = await requestOpenRouterToolDecision(args);
  if (decision.tool === "abort") {
    return {
      stage: "openrouter-agent-payment-tool-sample",
      userMessage: args.message,
      decision,
      toolResult: null,
      nextAction: "No AFAL payment action was created.",
    };
  }

  const toolResult = await runAfalPaymentTool({
    baseUrl: args.baseUrl,
    clientId: args.clientId,
    signingKey: args.signingKey,
    message: decision.arguments.message,
    walletDemoUrl: args.walletDemoUrl,
    waitForReceipt: false,
  });

  return {
    stage: "openrouter-agent-payment-tool-sample",
    userMessage: args.message,
    decision,
    toolResult,
    nextAction:
      "Open toolResult.walletUrl in the trusted surface, complete wallet payment, then verify AFAL receipt before delivering paid service.",
  };
}

async function main(): Promise<void> {
  await loadEnvFile();
  const result = await runOpenRouterAgentPaymentToolSample(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
