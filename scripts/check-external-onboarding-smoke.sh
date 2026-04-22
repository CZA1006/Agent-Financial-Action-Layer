#!/usr/bin/env bash
set -euo pipefail

ARTIFACTS_ROOT=""
ROOT=""
KEEP_ROOT=0
SERVER_PID=""
RECEIVER_PID=""

SERVER_HOST="127.0.0.1"
SERVER_PORT="33213"
RECEIVER_HOST="127.0.0.1"
RECEIVER_PORT="33401"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --artifacts-root)
      ARTIFACTS_ROOT="$2"
      shift 2
      ;;
    *)
      echo "Usage: scripts/check-external-onboarding-smoke.sh [--artifacts-root PATH]" >&2
      exit 1
      ;;
  esac
done

if [ -n "$ARTIFACTS_ROOT" ]; then
  ROOT="$ARTIFACTS_ROOT"
  mkdir -p "$ROOT"
  KEEP_ROOT=1
else
  ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-external-onboarding-smoke.XXXXXX")"
fi

SERVER_DATA_DIR="$ROOT/sqlite-http-data"
BUNDLE_PATH="$ROOT/client-bundle.json"
SERVER_LOG="$ROOT/server.log"
RECEIVER_LOG="$ROOT/callback-receiver.log"
REGISTER_OUTPUT="$ROOT/register.json"
GET_OUTPUT="$ROOT/get.json"
LIST_OUTPUT="$ROOT/list.json"
PAYMENT_OUTPUT="$ROOT/payment.json"
RESOURCE_OUTPUT="$ROOT/resource.json"
CALLBACK_ARTIFACTS_DIR="$ROOT/callback-artifacts"

cleanup() {
  local exit_code=$?

  if [ -n "$RECEIVER_PID" ] && kill -0 "$RECEIVER_PID" 2>/dev/null; then
    kill "$RECEIVER_PID" 2>/dev/null || true
    wait "$RECEIVER_PID" 2>/dev/null || true
  fi

  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  if [ "$exit_code" -eq 0 ] && [ "$KEEP_ROOT" -eq 0 ]; then
    rm -rf "$ROOT"
    return
  fi

  echo "[accept:external-onboarding] artifacts kept at $ROOT"
}

trap cleanup EXIT INT TERM

run_step() {
  local label="$1"
  shift

  echo
  echo "[accept:external-onboarding] $label"
  "$@"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local log_path="${3:-}"

  for _ in $(seq 1 100); do
    if curl -s -o /dev/null "$url"; then
      return 0
    fi
    sleep 0.2
  done

  echo "[accept:external-onboarding] timed out waiting for $label at $url" >&2
  if [ -n "$log_path" ] && [ -f "$log_path" ]; then
    echo "[accept:external-onboarding] last log lines from $log_path:" >&2
    tail -n 40 "$log_path" >&2 || true
  fi
  exit 1
}

run_standalone_script() {
  local output_path="$1"
  local script_path="$2"
  shift 2

  env \
    AFAL_BASE_URL="http://$SERVER_HOST:$SERVER_PORT" \
    AFAL_CLIENT_ID="client-standalone-smoke-001" \
    AFAL_SIGNING_KEY="$AFAL_SIGNING_KEY" \
    AFAL_MONETARY_BUDGET_REF="budg-money-001" \
    AFAL_RESOURCE_BUDGET_REF="budg-res-001" \
    AFAL_RESOURCE_QUOTA_REF="quota-001" \
    AFAL_PAYMENT_CALLBACK_URL="http://$RECEIVER_HOST:$RECEIVER_PORT/callbacks/action-settled" \
    AFAL_RESOURCE_CALLBACK_URL="http://$RECEIVER_HOST:$RECEIVER_PORT/callbacks/action-settled" \
    CALLBACK_RECEIVER_HOST="$RECEIVER_HOST" \
    CALLBACK_RECEIVER_PORT="$RECEIVER_PORT" \
    CALLBACK_RECEIVER_ARTIFACTS_DIR="$CALLBACK_ARTIFACTS_DIR" \
    node --import tsx/esm "$script_path" "$@" >"$output_path"
}

echo
echo "[accept:external-onboarding] start sqlite http sandbox"
SERVER_PID="$(tail -n 1 <<<"$(
  bash -lc "
    cd \"$PWD\"
    npm run serve:sqlite-http -- \"$SERVER_DATA_DIR\" \"$SERVER_HOST\" \"$SERVER_PORT\" >\"$SERVER_LOG\" 2>&1 &
    echo \$!
  "
)")"

wait_for_http "http://$SERVER_HOST:$SERVER_PORT" "sqlite http sandbox" "$SERVER_LOG"

run_step "provision sandbox client" npm run provision:external-agent-sandbox -- \
  --data-dir "$SERVER_DATA_DIR" \
  --client-id client-standalone-smoke-001 \
  --tenant-id tenant-standalone-smoke-001 \
  --agent-id agent-standalone-smoke-001 \
  --subject-did did:afal:agent:payment-agent-01 \
  --mandate-refs mnd-0001,mnd-0002 \
  --monetary-budget-refs budg-money-001 \
  --resource-budget-refs budg-res-001 \
  --resource-quota-refs quota-001 \
  --payment-payee-did did:afal:agent:fraud-service-01 \
  --resource-provider-did did:afal:institution:provider-openai \
  --afal-base-url "http://$SERVER_HOST:$SERVER_PORT" \
  --output "$BUNDLE_PATH"

AFAL_SIGNING_KEY="$(
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const bundle = JSON.parse(readFileSync(process.argv[1], "utf8"));
    process.stdout.write(bundle.auth.signingKey);
  ' "$BUNDLE_PATH"
)"
export AFAL_SIGNING_KEY

echo
echo "[accept:external-onboarding] start standalone callback receiver"
RECEIVER_PID="$(tail -n 1 <<<"$(
  bash -lc "
    cd \"$PWD\"
    env \
      AFAL_BASE_URL=\"http://$SERVER_HOST:$SERVER_PORT\" \
      AFAL_CLIENT_ID=\"client-standalone-smoke-001\" \
      AFAL_SIGNING_KEY=\"$AFAL_SIGNING_KEY\" \
      AFAL_MONETARY_BUDGET_REF=\"budg-money-001\" \
      AFAL_RESOURCE_BUDGET_REF=\"budg-res-001\" \
      AFAL_RESOURCE_QUOTA_REF=\"quota-001\" \
      AFAL_PAYMENT_CALLBACK_URL=\"http://$RECEIVER_HOST:$RECEIVER_PORT/callbacks/action-settled\" \
      AFAL_RESOURCE_CALLBACK_URL=\"http://$RECEIVER_HOST:$RECEIVER_PORT/callbacks/action-settled\" \
      CALLBACK_RECEIVER_HOST=\"$RECEIVER_HOST\" \
      CALLBACK_RECEIVER_PORT=\"$RECEIVER_PORT\" \
      CALLBACK_RECEIVER_ARTIFACTS_DIR=\"$CALLBACK_ARTIFACTS_DIR\" \
      node --import tsx/esm samples/standalone-external-agent-pilot/src/callback-receiver.ts >\"$RECEIVER_LOG\" 2>&1 &
    echo \$!
  "
)")"

wait_for_http "http://$RECEIVER_HOST:$RECEIVER_PORT" "standalone callback receiver" "$RECEIVER_LOG"

run_step "register callback urls" run_standalone_script \
  "$REGISTER_OUTPUT" \
  "samples/standalone-external-agent-pilot/src/register-callback.ts"

run_step "get callback registration" run_standalone_script \
  "$GET_OUTPUT" \
  "samples/standalone-external-agent-pilot/src/get-callback-registration.ts"

run_step "list callback registrations" run_standalone_script \
  "$LIST_OUTPUT" \
  "samples/standalone-external-agent-pilot/src/list-callback-registrations.ts"

run_step "submit payment request" run_standalone_script \
  "$PAYMENT_OUTPUT" \
  "samples/standalone-external-agent-pilot/src/payment-client.ts"

run_step "submit resource request" run_standalone_script \
  "$RESOURCE_OUTPUT" \
  "samples/standalone-external-agent-pilot/src/resource-client.ts"

run_step "validate smoke-test outputs" node --input-type=module - "$BUNDLE_PATH" "$REGISTER_OUTPUT" "$GET_OUTPUT" "$LIST_OUTPUT" "$PAYMENT_OUTPUT" "$RESOURCE_OUTPUT" <<'EOF'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [
  bundlePath,
  registerPath,
  getPath,
  listPath,
  paymentPath,
  resourcePath,
] = process.argv.slice(2);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const bundle = readJson(bundlePath);
const registerResponse = readJson(registerPath);
const getResponse = readJson(getPath);
const listResponse = readJson(listPath);
const paymentResponse = readJson(paymentPath);
const resourceResponse = readJson(resourcePath);

assert.equal(bundle.subjectDid, "did:afal:agent:payment-agent-01");
assert.deepEqual(bundle.mandateRefs, ["mnd-0001", "mnd-0002"]);
assert.deepEqual(bundle.monetaryBudgetRefs, ["budg-money-001"]);
assert.deepEqual(bundle.resourceBudgetRefs, ["budg-res-001"]);
assert.deepEqual(bundle.resourceQuotaRefs, ["quota-001"]);

assert.equal(registerResponse.ok, true);
assert.equal(registerResponse.capability, "registerExternalCallback");
assert.equal(
  registerResponse.data?.callbackRegistration?.paymentSettlementUrl,
  "http://127.0.0.1:33401/callbacks/action-settled"
);
assert.equal(
  registerResponse.data?.callbackRegistration?.resourceSettlementUrl,
  "http://127.0.0.1:33401/callbacks/action-settled"
);

assert.equal(getResponse.ok, true);
assert.equal(getResponse.capability, "getExternalCallbackRegistration");
assert.deepEqual(getResponse.data?.callbackRegistration?.eventTypes, [
  "payment.settled",
  "resource.settled",
]);

assert.equal(listResponse.ok, true);
assert.equal(listResponse.capability, "listExternalCallbackRegistrations");
assert.ok(Array.isArray(listResponse.data));
assert.equal(listResponse.data.length, 1);
assert.equal(listResponse.data[0]?.clientId, "client-standalone-smoke-001");

assert.equal(paymentResponse.ok, true);
assert.equal(paymentResponse.capability, "requestPaymentApproval");
assert.equal(paymentResponse.data?.intent?.intentId, "payint-0001");
assert.equal(paymentResponse.data?.intent?.payer?.agentDid, "did:afal:agent:payment-agent-01");
assert.equal(paymentResponse.data?.capabilityResponse?.result, "pending-approval");
assert.ok(paymentResponse.data?.approvalSession?.approvalSessionId);

assert.equal(resourceResponse.ok, true);
assert.equal(resourceResponse.capability, "requestResourceApproval");
assert.equal(resourceResponse.data?.intent?.intentId, "resint-0001");
assert.equal(
  resourceResponse.data?.intent?.requester?.agentDid,
  "did:afal:agent:payment-agent-01"
);
assert.equal(resourceResponse.data?.capabilityResponse?.result, "pending-approval");
assert.ok(resourceResponse.data?.approvalSession?.approvalSessionId);
EOF

echo
echo "[accept:external-onboarding] external onboarding smoke passed"
echo "[accept:external-onboarding] artifacts: $ROOT"
