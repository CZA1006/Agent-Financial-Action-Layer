# Staging Sandbox Operator Runbook

## Purpose

Use this runbook when AFAL needs a reachable sandbox for repo-external validation.

This is the preferred path for Round 002 and later external engineer runs.
It replaces ad hoc `ngrok-free` links as the validation baseline.

The goal is simple:

- keep one AFAL SQLite HTTP sandbox reachable for the whole validation window
- provision one scoped external client for the target engineer
- generate one live handoff artifact only after the public AFAL URL passes preflight
- record enough metadata to interpret the engineer's findings later

---

## When To Use This

Use this runbook for:

- directed external engineer validation
- partner sandbox tests
- live internal handoff artifacts with real provisioned clients
- any round where the engineer is not on the same machine as AFAL

Do not use this runbook for:

- public GitHub Release assets
- template-only release packages
- local smoke tests that intentionally use `127.0.0.1`

For public release assets, use:

- [external-agent-pilot-release-handbook.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-pilot-release-handbook.md)

---

## Staging Host Requirements

Minimum host requirements:

- Node.js 22 or newer
- `npm`
- outbound network access
- one reachable inbound HTTP or HTTPS endpoint
- a persistent working directory for SQLite sandbox state
- a process supervisor or terminal session that stays alive for the validation window

Recommended network shape:

```text
external engineer
  -> https://afal-sandbox.example.com
  -> reverse proxy / tunnel endpoint
  -> AFAL SQLite HTTP server on 127.0.0.1:3213 or 0.0.0.0:3213
```

Preferred:

- stable HTTPS domain or VM IP
- reverse proxy such as Caddy or Nginx
- one fresh data directory per validation round

Acceptable for short operator drills:

- `cloudflared tunnel --url http://127.0.0.1:3213`
- `ngrok http 3213` only when the tunnel is known to stay online for the scheduled test window

Do not treat a short-lived tunnel URL as a durable pinned baseline.

---

## Start The Sandbox

From the AFAL repo on the staging host:

```bash
npm ci
mkdir -p /srv/afal/round-002/sqlite-data
npm run serve:sqlite-http -- /srv/afal/round-002/sqlite-data 0.0.0.0 3213
```

Notes:

- `npm run serve:sqlite-http` enables external-client auth.
- The positional args are `dataDir host port`.
- Use a fresh `dataDir` per validation round when possible.
- If binding directly to the internet, put a reverse proxy or firewall policy in front of it.

For an operator-only local drill:

```bash
npm run serve:sqlite-http -- ./.afal-staging-drill-data 127.0.0.1 3213
```

---

## Verify Liveness

Before provisioning or packaging, verify the public URL from a network path comparable to the engineer's environment:

```bash
export AFAL_BASE_URL=https://afal-sandbox.example.com
curl -i -sS "$AFAL_BASE_URL/"
```

Expected result:

- HTTP response is returned by AFAL, not the tunnel provider
- response is not an offline tunnel page
- HTTP status is below `500`

The root path may return AFAL's JSON `404`; that is acceptable because it proves the request reached AFAL.

Not acceptable:

- `ERR_NGROK_3200`
- tunnel offline pages
- DNS failures
- connection refused
- HTTP `5xx`

---

## Build The Live Handoff

Only after liveness passes, build the live handoff package:

```bash
npm run build:external-agent-pilot-live-handoff -- \
  --afal-base-url "$AFAL_BASE_URL" \
  --output-root dist/round-002-live-handoff \
  --client-id client-round-002-001 \
  --tenant-id tenant-round-002-001 \
  --agent-id agent-round-002-001
```

The live handoff builder:

- requires `--afal-base-url`
- refuses `127.0.0.1` / `localhost` unless `--allow-local` is passed
- performs a liveness preflight before packaging
- delegates provisioning and packaging to the standard internal handoff builder

Expected outputs:

- `dist/round-002-live-handoff/afal-external-bundle.json`
- `dist/round-002-live-handoff/external-agent-pilot-handoff/`
- `dist/round-002-live-handoff/external-agent-pilot-handoff.tar.gz`

Do not send the package if `.env` still points at `127.0.0.1` or a stale tunnel URL.

---

## Operator Verification Before Sending

Run these checks before transferring the package:

```bash
grep -R "AFAL_BASE_URL=$AFAL_BASE_URL" dist/round-002-live-handoff/external-agent-pilot-handoff/.env
grep -R "127.0.0.1:3213" dist/round-002-live-handoff/external-agent-pilot-handoff/.env && exit 1 || true
tar -tzf dist/round-002-live-handoff/external-agent-pilot-handoff.tar.gz >/dev/null
```

Also confirm:

- the engineer receives the actual tarball or extracted directory
- the engineer knows the exact local path of the artifact
- the engineer has a callback tunnel plan
- the callback receiver URL in `.env` will be replaced with the engineer's public callback URL before registration

Preferred tunnel instruction for the engineer:

```bash
cd pilot
npm run tunnel:start
```

That script prefers `cloudflared` and falls back to `ngrok`.
If the engineer uses `ngrok`, they may need a verified account and configured authtoken.

---

## Metadata To Record

Before the round starts, record these values in the round checklist:

- Git commit SHA
- artifact filename
- artifact build date
- AFAL base URL
- server command
- data directory
- client ID
- subject DID
- engineer name
- expected response date
- callback URL plan

Use:

- [external-agent-validation-round-checklist.md](/Users/caizhuoang/Desktop/Dabanc/agent-financial-action-layer/docs/product/external-agent-validation-round-checklist.md)

---

## Rotation And Cleanup

For each external validation round:

- use a new `clientId`
- use a new output directory
- prefer a new SQLite `dataDir`
- stop or archive the staging data after the round

If a handoff package is sent to the wrong recipient:

1. stop using that client
2. create a new staging data directory or provision a replacement client
3. rebuild the handoff package
4. tell the engineer which artifact is authoritative

Current sandbox limitation:

- the repo does not yet expose a full production-grade client revocation flow
- for pilot rounds, isolation is achieved by fresh clients and fresh staging data directories

---

## Failure Handling

If the live handoff builder fails before packaging:

- fix the sandbox URL first
- do not bypass the preflight
- do not send the previous artifact

If the engineer reports the base URL is offline:

1. rerun `curl -i -sS "$AFAL_BASE_URL/"`
2. confirm the server process is still alive
3. confirm the reverse proxy or tunnel is still alive
4. rebuild the handoff only if the AFAL base URL changed

If the engineer reports callback registration failures:

1. verify their callback URL is public HTTPS
2. verify they ran `npm run preflight`
3. verify they replaced the callback URL values in `.env`
4. inspect AFAL server logs for auth, replay, or callback URL validation errors

---

## Exit Criteria

The staging sandbox is ready for external validation only when:

- public AFAL URL passes liveness preflight
- live handoff package has been generated from that URL
- package `.env` contains the expected AFAL base URL
- engineer has the actual artifact in a known local path
- callback tunnel plan is explicit
- round checklist is filled before the engineer starts
