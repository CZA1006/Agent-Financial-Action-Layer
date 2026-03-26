#!/usr/bin/env bash
set -euo pipefail

SKIP_HTTP=0
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-sqlite-acceptance.XXXXXX")"

for arg in "$@"; do
  case "$arg" in
    --skip-http)
      SKIP_HTTP=1
      ;;
    *)
      echo "Usage: scripts/check-sqlite-acceptance.sh [--skip-http]" >&2
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
  echo "[accept:sqlite] $label"
  "$@"
}

run_step "typecheck" npm run typecheck
run_step "test suite" npm run test:mock
run_step "sqlite integration demo" npm run demo:sqlite -- "$TMP_ROOT/sqlite-runtime"

if [ "$SKIP_HTTP" -eq 0 ]; then
  run_step "sqlite http payment demo" env AFAL_SQLITE_HTTP_DATA_DIR="$TMP_ROOT/sqlite-http" npm run demo:http-sqlite
  run_step "runtime-agent payment harness" npm run demo:agent-payment -- --data-dir "$TMP_ROOT/agent-harness"
  run_step "runtime-agent resource harness" npm run demo:agent-resource -- --data-dir "$TMP_ROOT/agent-harness-resource"
else
  echo
  echo "[accept:sqlite] skipping sqlite HTTP demos and runtime-agent harness"
fi

run_step "openapi export" npm run export:openapi

echo
echo "[accept:sqlite] sqlite acceptance passed"
