# AFAL Output Services

`backend/afal/outputs/` owns receipt and capability-response generation behind store-backed services.

## Purpose

- replace fixture-only output generation with persistent service-backed output records
- keep receipt and capability-response behavior separate from settlement execution
- preserve stable canonical IDs for seeded demo flows while allowing generated IDs for new flows

## Scope

- approval receipts
- payment receipts
- resource receipts
- capability responses

## Notes

- this layer does not replace settlement execution
- seeded templates are used for canonical flows so current demo and contract tests remain stable
