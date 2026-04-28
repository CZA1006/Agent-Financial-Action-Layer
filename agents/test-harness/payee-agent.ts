import { pathToFileURL } from "node:url";

import type { ActionStatusOutput } from "../../backend/afal/interfaces";
import {
  createAfalHttpClient,
  type AgentHarnessClient,
  type AgentHarnessClientOptions,
} from "./http-client";

export interface PayeeAgentSummary {
  agentId: string;
  actionRef: string;
  intentStatus: string;
  settlementRef?: string;
  receiptRef?: string;
}

export interface PayeeAgentResult {
  summary: PayeeAgentSummary;
  response: Extract<ActionStatusOutput, { actionType: "payment" }>;
}

export async function runPayeeAgent(
  client: AgentHarnessClient,
  options: {
    actionRef: string;
    requestRef?: string;
  }
): Promise<PayeeAgentResult> {
  const response = await client.getActionStatus({
    requestRef: options.requestRef ?? `req-payee-status-${options.actionRef}`,
    actionRef: options.actionRef,
  });

  if (response.actionType !== "payment") {
    throw new Error(`Payee agent expected payment status for "${options.actionRef}"`);
  }

  return {
    summary: {
      agentId: response.intent.payee.payeeDid,
      actionRef: response.intent.intentId,
      intentStatus: response.intent.status,
      settlementRef: response.settlement?.settlementId,
      receiptRef: response.paymentReceipt?.receiptId,
    },
    response,
  };
}

function parseArgs(argv: string[]): {
  baseUrl: string;
  actionRef: string;
  requestRef?: string;
  externalClientAuth?: NonNullable<AgentHarnessClientOptions["externalClientAuth"]>;
} {
  let baseUrl = "";
  let actionRef = "";
  let requestRef: string | undefined;
  let clientId = process.env.AFAL_CLIENT_ID;
  let signingKey = process.env.AFAL_SIGNING_KEY;

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
      continue;
    }
    if (arg === "--client-id") {
      clientId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--signing-key") {
      signingKey = argv[index + 1];
      index += 1;
    }
  }

  if (!baseUrl || !actionRef) {
    throw new Error("payee-agent requires --base-url and --action-ref");
  }

  return {
    baseUrl,
    actionRef,
    requestRef,
    externalClientAuth:
      clientId && signingKey
        ? {
            clientId,
            signingKey,
          }
        : undefined,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runPayeeAgent(
    createAfalHttpClient(args.baseUrl, {
      externalClientAuth: args.externalClientAuth,
    }),
    {
      actionRef: args.actionRef,
      requestRef: args.requestRef,
    }
  );
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
