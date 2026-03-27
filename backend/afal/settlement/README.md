# AFAL Settlement Service

This module owns AFAL-managed settlement execution records for the canonical Phase 1 flows.

Current scope:

- explicit payment-rail and resource-provider adapter boundaries
- store-backed payment settlement creation
- store-backed resource usage confirmation
- store-backed resource settlement creation
- seeded adapters for the canonical payment and resource examples
- HTTP adapters for independent payment/provider stub services
- shared-token auth and signed request metadata placeholders for the current external HTTP stub path

This is still a Phase 1 skeleton. It does not integrate with a chain, a provider billing API, or a real ledger yet. It now separates:

- external adapter execution
- AFAL-owned settlement and usage record persistence

That means later real payment rails or provider billing adapters can replace the seeded adapters without changing AFAL orchestration entrypoints.
