import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";

export interface OpenRouterPaymentDecision {
  decision: "request_payment_approval" | "abort";
  rationale: string;
}

export interface OpenRouterResourceDecision {
  decision: "request_resource_approval" | "abort";
  rationale: string;
}

export interface OpenRouterChatCompletionOptions {
  apiKey: string;
  model: string;
  prompt: string;
  referer?: string;
  title?: string;
  baseUrl?: string;
}

export async function loadEnvFileIntoProcess(
  envFilePath = resolve(process.cwd(), ".env")
): Promise<void> {
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

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function buildCanonicalPaymentPrompt(): string {
  const intent = paymentFlowFixtures.paymentIntentCreated;
  const policy = paymentFlowFixtures.policyCredential.credentialSubject;
  const mandateScope = paymentFlowFixtures.paymentMandate.scope as {
    singlePaymentLimit?: string;
    dailyPaymentLimit?: string;
    allowedCounterparties?: string[];
    allowedAssets?: string[];
    allowedChains?: string[];
  };

  return [
    "You are an external payment agent operating in an AFAL sandbox.",
    "Your job is to decide whether to request payment approval for the canonical payment intent.",
    "Return JSON only with this exact schema:",
    '{"decision":"request_payment_approval"|"abort","rationale":"short explanation"}',
    "Do not include markdown fences or any extra text.",
    "",
    "Canonical payment intent:",
    `- payerAgentDid: ${intent.payer.agentDid}`,
    `- payeeDid: ${intent.payee.payeeDid}`,
    `- asset: ${intent.asset}`,
    `- amount: ${intent.amount}`,
    `- chain: ${intent.chain}`,
    `- purpose: ${intent.purpose.description}`,
    `- mandateRef: ${intent.mandateRef}`,
    `- policyRef: ${intent.policyRef}`,
    "",
    "Current policy limits:",
    `- singlePaymentLimit: ${policy.singlePaymentLimit}`,
    `- dailyPaymentLimit: ${policy.dailyPaymentLimit}`,
    `- challengeThreshold: ${policy.challengeThreshold}`,
    `- allowedCounterparties: ${(policy.allowedCounterparties ?? []).join(", ")}`,
    `- allowedAssets: ${(policy.allowedAssets ?? []).join(", ")}`,
    `- allowedChains: ${(policy.allowedChains ?? []).join(", ")}`,
    "",
    "Mandate scope:",
    `- singlePaymentLimit: ${mandateScope.singlePaymentLimit ?? "unknown"}`,
    `- dailyPaymentLimit: ${mandateScope.dailyPaymentLimit ?? "unknown"}`,
    `- allowedCounterparties: ${(mandateScope.allowedCounterparties ?? []).join(", ")}`,
    `- allowedAssets: ${(mandateScope.allowedAssets ?? []).join(", ")}`,
    `- allowedChains: ${(mandateScope.allowedChains ?? []).join(", ")}`,
    "",
    "The payment is intentionally above the challenge threshold, so approval is expected.",
    'If the request should proceed, return {"decision":"request_payment_approval","rationale":"..."}',
    'If it should not proceed, return {"decision":"abort","rationale":"..."}',
  ].join("\n");
}

function buildCanonicalResourcePrompt(): string {
  const intent = resourceFlowFixtures.resourceIntentCreated;
  const policy = resourceFlowFixtures.policyCredential.credentialSubject;
  const mandateScope = resourceFlowFixtures.resourceMandate.scope as {
    maxSpendAmount?: string;
    allowedProviders?: string[];
    allowedAssets?: string[];
    allowedChains?: string[];
    resourceClass?: string;
    resourceUnit?: string;
    quantityLimit?: number;
  };

  return [
    "You are an external resource-purchasing agent operating in an AFAL sandbox.",
    "Your job is to decide whether to request resource approval for the canonical resource intent.",
    "Return JSON only with this exact schema:",
    '{"decision":"request_resource_approval"|"abort","rationale":"short explanation"}',
    "Do not include markdown fences or any extra text.",
    "",
    "Canonical resource intent:",
    `- requesterAgentDid: ${intent.requester.agentDid}`,
    `- providerDid: ${intent.provider.providerDid}`,
    `- providerId: ${intent.provider.providerId}`,
    `- resourceClass: ${intent.resource.resourceClass}`,
    `- resourceUnit: ${intent.resource.resourceUnit}`,
    `- quantity: ${intent.resource.quantity}`,
    `- maxSpend: ${intent.pricing.maxSpend}`,
    `- asset: ${intent.pricing.asset}`,
    `- budgetRef: ${intent.budgetSource.reference}`,
    `- mandateRef: ${intent.mandateRef}`,
    `- policyRef: ${intent.policyRef}`,
    "",
    "Current policy limits:",
    `- allowedProviders: ${(policy.allowedProviders ?? []).join(", ")}`,
    `- allowedAssets: ${(policy.allowedAssets ?? []).join(", ")}`,
    `- allowedChains: ${(policy.allowedChains ?? []).join(", ")}`,
    `- challengeThreshold: ${policy.challengeThreshold ?? "unknown"}`,
    "",
    "Mandate scope:",
    `- maxSpendAmount: ${mandateScope.maxSpendAmount ?? "unknown"}`,
    `- quantityLimit: ${String(mandateScope.quantityLimit ?? "unknown")}`,
    `- resourceClass: ${mandateScope.resourceClass ?? "unknown"}`,
    `- resourceUnit: ${mandateScope.resourceUnit ?? "unknown"}`,
    `- allowedProviders: ${(mandateScope.allowedProviders ?? []).join(", ")}`,
    `- allowedAssets: ${(mandateScope.allowedAssets ?? []).join(", ")}`,
    `- allowedChains: ${(mandateScope.allowedChains ?? []).join(", ")}`,
    "",
    "The resource spend is intentionally above the challenge threshold, so approval is expected.",
    'If the request should proceed, return {"decision":"request_resource_approval","rationale":"..."}',
    'If it should not proceed, return {"decision":"abort","rationale":"..."}',
  ].join("\n");
}

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/u);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("OpenRouter response did not contain a JSON object");
}

export function parseOpenRouterPaymentDecision(raw: string): OpenRouterPaymentDecision {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<OpenRouterPaymentDecision>;
  if (
    parsed.decision !== "request_payment_approval" &&
    parsed.decision !== "abort"
  ) {
    throw new Error('OpenRouter decision must be "request_payment_approval" or "abort"');
  }
  if (typeof parsed.rationale !== "string" || parsed.rationale.trim().length === 0) {
    throw new Error("OpenRouter decision must include a non-empty rationale");
  }
  return {
    decision: parsed.decision,
    rationale: parsed.rationale.trim(),
  };
}

export function parseOpenRouterResourceDecision(raw: string): OpenRouterResourceDecision {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<OpenRouterResourceDecision>;
  if (
    parsed.decision !== "request_resource_approval" &&
    parsed.decision !== "abort"
  ) {
    throw new Error('OpenRouter decision must be "request_resource_approval" or "abort"');
  }
  if (typeof parsed.rationale !== "string" || parsed.rationale.trim().length === 0) {
    throw new Error("OpenRouter decision must include a non-empty rationale");
  }
  return {
    decision: parsed.decision,
    rationale: parsed.rationale.trim(),
  };
}

export async function requestOpenRouterPaymentDecision(
  options: Omit<OpenRouterChatCompletionOptions, "prompt"> & {
    prompt?: string;
  }
): Promise<{
  rawContent: string;
  decision: OpenRouterPaymentDecision;
}> {
  const response = await fetch(
    `${options.baseUrl ?? "https://openrouter.ai/api/v1"}/chat/completions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
        ...(options.referer ? { "http-referer": options.referer } : {}),
        ...(options.title ? { "x-title": options.title } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          {
            role: "user",
            content: options.prompt ?? buildCanonicalPaymentPrompt(),
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
  const rawContent = body.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("OpenRouter response did not contain assistant content");
  }

  return {
    rawContent,
    decision: parseOpenRouterPaymentDecision(rawContent),
  };
}

export async function requestOpenRouterResourceDecision(
  options: Omit<OpenRouterChatCompletionOptions, "prompt"> & {
    prompt?: string;
  }
): Promise<{
  rawContent: string;
  decision: OpenRouterResourceDecision;
}> {
  const response = await fetch(
    `${options.baseUrl ?? "https://openrouter.ai/api/v1"}/chat/completions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
        ...(options.referer ? { "http-referer": options.referer } : {}),
        ...(options.title ? { "x-title": options.title } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          {
            role: "user",
            content: options.prompt ?? buildCanonicalResourcePrompt(),
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
  const rawContent = body.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("OpenRouter response did not contain assistant content");
  }

  return {
    rawContent,
    decision: parseOpenRouterResourceDecision(rawContent),
  };
}
