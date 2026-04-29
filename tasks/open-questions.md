# Open Questions

## Resolved For Current Sandbox

1. First EVM testnet: Base Sepolia.
2. First stablecoin test token: Base Sepolia USDC.
3. First wallet signing surface: MetaMask human-in-the-loop.
4. First external LLM route: OpenRouter-backed pilot agents.
5. First external validation surface: standalone handoff package against GCP staging.

## Phase 2 Open Questions

1. Which Coinbase x402 scenario should be the first pilot: paid API, content/resource access, or service-agent invoice?
2. Which package name should the TypeScript SDK use: `@afal/client`, `@afal/sdk`, or another namespace?
3. Should Claude Code integration be a documented tool wrapper first or a packaged MCP/server-style tool?
4. Which RPC provider should verify Base Sepolia and later mainnet transactions?
5. What minimum confirmation/finality policy is enough for testnet demo versus production pilot?
6. What is the first payee/provider verification contract: pull-based `getActionStatus`, callback delivery, or both?
7. Should AFAL require downstream rails to reject requests without AFAL receipt evidence, or should that remain a demo convention until partner integration?
8. What is the first hosted sandbox domain and HTTPS strategy?

## Longer-Term Questions

1. Which EVM chain / L2 do we target first for production?
2. Which stablecoin do we support first for production: USDC or USDT?
3. Do we define our own DID method initially, or use a simplified internal DID model?
4. Which parts of credential verification are on-chain vs off-chain?
5. How much of mandate enforcement is on-chain vs off-chain?
6. What is the first trusted surface: web app or separate approval app?
7. What is the first ERC-4337 account stack strategy?
8. What fields are mandatory in Payment Intent v1?
9. What fields are mandatory in Resource Intent v1?
