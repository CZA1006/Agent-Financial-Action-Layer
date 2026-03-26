# AFAL Settlement Service

This module owns AFAL-managed settlement execution records for the canonical Phase 1 flows.

Current scope:

- store-backed payment settlement creation
- store-backed resource usage confirmation
- store-backed resource settlement creation
- seeded templates for the canonical payment and resource examples

This is still a Phase 1 skeleton. It does not integrate with a chain, a provider billing API, or a real ledger. It only turns the canonical settlement steps into persistent service-boundary records so AFAL orchestration no longer depends on hard-coded settlement classes.
