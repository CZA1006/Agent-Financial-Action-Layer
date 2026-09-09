import { createHash } from "node:crypto";

const PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_WALLET_DEMO_URL = "http://34.44.95.42:3412/wallet-demo";
const DEFAULT_TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const ROUTES = {
  requestPaymentApproval: "/capabilities/request-payment-approval",
  getActionStatus: "/actions/get",
  getApprovalSession: "/approval-sessions/get",
  applyApprovalResult: "/approval-sessions/apply-result",
  resumeApprovedAction: "/approval-sessions/resume-action",
};

const toolDefinitions = [
  {
    name: "afal_pay_and_gate",
    description:
      "Run the complete AFAL-governed payment flow and return deliverService=true only after settlement receipt validation passes.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        message: { type: "string" },
        paymentMode: { type: "string", enum: ["agent-wallet", "wallet"] },
        walletDemoUrl: { type: "string" },
        approvalComment: { type: "string" },
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nowRef(prefix) {
  return `${prefix}-${Date.now()}`;
}

function required(name, value) {
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function asRecord(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function optionalString(value, key) {
  const field = value[key];
  if (field === undefined) {
    return undefined;
  }
  if (typeof field !== "string") {
    throw new Error(`${key} must be a string`);
  }
  return field;
}

function requiredString(value, key) {
  return required(key, optionalString(value, key));
}

function normalizeBaseUrl(baseUrl) {
  return required("AFAL_BASE_URL", baseUrl).replace(/\/+$/, "");
}

function signedHeaders(env, requestRef) {
  const clientId = required("AFAL_CLIENT_ID", env.AFAL_CLIENT_ID);
  const signingKey = required("AFAL_SIGNING_KEY", env.AFAL_SIGNING_KEY);
  const timestamp = new Date().toISOString();
  return {
    "content-type": "application/json",
    "x-afal-client-id": clientId,
    "x-afal-request-timestamp": timestamp,
    "x-afal-request-signature": sha256(`${clientId}:${requestRef}:${timestamp}:${signingKey}`),
  };
}

async function parseJsonResponse(response) {
  const body = await response.json();
  if (body && typeof body === "object" && body.ok === false && body.error) {
    throw new Error(
      `AFAL request failed [${body.statusCode} ${body.error.code}] ${body.error.message}`
    );
  }
  return body;
}

async function signedPost(env, path, requestRef, input) {
  const response = await fetch(`${normalizeBaseUrl(env.AFAL_BASE_URL)}${path}`, {
    method: "POST",
    headers: signedHeaders(env, requestRef),
    body: JSON.stringify({ requestRef, input }),
  });
  const body = await parseJsonResponse(response);
  return body.data;
}

async function publicPost(env, path, requestRef, input) {
  const response = await fetch(`${normalizeBaseUrl(env.AFAL_BASE_URL)}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestRef, input }),
  });
  const body = await parseJsonResponse(response);
  return body.data;
}

function parsePaymentInstruction(message) {
  const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*USDC/iu);
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/u);
  return {
    rawMessage: message,
    payerAgentDid: "did:afal:agent:payment-agent-01",
    payerAccountId: "acct-agent-001",
    payeeDid: "did:afal:agent:fraud-service-01",
    payeeAddress: required("payee address", addressMatch?.[0]),
    amount: required("USDC amount", amountMatch?.[1]),
    asset: "USDC",
    chain: "base-sepolia",
    tokenAddress: DEFAULT_TOKEN_ADDRESS,
    purpose: `Agent prompt payment: ${message}`,
    mandateRef: "mnd-0001",
    policyRef: "cred-policy-0001",
    monetaryBudgetRef: "budg-money-001",
  };
}

function buildPaymentIntent(instruction) {
  return {
    intentId: "payint-0001",
    schemaVersion: "0.1",
    intentType: "payment",
    payer: {
      agentDid: instruction.payerAgentDid,
      accountId: instruction.payerAccountId,
    },
    payee: {
      payeeDid: instruction.payeeDid,
      settlementAddress: instruction.payeeAddress,
    },
    asset: instruction.asset,
    amount: instruction.amount,
    chain: instruction.chain,
    purpose: {
      category: "service-payment",
      description: instruction.purpose,
      referenceId: "agent-payment-tool",
    },
    mandateRef: instruction.mandateRef,
    policyRef: instruction.policyRef,
    executionMode: "pre-authorized",
    challengeState: "required",
    status: "created",
    expiresAt: "2026-03-24T12:10:00Z",
    nonce: "n-0001",
    createdAt: "2026-03-24T12:05:00Z",
  };
}

function buildWalletUrl(walletDemoUrl, actionRef, instruction) {
  const url = new URL(walletDemoUrl);
  url.searchParams.set("actionRef", actionRef);
  url.searchParams.set("to", instruction.payeeAddress);
  url.searchParams.set("amount", instruction.amount);
  url.searchParams.set("tokenAddress", instruction.tokenAddress);
  return url.toString();
}

async function requestPayment(env, args) {
  const message = requiredString(args, "message");
  const walletDemoUrl =
    optionalString(args, "walletDemoUrl") ?? env.AFAL_WALLET_DEMO_URL ?? DEFAULT_WALLET_DEMO_URL;
  const instruction = parsePaymentInstruction(message);
  const intent = buildPaymentIntent(instruction);
  const requestRef = nowRef("req-afal-payment");
  const approval = await signedPost(env, ROUTES.requestPaymentApproval, requestRef, {
    requestRef,
    intent,
    monetaryBudgetRef: instruction.monetaryBudgetRef,
  });
  const actionRef = approval.intent.intentId;
  return {
    tool: "afal.request_payment",
    status: "pending_approval",
    actionRef,
    approvalSessionRef: approval.approvalSession.approvalSessionId,
    payeeDid: instruction.payeeDid,
    payeeAddress: instruction.payeeAddress,
    amount: instruction.amount,
    asset: instruction.asset,
    chain: instruction.chain,
    walletUrl: buildWalletUrl(walletDemoUrl, actionRef, instruction),
    afal: {
      decisionRef: approval.initialDecision.decisionId,
      challengeRef: approval.challenge.challengeId,
      reservedAmount: approval.updatedBudget?.reservedAmount,
      availableAmount: approval.updatedBudget?.availableAmount,
    },
  };
}

function challengeSuffix(session) {
  return String(session.challengeRef).replace(/^chall-/, "");
}

function buildApprovalResult(session, comment) {
  const suffix = challengeSuffix(session);
  return {
    approvalResultId: `apr-${suffix}`,
    challengeRef: session.challengeRef,
    actionRef: session.actionRef,
    result: "approved",
    approvedBy: "did:afal:owner:alice-01",
    approvalChannel: session.trustedSurfaceRef,
    stepUpAuthUsed: true,
    comment: comment ?? `Approved ${session.actionType} action via trusted surface`,
    approvalReceiptRef: `rcpt-approval-${suffix}`,
    decidedAt: new Date().toISOString(),
  };
}

function extractTxHash(resumed) {
  const txHash = resumed?.paymentReceipt?.evidence?.txHash ?? resumed?.settlement?.txHash;
  return typeof txHash === "string" ? txHash : undefined;
}

async function approveResume(env, args) {
  const approvalSessionRef = requiredString(args, "approvalSessionRef");
  const prefix = "req-agent-payment-approval";
  const session = await publicPost(env, ROUTES.getApprovalSession, `${prefix}-get`, {
    approvalSessionRef,
  });
  const approvalResult = buildApprovalResult(session, optionalString(args, "comment"));
  await publicPost(env, ROUTES.applyApprovalResult, `${prefix}-apply`, {
    approvalSessionRef,
    result: approvalResult,
  });
  const resumed = await publicPost(env, ROUTES.resumeApprovedAction, `${prefix}-resume`, {
    approvalSessionRef,
  });
  return {
    tool: "afal.trusted_surface_approve_resume",
    approvalSessionRef,
    actionRef: session.actionRef,
    result: approvalResult.result,
    resumedAction: true,
    finalIntentStatus: resumed.intent?.status,
    settlementRef: resumed.settlement?.settlementId,
    receiptRef: resumed.paymentReceipt?.receiptId ?? resumed.resourceReceipt?.receiptId,
    txHash: extractTxHash(resumed),
    deliverableHint: resumed.intent?.status === "settled" ? "run_provider_gate" : "not_settled",
  };
}

function normalizeAddress(value) {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function evaluateProviderGate(actionRef, status, expected) {
  if (status.actionType !== "payment") {
    return {
      tool: "afal.provider_receipt_gate",
      actionRef,
      deliverService: false,
      reason: "AFAL action is not a payment action",
      checks: {
        actionTypePayment: false,
        intentSettled: false,
        settlementPresent: false,
        paymentReceiptFinal: false,
        receiptSettlementMatches: false,
      },
    };
  }

  const receipt = status.paymentReceipt;
  const settlement = status.settlement;
  const receiptEvidence = receipt?.evidence ?? {};
  const checks = {
    actionTypePayment: true,
    intentSettled: status.intent?.status === "settled",
    settlementPresent: Boolean(settlement),
    paymentReceiptFinal: receipt?.status === "final",
    receiptSettlementMatches:
      Boolean(receipt?.settlementRef) &&
      Boolean(settlement?.settlementId) &&
      receipt?.settlementRef === settlement?.settlementId,
  };

  if (expected.expectedPayeeAddress) {
    checks.payeeMatches =
      normalizeAddress(expected.expectedPayeeAddress) ===
      normalizeAddress(status.intent?.payee?.settlementAddress);
  }
  if (expected.expectedAmount) {
    checks.amountMatches = receiptEvidence.amount === expected.expectedAmount;
  }
  if (expected.expectedAsset) {
    checks.assetMatches = receiptEvidence.asset === expected.expectedAsset;
  }
  if (expected.expectedChain) {
    checks.chainMatches = receiptEvidence.chain === expected.expectedChain;
  }
  if (expected.expectedTxHash) {
    checks.txHashMatches =
      typeof receiptEvidence.txHash === "string" &&
      receiptEvidence.txHash.toLowerCase() === expected.expectedTxHash.toLowerCase();
  }

  const failed = Object.entries(checks).filter(([, value]) => value === false);
  return {
    tool: "afal.provider_receipt_gate",
    actionRef,
    deliverService: failed.length === 0,
    reason:
      failed.length === 0
        ? "AFAL action is settled with final receipt evidence; provider may deliver service."
        : `Provider must not deliver service; failed checks: ${failed.map(([name]) => name).join(", ")}`,
    checks,
    evidence: {
      settlementRef: settlement?.settlementId,
      receiptRef: receipt?.receiptId,
      txHash: typeof receiptEvidence.txHash === "string" ? receiptEvidence.txHash : undefined,
      amount: receiptEvidence.amount,
      asset: receiptEvidence.asset,
      chain: receiptEvidence.chain,
      payeeDid: receiptEvidence.payeeDid,
      settlementAddress: status.intent?.payee?.settlementAddress,
    },
  };
}

async function providerGate(env, args) {
  const actionRef = requiredString(args, "actionRef");
  const requestRef = nowRef("req-afal-action-status");
  const status = await signedPost(env, ROUTES.getActionStatus, requestRef, { actionRef });
  return evaluateProviderGate(actionRef, status, {
    expectedPayeeAddress: optionalString(args, "expectedPayeeAddress"),
    expectedAmount: optionalString(args, "expectedAmount"),
    expectedAsset: optionalString(args, "expectedAsset"),
    expectedChain: optionalString(args, "expectedChain"),
    expectedTxHash: optionalString(args, "expectedTxHash"),
  });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readWalletConfirmation(baseUrl, actionRef) {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/wallet-payments/confirmations/${encodeURIComponent(actionRef)}`
  );
  if (response.status === 404) {
    return undefined;
  }
  const body = await parseJsonResponse(response);
  return body.data;
}

async function waitForWalletConfirmation(baseUrl, actionRef, timeoutMs, pollIntervalMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const confirmation = await readWalletConfirmation(baseUrl, actionRef);
    if (confirmation) {
      return confirmation;
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`Timed out waiting for wallet confirmation for action "${actionRef}"`);
}

function walletConfirmationBaseUrl(walletDemoUrl) {
  return new URL(walletDemoUrl).origin;
}

async function payAndGate(env, args) {
  const paymentMode =
    optionalString(args, "paymentMode") ?? env.AFAL_PAYMENT_MODE ?? "agent-wallet";
  if (paymentMode !== "agent-wallet" && paymentMode !== "wallet") {
    throw new Error('paymentMode must be "agent-wallet" or "wallet"');
  }
  const request = await requestPayment(env, args);
  const walletConfirmation =
    paymentMode === "wallet"
      ? await waitForWalletConfirmation(
          walletConfirmationBaseUrl(request.walletUrl),
          request.actionRef,
          Number(env.AFAL_WALLET_CONFIRMATION_TIMEOUT_MS ?? 300000),
          Number(env.AFAL_WALLET_CONFIRMATION_POLL_INTERVAL_MS ?? 2000)
        )
      : undefined;
  const approval = await approveResume(env, {
    approvalSessionRef: request.approvalSessionRef,
    comment: optionalString(args, "approvalComment") ?? env.AFAL_APPROVAL_COMMENT,
  });
  const expectedTxHash = walletConfirmation?.txHash ?? approval.txHash;
  if (!expectedTxHash) {
    throw new Error("payment txHash was not available from wallet confirmation or approval result");
  }
  const gate = await providerGate(env, {
    actionRef: request.actionRef,
    expectedPayeeAddress: request.payeeAddress,
    expectedAmount: request.amount,
    expectedAsset: request.asset,
    expectedChain: request.chain,
    expectedTxHash,
  });
  return {
    tool: "afal.pay_and_gate",
    status: gate.deliverService ? "settled" : "not_deliverable",
    actionRef: request.actionRef,
    approvalSessionRef: request.approvalSessionRef,
    walletUrl: request.walletUrl,
    walletConfirmation,
    approval,
    providerGate: gate,
    deliverService: gate.deliverService,
  };
}

function textToolResult(value, isError = false) {
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

function success(id, result) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function failure(id, code, message, data) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

export async function handleMcpRequest(request, options = {}) {
  const env = options.env ?? process.env;
  if (request.method === "notifications/initialized" || request.id === undefined) {
    return undefined;
  }
  if (request.method === "initialize") {
    return success(request.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "afal-payment-mcp", version: "0.1.0-preview.2" },
    });
  }
  if (request.method === "tools/list") {
    return success(request.id, { tools: toolDefinitions });
  }
  if (request.method === "ping") {
    return success(request.id, {});
  }
  if (request.method === "tools/call") {
    try {
      const params = asRecord(request.params, "tools/call params");
      const toolName = requiredString(params, "name");
      const args = asRecord(params.arguments ?? {}, "tool arguments");
      const runner = options.tools?.[toolName] ?? {
        afal_pay_and_gate: payAndGate,
        afal_request_payment: requestPayment,
        afal_approve_resume: approveResume,
        afal_provider_gate: providerGate,
      }[toolName];
      if (!runner) {
        throw new Error(`Unknown AFAL MCP tool "${toolName}"`);
      }
      const result = await runner(env, args);
      return success(request.id, textToolResult(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return success(request.id, textToolResult(message, true));
    }
  }
  return failure(request.id, -32601, `Method not found: ${request.method}`);
}

function parseContentLengthMessage(buffer) {
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

export function extractMcpMessages(buffer) {
  const messages = [];
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

export async function runStdioServer() {
  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    void (async () => {
      buffer += chunk;
      const extracted = extractMcpMessages(buffer);
      buffer = extracted.rest;
      for (const message of extracted.messages) {
        try {
          const request = JSON.parse(message);
          const response = await handleMcpRequest(request);
          if (response) {
            process.stdout.write(`${JSON.stringify(response)}\n`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          process.stdout.write(`${JSON.stringify(failure(null, -32700, `Parse error: ${errorMessage}`))}\n`);
        }
      }
    })().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`AFAL MCP server error: ${message}\n`);
    });
  });
}
