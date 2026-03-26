# AFAL Runtime Service

`backend/afal/service/` is the formal AFAL module runtime above the lower-level orchestration ports.

## Purpose

- expose AFAL as a module service rather than only as mock/demo orchestrator classes
- keep one stable runtime surface for API and future transport layers
- centralize default wiring of seeded module ports and flow orchestrators
- expose module-level command entrypoints separate from the HTTP capability envelope
- provide a seeded durable local mode that swaps JSON file stores in for the default in-memory stores

## Notes

- the current runtime still defaults to the seeded in-memory Phase 1 stack
- `mock/` remains the seeded wiring and demo surface
- this layer is the preferred dependency for AFAL API adapters going forward
- `durable-demo.ts` is the executable entrypoint for the seeded local durable mode
