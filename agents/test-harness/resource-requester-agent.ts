import { pathToFileURL } from "node:url";

import type { ResourceApprovalRequestOutput } from "../../backend/afal/interfaces";
import { createAfalHttpClient, type AgentHarnessClient } from "./http-client";

export interface ResourceRequesterAgentSummary {
  agentId: string;
  requestRef: string;
  actionRef: string;
  approvalSessionRef: string;
  challengeRef: string;
  status: string;
}

export interface ResourceRequesterAgentResult {
  summary: ResourceRequesterAgentSummary;
  response: ResourceApprovalRequestOutput;
}

export async function runResourceRequesterAgent(
  client: AgentHarnessClient,
  options?: {
    requestRef?: string;
  }
): Promise<ResourceRequesterAgentResult> {
  const response = await client.requestResourceApproval({
    requestRef: options?.requestRef,
  });

  return {
    summary: {
      agentId: response.intent.requester.agentDid,
      requestRef: response.capabilityResponse.requestRef,
      actionRef: response.intent.intentId,
      approvalSessionRef: response.approvalSession.approvalSessionId,
      challengeRef: response.challenge.challengeId,
      status: response.intent.status,
    },
    response,
  };
}

function parseArgs(argv: string[]): { baseUrl: string; requestRef?: string } {
  let baseUrl = "";
  let requestRef: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      baseUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--request-ref") {
      requestRef = argv[index + 1];
      index += 1;
    }
  }

  if (!baseUrl) {
    throw new Error("resource-requester-agent requires --base-url");
  }

  return {
    baseUrl,
    requestRef,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runResourceRequesterAgent(createAfalHttpClient(args.baseUrl), {
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
