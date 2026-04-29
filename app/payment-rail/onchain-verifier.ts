import type { WalletPaymentConfirmation } from "./server";

export const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const DEFAULT_USDC_DECIMALS = 6;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
}

export interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number;
  result: T;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
  };
}

export interface EvmLog {
  address: string;
  topics: string[];
  data: string;
}

export interface EvmTransactionReceipt {
  transactionHash: string;
  status?: string;
  blockNumber?: string;
  logs: EvmLog[];
}

export interface WalletPaymentVerifier {
  verify(confirmation: WalletPaymentConfirmation): Promise<WalletPaymentVerification>;
}

export interface WalletPaymentVerification {
  ok: true;
  verifiedAt: string;
  chainId: number;
  txHash: string;
  logIndex: number;
}

export interface JsonRpcWalletPaymentVerifierConfig {
  rpcUrl: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function normalizeHex(value: string): string {
  return value.toLowerCase();
}

function normalizeAddress(value: string): string {
  const normalized = normalizeHex(value);
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw new Error(`invalid EVM address "${value}"`);
  }
  return normalized;
}

function topicAddress(topic: string): string {
  const normalized = normalizeHex(topic);
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(`invalid indexed address topic "${topic}"`);
  }
  return `0x${normalized.slice(-40)}`;
}

function parseHexQuantity(value: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`invalid hex quantity "${value}"`);
  }
  return BigInt(value);
}

export function decimalToUnits(value: string, decimals = DEFAULT_USDC_DECIMALS): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`invalid decimal amount "${value}"`);
  }
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new Error(`amount "${value}" has more than ${decimals} decimals`);
  }
  const paddedFraction = fraction.padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
}

function isJsonRpcFailure(response: unknown): response is JsonRpcFailure {
  return Boolean(
    response &&
      typeof response === "object" &&
      "error" in response &&
      response.error &&
      typeof response.error === "object" &&
      "message" in response.error &&
      typeof response.error.message === "string"
  );
}

function isJsonRpcSuccess<T>(response: unknown): response is JsonRpcSuccess<T> {
  return Boolean(response && typeof response === "object" && "result" in response);
}

export class JsonRpcWalletPaymentVerifier implements WalletPaymentVerifier {
  private readonly rpcUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(config: JsonRpcWalletPaymentVerifierConfig) {
    this.rpcUrl = config.rpcUrl;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  async verify(confirmation: WalletPaymentConfirmation): Promise<WalletPaymentVerification> {
    const chainId = await this.rpc<`0x${string}`>("eth_chainId", []);
    const parsedChainId = Number.parseInt(chainId, 16);
    if (parsedChainId !== confirmation.chainId) {
      throw new Error(
        `chain mismatch: expected ${confirmation.chainId}, got ${parsedChainId}`
      );
    }

    const receipt = await this.rpc<EvmTransactionReceipt | null>(
      "eth_getTransactionReceipt",
      [confirmation.txHash]
    );
    if (!receipt) {
      throw new Error(`transaction receipt not found for "${confirmation.txHash}"`);
    }
    if (normalizeHex(receipt.transactionHash) !== normalizeHex(confirmation.txHash)) {
      throw new Error("transaction receipt hash does not match requested txHash");
    }
    if (normalizeHex(receipt.status ?? "") !== "0x1") {
      throw new Error(`transaction status is not successful: ${receipt.status}`);
    }
    if (!receipt.blockNumber) {
      throw new Error("transaction is not included in a block yet");
    }
    if (!Array.isArray(receipt.logs)) {
      throw new Error("transaction receipt logs are missing");
    }

    const expectedToken = normalizeAddress(confirmation.tokenAddress);
    const expectedFrom = normalizeAddress(confirmation.from);
    const expectedTo = normalizeAddress(confirmation.to);
    const expectedAmount = decimalToUnits(confirmation.amount);

    const matchingLogIndex = receipt.logs.findIndex((log) => {
      if (normalizeHex(log.address) !== expectedToken) {
        return false;
      }
      if (normalizeHex(log.topics[0] ?? "") !== ERC20_TRANSFER_TOPIC) {
        return false;
      }
      if (topicAddress(log.topics[1] ?? "") !== expectedFrom) {
        return false;
      }
      if (topicAddress(log.topics[2] ?? "") !== expectedTo) {
        return false;
      }
      return parseHexQuantity(log.data) === expectedAmount;
    });

    if (matchingLogIndex === -1) {
      throw new Error(
        "transaction receipt does not contain the expected ERC-20 Transfer event"
      );
    }

    return {
      ok: true,
      verifiedAt: this.now().toISOString(),
      chainId: parsedChainId,
      txHash: confirmation.txHash,
      logIndex: matchingLogIndex,
    };
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    };
    const response = await this.fetchImpl(this.rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`RPC request failed with HTTP ${response.status}`);
    }
    const json = await response.json() as unknown;
    if (isJsonRpcFailure(json)) {
      throw new Error(`RPC error: ${json.error.message}`);
    }
    if (!isJsonRpcSuccess<T>(json)) {
      throw new Error("RPC response is missing result");
    }
    return json.result;
  }
}
