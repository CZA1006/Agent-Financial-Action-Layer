import { pathToFileURL } from "node:url";

import type { ActionStatusOutput } from "../../backend/afal/interfaces";
import { createAfalHttpClient, type AgentHarnessClient } from "./http-client";

export interface ProviderAgentSummary {
  agentId: string;
  actionRef: string;
  intentStatus: string;
  usageReceiptRef?: string;
  settlementRef?: string;
  receiptRef?: string;
}

export interface ProviderAgentResult {
  summary: ProviderAgentSummary;
  response: Extract<ActionStatusOutput, { actionType: "resource" }>;
}

export async function runProviderAgent(
  client: AgentHarnessClient,
  options: {
    actionRef: string;
    requestRef?: string;
  }
): Promise<ProviderAgentResult> {
  const response = await client.getActionStatus({
    requestRef: options.requestRef ?? `req-provider-status-${options.actionRef}`,
    actionRef: options.actionRef,
  });

  if (response.actionType !== "resource") {
    throw new Error(`Provider agent expected resource status for "${options.actionRef}"`);
  }

  return {
    summary: {
      agentId: response.intent.provider.providerDid,
      actionRef: response.intent.intentId,
      intentStatus: response.intent.status,
      usageReceiptRef: response.usageConfirmation?.usageReceiptRef,
      settlementRef: response.settlement?.settlementId,
      receiptRef: response.resourceReceipt?.receiptId,
    },
    response,
  };
}

function parseArgs(argv: string[]): { baseUrl: string; actionRef: string; requestRef?: string } {
  let baseUrl = "";
  let actionRef = "";
  let requestRef: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      baseUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--action-ref") {
      actionRef = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--request-ref") {
      requestRef = argv[index + 1];
      index += 1;
    }
  }

  if (!baseUrl || !actionRef) {
    throw new Error("provider-agent requires --base-url and --action-ref");
  }

  return { baseUrl, actionRef, requestRef };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runProviderAgent(createAfalHttpClient(args.baseUrl), {
    actionRef: args.actionRef,
    requestRef: args.requestRef,
  });
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
