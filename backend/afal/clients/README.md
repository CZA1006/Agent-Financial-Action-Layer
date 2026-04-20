# AFAL External Agent Client Boundary

`backend/afal/clients/` owns the first minimal sandbox-facing client registry for real external agent integrations.

## Purpose

This layer exists to move AFAL from:

- local harness-driven integration

to:

- a sandbox surface that can authenticate and scope real external agent clients

## Current Responsibilities

- persist external agent client records
- persist replay-detection records
- authenticate signed client requests into AFAL public routes
- map registered callback URLs back to receiver-facing payment and resource notifications

## Notes

- this is a sandbox integration boundary, not a production IAM system
- request signing is currently symmetric and deterministic
- replay protection is currently keyed by `requestRef + timestamp`
- callback registration is currently stored inside the client record rather than exposed through a separate public API
