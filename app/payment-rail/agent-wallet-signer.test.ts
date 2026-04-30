import test from "node:test";
import assert from "node:assert/strict";

import { paymentFlowFixtures } from "../../sdk/fixtures";
import {
  loadAgentWalletSignerConfig,
  validateAgentWalletPayment,
  type AgentWalletSignerConfig,
} from "./agent-wallet-signer";

const PAYEE = "0x2222222222222222222222222222222222222222";

const config: AgentWalletSignerConfig = {
  privateKey: "0xabc",
  rpcUrl: "https://sepolia.base.org",
  maxAmount: "0.01",
  tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  allowedPayeeAddresses: [PAYEE],
  confirmations: 1,
  chainId: 84532,
};

const input = {
  intent: {
    ...paymentFlowFixtures.paymentIntentCreated,
    payee: {
      ...paymentFlowFixtures.paymentIntentCreated.payee,
      settlementAddress: PAYEE,
    },
    amount: "0.01",
    asset: "USDC",
    chain: "base-sepolia",
  },
  decision: paymentFlowFixtures.authorizationDecisionFinal,
};

test("agent wallet signer loads constrained Base Sepolia config from env", () => {
  const loaded = loadAgentWalletSignerConfig({
    AGENT_WALLET_PRIVATE_KEY: "0xabc",
    AGENT_WALLET_RPC_URL: "https://sepolia.base.org",
    AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES: PAYEE,
    AGENT_WALLET_MAX_USDC_AMOUNT: "0.02",
  });

  assert.equal(loaded.privateKey, "0xabc");
  assert.equal(loaded.rpcUrl, "https://sepolia.base.org");
  assert.equal(loaded.maxAmount, "0.02");
  assert.deepEqual(loaded.allowedPayeeAddresses, [PAYEE]);
  assert.equal(loaded.chainId, 84532);
});

test("agent wallet signer accepts an approved in-policy Base Sepolia USDC payment", () => {
  const validated = validateAgentWalletPayment(input, config);

  assert.equal(validated.actionRef, input.intent.intentId);
  assert.equal(validated.to, PAYEE);
  assert.equal(validated.amountUnits, 10000n);
});

test("agent wallet signer rejects non-approved decisions", () => {
  assert.throws(
    () =>
      validateAgentWalletPayment(
        {
          ...input,
          decision: paymentFlowFixtures.authorizationDecisionInitial,
        },
        config
      ),
    /must be approved/
  );
});

test("agent wallet signer rejects amount above configured cap", () => {
  assert.throws(
    () =>
      validateAgentWalletPayment(
        {
          ...input,
          intent: {
            ...input.intent,
            amount: "0.02",
          },
        },
        config
      ),
    /exceeds AGENT_WALLET_MAX_USDC_AMOUNT/
  );
});

test("agent wallet signer rejects payees outside the allowlist", () => {
  assert.throws(
    () =>
      validateAgentWalletPayment(
        {
          ...input,
          intent: {
            ...input.intent,
            payee: {
              ...input.intent.payee,
              settlementAddress: "0x3333333333333333333333333333333333333333",
            },
          },
        },
        config
      ),
    /not in AGENT_WALLET_ALLOWED_PAYEE_ADDRESSES/
  );
});
