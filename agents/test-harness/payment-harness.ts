import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { createAfalHttpClient, type AgentHarnessClient } from "./http-client";
import { runApprovalAgent, type ApprovalAgentResult } from "./approval-agent";
import { runPayerPaymentAgent, type PayerAgentResult } from "./payer-agent";
import {
  startSeededSqliteAfalHttpServer,
  type RunningSeededSqliteAfalHttpServer,
} from "../../backend/afal/http/sqlite-server";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

export interface AgentPaymentHarnessResult {
  summary: {
    baseUrl: string;
    payerAgentId: string;
    approvalAgentId: string;
    approvalSessionRef: string;
    finalIntentStatus?: string;
    settlementRef?: string;
    receiptRef?: string;
  };
  payer: PayerAgentResult;
  approval: ApprovalAgentResult;
}

export async function runAgentPaymentHarness(
  client: AgentHarnessClient,
  options?: {
    payerRequestRef?: string;
  }
): Promise<AgentPaymentHarnessResult> {
  const payer = await runPayerPaymentAgent(client, {
    requestRef: options?.payerRequestRef,
  });
  const approval = await runApprovalAgent(client, {
    approvalSessionRef: payer.summary.approvalSessionRef,
  });

  return {
    summary: {
      baseUrl: "in-process",
      payerAgentId: payer.summary.agentId,
      approvalAgentId: approval.summary.agentId,
      approvalSessionRef: payer.summary.approvalSessionRef,
      finalIntentStatus: approval.summary.finalIntentStatus,
      settlementRef: approval.summary.settlementRef,
      receiptRef: approval.summary.receiptRef,
    },
    payer,
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

export async function runSpawnedAgentPaymentHarness(args?: {
  baseUrl?: string;
  dataDir?: string;
  host?: string;
  port?: number;
}): Promise<AgentPaymentHarnessResult> {
  let server: RunningSeededSqliteAfalHttpServer | undefined;
  let tempDataDir: string | undefined;

  try {
    if (!args?.baseUrl) {
      if (!args?.dataDir) {
        tempDataDir = await mkdtemp(join(tmpdir(), "afal-agent-payment-harness-"));
      }

      server = await startSeededSqliteAfalHttpServer({
        dataDir: args?.dataDir ?? tempDataDir,
        host: args?.host,
        port: args?.port,
      });
    }

    const baseUrl = args?.baseUrl ?? server?.url;
    if (!baseUrl) {
      throw new Error("payment harness requires either baseUrl or a startable local server");
    }

    const payer = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "payer-agent.ts"),
      "--base-url",
      baseUrl,
    ])) as PayerAgentResult;

    const approval = (await runJsonProcess([
      "--import",
      "tsx/esm",
      join(THIS_DIR, "approval-agent.ts"),
      "--base-url",
      baseUrl,
      "--approval-session-ref",
      payer.summary.approvalSessionRef,
    ])) as ApprovalAgentResult;

    return {
      summary: {
        baseUrl,
        payerAgentId: payer.summary.agentId,
        approvalAgentId: approval.summary.agentId,
        approvalSessionRef: payer.summary.approvalSessionRef,
        finalIntentStatus: approval.summary.finalIntentStatus,
        settlementRef: approval.summary.settlementRef,
        receiptRef: approval.summary.receiptRef,
      },
      payer,
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
  const result = await runSpawnedAgentPaymentHarness(args);
  console.log(JSON.stringify(result, null, 2));
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main();
}
