import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { type AgentHarnessClient } from "./http-client";
import { runApprovalAgent, type ApprovalAgentResult } from "./approval-agent";
import {
  runResourceRequesterAgent,
  type ResourceRequesterAgentResult,
} from "./resource-requester-agent";
import {
  startSeededSqliteAfalHttpServer,
  type RunningSeededSqliteAfalHttpServer,
} from "../../backend/afal/http/sqlite-server";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

export interface AgentResourceHarnessResult {
  summary: {
    baseUrl: string;
    requesterAgentId: string;
    approvalAgentId: string;
    approvalSessionRef: string;
    finalIntentStatus?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  requester: ResourceRequesterAgentResult;
  approval: ApprovalAgentResult;
}

export async function runAgentResourceHarness(
  client: AgentHarnessClient,
  options?: {
    requesterRequestRef?: string;
  }
): Promise<AgentResourceHarnessResult> {
  const requester = await runResourceRequesterAgent(client, {
    requestRef: options?.requesterRequestRef,
  });
  const approval = await runApprovalAgent(client, {
    approvalSessionRef: requester.summary.approvalSessionRef,
    requestRefPrefix: "req-agent-resource-approval",
  });

  return {
    summary: {
      baseUrl: "in-process",
      requesterAgentId: requester.summary.agentId,
      approvalAgentId: approval.summary.agentId,
      approvalSessionRef: requester.summary.approvalSessionRef,
      finalIntentStatus: approval.summary.finalIntentStatus,
      settlementRef: approval.summary.settlementRef,
      receiptRef: approval.summary.receiptRef,
    },
    requester,
    approval,
  };
}

async function runJsonProcess(args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Agent subprocess exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`
          )
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(
          new Error(
            `Agent subprocess did not return valid JSON: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  });
}

export async function runSpawnedAgentResourceHarness(args?: {
  baseUrl?: string;
  dataDir?: string;
  host?: string;
  port?: number;
}): Promise<AgentResourceHarnessResult> {
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let tempDataDir: string | undefined;

  try {
    if (!args?.baseUrl) {
      if (!args?.dataDir) {
        tempDataDir = await mkdtemp(join(tmpdir(), "afal-agent-resource-harness-"));
      }

      server = await startSeededSqliteAfalHttpServer({
        dataDir: args?.dataDir ?? tempDataDir,
        host: args?.host,
        port: args?.port,
      });
    }

    const baseUrl = args?.baseUrl ?? server?.url;
    if (!baseUrl) {
      throw new Error("resource harness requires either baseUrl or a startable local server");
    }

    const requester = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "resource-requester-agent.ts"),
      "--base-url",
      baseUrl,
    ])) as ResourceRequesterAgentResult;

    const approval = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "approval-agent.ts"),
      "--base-url",
      baseUrl,
      "--approval-session-ref",
      requester.summary.approvalSessionRef,
    ])) as ApprovalAgentResult;

    return {
      summary: {
        baseUrl,
        requesterAgentId: requester.summary.agentId,
        approvalAgentId: approval.summary.agentId,
        approvalSessionRef: requester.summary.approvalSessionRef,
        finalIntentStatus: approval.summary.finalIntentStatus,
        settlementRef: approval.summary.settlementRef,
        receiptRef: approval.summary.receiptRef,
      },
      requester,
      approval,
    };
  } finally {
    if (server) {
      await server.close();
    }
    if (tempDataDir) {
      await rm(tempDataDir, { recursive: true, force: true });
    }
  }
}

function parseArgs(argv: string[]): {
  baseUrl?: string;
  dataDir?: string;
  host?: string;
  port?: number;
} {
  const result: {
    baseUrl?: string;
    dataDir?: string;
    host?: string;
    port?: number;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      result.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--data-dir") {
      result.dataDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--host") {
      result.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--port") {
      const raw = argv[index + 1];
      result.port = raw ? Number(raw) : undefined;
      index += 1;
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runSpawnedAgentResourceHarness(args);
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
