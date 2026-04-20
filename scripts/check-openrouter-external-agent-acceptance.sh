#!/usr/bin/env bash
set -euo pipefail

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-openrouter-acceptance.XXXXXX")"
ARTIFACTS_ROOT=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --artifacts-root)
      ARTIFACTS_ROOT="$2"
      shift 2
      ;;
    *)
      echo "Usage: scripts/check-openrouter-external-agent-acceptance.sh [--artifacts-root PATH]" >&2
      exit 1
      ;;
  esac
done

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

artifact_args() {
  local name="$1"
  if [ -z "$ARTIFACTS_ROOT" ]; then
    return 0
  fi

  mkdir -p "$ARTIFACTS_ROOT/$name"
  printf '%s\n%s\n' "--artifacts-dir" "$ARTIFACTS_ROOT/$name"
}

run_step "payment happy path" npm run demo:openrouter-payment-pilot -- \
  --data-dir "$TMP_ROOT/payment-happy" \
  $(artifact_args "payment-happy")
run_step "resource happy path" npm run demo:openrouter-resource-pilot -- \
  --data-dir "$TMP_ROOT/resource-happy" \
  $(artifact_args "resource-happy")

run_step "payment approval rejected" npm run demo:openrouter-payment-pilot -- \
  --data-dir "$TMP_ROOT/payment-rejected" \
  --approval-result rejected \
  $(artifact_args "payment-rejected")

run_step "resource transient retry recovery" npm run demo:openrouter-resource-pilot -- \
  --data-dir "$TMP_ROOT/resource-retry" \
  --confirm-usage-failures-before-success 1 \
  --settle-resource-usage-failures-before-success 1 \
  $(artifact_args "resource-retry")

run_step "payment callback recovery" npm run demo:openrouter-payment-callback-recovery-pilot -- \
  --data-dir "$TMP_ROOT/payment-callback-recovery" \
  $(artifact_args "payment-callback-recovery")

run_step "resource callback recovery" npm run demo:openrouter-resource-callback-recovery-pilot -- \
  --data-dir "$TMP_ROOT/resource-callback-recovery" \
  $(artifact_args "resource-callback-recovery")

echo
echo "[accept:external-agent] external agent sandbox acceptance passed"
