#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${AFAL_HTTP_HOST:-127.0.0.1}"
PORT="${AFAL_HTTP_PORT:-3212}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/afal-http-async-demo.XXXXXX")"
DATA_DIR="$TMP_DIR/data"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

SERVER_LOG="$TMP_DIR/server.log"
PENDING_RESPONSE="$TMP_DIR/pending-response.json"
APPLY_REQUEST="$TMP_DIR/apply-request.json"
APPLY_RESPONSE="$TMP_DIR/apply-response.json"
RESUME_REQUEST="$TMP_DIR/resume-request.json"
RESUME_RESPONSE="$TMP_DIR/resume-response.json"

node --import tsx/esm "$ROOT/backend/afal/http/durable-server.ts" "$DATA_DIR" "$HOST" "$PORT" \
  >"$SERVER_LOG" 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 50); do
  if curl -sS -o /dev/null "http://$HOST:$PORT/does-not-matter" 2>/dev/null; then
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

node - "$PENDING_RESPONSE" "$APPLY_REQUEST" <<'EOF'
const fs = require("node:fs");

const pending = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const approvalSessionRef = pending.data.approvalSession.approvalSessionId;
const challengeRef = pending.data.challenge.challengeId;
const actionRef = pending.data.intent.intentId;

const request = {
  requestRef: "req-apply-approval-0001",
  input: {
    approvalSessionRef,
    result: {
      approvalResultId: "apr-0001",
      challengeRef,
      actionRef,
      result: "approved",
      approvedBy: "did:afal:owner:alice-01",
      approvalChannel: "trusted-surface:web",
      stepUpAuthUsed: true,
      comment: "First-time fraud provider is acceptable",
      approvalReceiptRef: "rcpt-approval-0001",
      decidedAt: "2026-03-24T12:07:00Z"
    }
  }
};

fs.writeFileSync(process.argv[3], JSON.stringify(request, null, 2));
EOF

curl -sS \
  -X POST "http://$HOST:$PORT/approval-sessions/apply-result" \
  -H 'content-type: application/json' \
  -d @"$APPLY_REQUEST" \
  >"$APPLY_RESPONSE"

node - "$APPLY_RESPONSE" <<'EOF'
const fs = require("node:fs");

const response = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

if (!response.ok) {
  console.error("apply-approval-result did not return ok=true");
  process.exit(1);
}

if (response.capability !== "applyApprovalResult") {
  console.error(`unexpected capability: ${response.capability}`);
  process.exit(1);
}

if (response.data.approvalSession.status !== "approved") {
  console.error("approval session was not updated to approved");
  process.exit(1);
}
EOF

node - "$PENDING_RESPONSE" "$RESUME_REQUEST" <<'EOF'
const fs = require("node:fs");

const pending = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const request = {
  requestRef: "req-resume-action-0001",
  input: {
    approvalSessionRef: pending.data.approvalSession.approvalSessionId
  }
};

fs.writeFileSync(process.argv[3], JSON.stringify(request, null, 2));
EOF

curl -sS \
  -X POST "http://$HOST:$PORT/approval-sessions/resume-action" \
  -H 'content-type: application/json' \
  -d @"$RESUME_REQUEST" \
  >"$RESUME_RESPONSE"

node - "$RESUME_RESPONSE" "$ROOT/docs/examples/http/resume-approved-action.response.sample.json" <<'EOF'
const fs = require("node:fs");

const actual = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expected = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (!actual.ok) {
  console.error("resume-approved-action did not return ok=true");
  process.exit(1);
}

if (actual.capability !== "resumeApprovedAction") {
  console.error(`unexpected capability: ${actual.capability}`);
  process.exit(1);
}

if (actual.data.finalDecision.result !== "approved") {
  console.error("resumed action did not produce an approved final decision");
  process.exit(1);
}

if (actual.data.intent.status !== "settled") {
  console.error("resumed action did not settle the payment intent");
  process.exit(1);
}

if (actual.data.paymentReceipt.receiptId !== expected.data.paymentReceipt.receiptId) {
  console.error("payment receipt id drifted from the canonical sample");
  process.exit(1);
}

if (actual.data.settlement.settlementId !== expected.data.settlement.settlementId) {
  console.error("settlement id drifted from the canonical sample");
  process.exit(1);
}

if (actual.data.capabilityResponse.capability !== "resumeApprovedAction") {
  console.error("capability response did not record resumeApprovedAction");
  process.exit(1);
}

console.log(JSON.stringify({
  summary: {
    capability: actual.capability,
    requestRef: actual.requestRef,
    actionRef: actual.data.intent.intentId,
    finalDecision: actual.data.finalDecision.result,
    settlementRef: actual.data.settlement.settlementId,
    receiptRef: actual.data.paymentReceipt.receiptId
  },
  response: actual
}, null, 2));
EOF
