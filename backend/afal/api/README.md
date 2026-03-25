# AFAL API Adapter

`backend/afal/api/` provides a minimal request/response adapter above the AFAL orchestration interfaces.

## Purpose

- expose `executePayment` and `settleResourceUsage` as structured capability handlers
- normalize success and failure envelopes before any HTTP framework is chosen
- keep API boundary logic separate from orchestration logic

## Notes

- this layer is intentionally framework-free and currently implemented as pure functions
- the default handlers use the mock orchestrators under `backend/afal/mock/`
- error mapping is intentionally narrow and only covers the current Phase 1 mock boundary cases
