#!/usr/bin/env bash
set -euo pipefail

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-openrouter-acceptance.XXXXXX")"

cleanup() {
  rm -rf "$TMP_ROOT"
}

trap cleanup EXIT INT TERM

if [ -z "${OPENROUTER_API_KEY:-}" ] && [ ! -f ".env" ]; then
  echo "OPENROUTER_API_KEY must be set in the environment or in a project-root .env file" >&2
  exit 1
fi

run_step() {
  local label="$1"
  shift

  echo
  echo "[accept:external-agent] $label"
  "$@"
}

run_step "payment happy path" npm run demo:openrouter-payment-pilot -- --data-dir "$TMP_ROOT/payment-happy"
run_step "resource happy path" npm run demo:openrouter-resource-pilot -- --data-dir "$TMP_ROOT/resource-happy"

run_step "payment approval rejected" npm run demo:openrouter-payment-pilot -- \
  --data-dir "$TMP_ROOT/payment-rejected" \
  --approval-result rejected

run_step "resource transient retry recovery" npm run demo:openrouter-resource-pilot -- \
  --data-dir "$TMP_ROOT/resource-retry" \
  --confirm-usage-failures-before-success 1 \
  --settle-resource-usage-failures-before-success 1

run_step "payment callback recovery" npm run demo:openrouter-payment-callback-recovery-pilot -- \
  --data-dir "$TMP_ROOT/payment-callback-recovery"

run_step "resource callback recovery" npm run demo:openrouter-resource-callback-recovery-pilot -- \
  --data-dir "$TMP_ROOT/resource-callback-recovery"

echo
echo "[accept:external-agent] external agent sandbox acceptance passed"
