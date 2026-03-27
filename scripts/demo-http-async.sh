#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${AFAL_HTTP_HOST:-127.0.0.1}"
PORT="${AFAL_HTTP_PORT:-3212}"
TRUSTED_SURFACE_HOST="${TRUSTED_SURFACE_HOST:-127.0.0.1}"
TRUSTED_SURFACE_PORT="${TRUSTED_SURFACE_PORT:-3312}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/afal-http-async-demo.XXXXXX")"
DATA_DIR="$TMP_DIR/data"
SERVER_PID=""
TRUSTED_SURFACE_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [ -n "$TRUSTED_SURFACE_PID" ] && kill -0 "$TRUSTED_SURFACE_PID" 2>/dev/null; then
    kill "$TRUSTED_SURFACE_PID" 2>/dev/null || true
    wait "$TRUSTED_SURFACE_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

SERVER_LOG="$TMP_DIR/server.log"
TRUSTED_SURFACE_LOG="$TMP_DIR/trusted-surface.log"
PENDING_RESPONSE="$TMP_DIR/pending-response.json"
STUB_RESPONSE="$TMP_DIR/trusted-surface-response.json"

node --import tsx/esm "$ROOT/backend/afal/http/durable-server.ts" "$DATA_DIR" "$HOST" "$PORT" \
  >"$SERVER_LOG" 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 50); do
  if curl -sS -o /dev/null "http://$HOST:$PORT/does-not-matter" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

node --import tsx/esm "$ROOT/app/trusted-surface/server.ts" \
  --afal-base-url "http://$HOST:$PORT" \
  --host "$TRUSTED_SURFACE_HOST" \
  --port "$TRUSTED_SURFACE_PORT" \
  >"$TRUSTED_SURFACE_LOG" 2>&1 &
TRUSTED_SURFACE_PID="$!"

for _ in $(seq 1 50); do
  if curl -sS -o /dev/null "http://$TRUSTED_SURFACE_HOST:$TRUSTED_SURFACE_PORT/health" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

curl -sS \
  -X POST "http://$HOST:$PORT/capabilities/request-payment-approval" \
  -H 'content-type: application/json' \
  -d @"$ROOT/docs/examples/http/request-payment-approval.request.json" \
  >"$PENDING_RESPONSE"

node - "$PENDING_RESPONSE" <<'EOF'
const fs = require("node:fs");

const response = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!response.ok) {
  console.error("request-payment-approval did not return ok=true");
  process.exit(1);
}

if (response.capability !== "requestPaymentApproval") {
  console.error(`unexpected capability: ${response.capability}`);
  process.exit(1);
}

if (response.data.capabilityResponse.result !== "pending-approval") {
  console.error("request-payment-approval did not produce pending-approval");
  process.exit(1);
}

if (response.data.approvalSession.status !== "pending") {
  console.error("approval session was not persisted in pending state");
  process.exit(1);
}
EOF

APPROVAL_SESSION_REF="$(node - "$PENDING_RESPONSE" <<'EOF'
const fs = require("node:fs");

const pending = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.stdout.write(pending.data.approvalSession.approvalSessionId);
EOF
)"

curl -sS \
  -X POST "http://$TRUSTED_SURFACE_HOST:$TRUSTED_SURFACE_PORT/approval-sessions/review" \
  -H 'content-type: application/json' \
  -d "{\"requestRef\":\"req-http-async-service\",\"input\":{\"approvalSessionRef\":\"$APPROVAL_SESSION_REF\",\"requestRefPrefix\":\"req-http-async\",\"decidedAt\":\"2026-03-24T12:07:00Z\",\"comment\":\"First-time fraud provider is acceptable\"}}" \
  >"$STUB_RESPONSE"

node - "$STUB_RESPONSE" "$ROOT/docs/examples/http/resume-approved-action.response.sample.json" <<'EOF'
const fs = require("node:fs");

const actual = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expected = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
if (!actual.ok) {
  console.error("trusted-surface service did not return ok=true");
  process.exit(1);
}

const resumed = actual.data.resumed;

if (!resumed) {
  console.error("trusted-surface service did not return a resumed action payload");
  process.exit(1);
}

if (actual.data.summary.result !== "approved") {
  console.error("trusted-surface service did not record an approved result");
  process.exit(1);
}

if (resumed.finalDecision.result !== "approved") {
  console.error("resumed action did not produce an approved final decision");
  process.exit(1);
}

if (resumed.intent.status !== "settled") {
  console.error("resumed action did not settle the payment intent");
  process.exit(1);
}

if (resumed.paymentReceipt.receiptId !== expected.data.paymentReceipt.receiptId) {
  console.error("payment receipt id drifted from the canonical sample");
  process.exit(1);
}

if (resumed.settlement.settlementId !== expected.data.settlement.settlementId) {
  console.error("settlement id drifted from the canonical sample");
  process.exit(1);
}

if (resumed.capabilityResponse.capability !== "resumeApprovedAction") {
  console.error("capability response did not record resumeApprovedAction");
  process.exit(1);
}

console.log(JSON.stringify({
  summary: {
    capability: "resumeApprovedAction",
    requestRef: "req-http-async-resume",
    actionRef: resumed.intent.intentId,
    finalDecision: resumed.finalDecision.result,
    settlementRef: resumed.settlement.settlementId,
    receiptRef: resumed.paymentReceipt.receiptId
  },
  response: resumed
}, null, 2));
EOF
