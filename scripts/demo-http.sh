#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-payment}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${AFAL_HTTP_HOST:-127.0.0.1}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/afal-http-demo.XXXXXX")"
DATA_DIR="${AFAL_HTTP_DATA_DIR:-$TMP_DIR/data}"
PORT="${AFAL_HTTP_PORT:-$((33000 + RANDOM % 1000))}"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT INT TERM

case "$MODE" in
  payment)
    PATHNAME="/capabilities/execute-payment"
    REQUEST_PATH="$ROOT/docs/examples/http/execute-payment.request.json"
    EXPECTED_PATH="$ROOT/docs/examples/http/execute-payment.response.sample.json"
    ;;
  resource)
    PATHNAME="/capabilities/settle-resource-usage"
    REQUEST_PATH="$ROOT/docs/examples/http/settle-resource-usage.request.json"
    EXPECTED_PATH="$ROOT/docs/examples/http/settle-resource-usage.response.sample.json"
    ;;
  *)
    echo "Usage: scripts/demo-http.sh [payment|resource]" >&2
    exit 1
    ;;
esac

SERVER_LOG="$TMP_DIR/server.log"
ACTUAL_PATH="$TMP_DIR/actual-response.json"

node --import tsx/esm "$ROOT/backend/afal/http/durable-server.ts" "$DATA_DIR" "$HOST" "$PORT" \
  >"$SERVER_LOG" 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 50); do
  if curl -sS -o /dev/null "http://$HOST:$PORT/does-not-matter" 2>/dev/null; then
    break
  fi
  if [ -n "$SERVER_PID" ] && ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "AFAL durable HTTP server exited before becoming ready." >&2
    cat "$SERVER_LOG" >&2 || true
    exit 1
  fi
  sleep 0.2
done

if ! curl -sS -o /dev/null "http://$HOST:$PORT/does-not-matter" 2>/dev/null; then
  echo "AFAL durable HTTP server did not become ready in time." >&2
  cat "$SERVER_LOG" >&2 || true
  exit 1
fi

curl -sS \
  -X POST "http://$HOST:$PORT$PATHNAME" \
  -H 'content-type: application/json' \
  -d @"$REQUEST_PATH" \
  >"$ACTUAL_PATH"

node - "$ACTUAL_PATH" "$EXPECTED_PATH" <<'EOF'
const fs = require("node:fs");

const actualPath = process.argv[2];
const expectedPath = process.argv[3];
const actual = JSON.parse(fs.readFileSync(actualPath, "utf8"));
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error("HTTP demo response did not match expected sample.");
  console.error(`actual:   ${actualPath}`);
  console.error(`expected: ${expectedPath}`);
  process.exit(1);
}

console.log(JSON.stringify(actual, null, 2));
EOF
