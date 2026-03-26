#!/usr/bin/env bash
set -euo pipefail

SKIP_HTTP=0
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-local-acceptance.XXXXXX")"

for arg in "$@"; do
  case "$arg" in
    --skip-http)
      SKIP_HTTP=1
      ;;
    *)
      echo "Usage: scripts/check-local-acceptance.sh [--skip-http]" >&2
      exit 1
      ;;
  esac
done

cleanup() {
  rm -rf "$TMP_ROOT"
}

trap cleanup EXIT INT TERM

run_step() {
  local label="$1"
  shift

  echo
  echo "[accept] $label"
  "$@"
}

run_step "typecheck" npm run typecheck
run_step "test suite" npm run test:mock
run_step "durable runtime demo" npm run demo:durable -- "$TMP_ROOT/durable-runtime"

if [ "$SKIP_HTTP" -eq 0 ]; then
  run_step "durable http payment demo" env AFAL_HTTP_DATA_DIR="$TMP_ROOT/http-payment" npm run demo:http
  run_step "durable http resource demo" env AFAL_HTTP_DATA_DIR="$TMP_ROOT/http-resource" npm run demo:http-resource
  run_step "durable http payment summary demo" env AFAL_HTTP_DATA_DIR="$TMP_ROOT/http-payment-summary" npm run demo:http-payment
else
  echo
  echo "[accept] skipping durable HTTP demos"
fi

run_step "openapi export" npm run export:openapi

echo
echo "[accept] local acceptance passed"
