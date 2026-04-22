#!/usr/bin/env bash
set -euo pipefail

OUTPUT_ROOT="$(pwd)/dist/external-agent-pilot-release"
HANDOFF_NAME="external-agent-pilot-handoff"
CLIENT_ID="client-demo-001"
TENANT_ID="tenant-demo-001"
AGENT_ID="agent-demo-001"
SUBJECT_DID="did:afal:agent:payment-agent-01"
MANDATE_REFS="mnd-0001,mnd-0002"
MONETARY_BUDGET_REFS="budg-money-001"
RESOURCE_BUDGET_REFS="budg-res-001"
RESOURCE_QUOTA_REFS="quota-001"
PAYMENT_PAYEE_DID="did:afal:agent:fraud-service-01"
RESOURCE_PROVIDER_DID="did:afal:institution:provider-openai"
AFAL_BASE_URL="http://127.0.0.1:3213"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-root)
      OUTPUT_ROOT="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$2")"
      shift 2
      ;;
    --handoff-name)
      HANDOFF_NAME="$2"
      shift 2
      ;;
    --client-id)
      CLIENT_ID="$2"
      shift 2
      ;;
    --tenant-id)
      TENANT_ID="$2"
      shift 2
      ;;
    --agent-id)
      AGENT_ID="$2"
      shift 2
      ;;
    --subject-did)
      SUBJECT_DID="$2"
      shift 2
      ;;
    --mandate-refs)
      MANDATE_REFS="$2"
      shift 2
      ;;
    --monetary-budget-refs)
      MONETARY_BUDGET_REFS="$2"
      shift 2
      ;;
    --resource-budget-refs)
      RESOURCE_BUDGET_REFS="$2"
      shift 2
      ;;
    --resource-quota-refs)
      RESOURCE_QUOTA_REFS="$2"
      shift 2
      ;;
    --payment-payee-did)
      PAYMENT_PAYEE_DID="$2"
      shift 2
      ;;
    --resource-provider-did)
      RESOURCE_PROVIDER_DID="$2"
      shift 2
      ;;
    --afal-base-url)
      AFAL_BASE_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$OUTPUT_ROOT"

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-external-handoff.XXXXXX")"
trap 'rm -rf "$TMP_ROOT"' EXIT

DATA_DIR="$TMP_ROOT/sqlite-data"
BUNDLE_PATH="$OUTPUT_ROOT/afal-external-bundle.json"
HANDOFF_DIR="$OUTPUT_ROOT/$HANDOFF_NAME"
ARCHIVE_PATH="$OUTPUT_ROOT/$HANDOFF_NAME.tar.gz"

echo "[build:external-agent-pilot-handoff-artifact] provision sandbox bundle"
npm run provision:external-agent-sandbox -- \
  --data-dir "$DATA_DIR" \
  --client-id "$CLIENT_ID" \
  --tenant-id "$TENANT_ID" \
  --agent-id "$AGENT_ID" \
  --subject-did "$SUBJECT_DID" \
  --mandate-refs "$MANDATE_REFS" \
  --monetary-budget-refs "$MONETARY_BUDGET_REFS" \
  --resource-budget-refs "$RESOURCE_BUDGET_REFS" \
  --resource-quota-refs "$RESOURCE_QUOTA_REFS" \
  --payment-payee-did "$PAYMENT_PAYEE_DID" \
  --resource-provider-did "$RESOURCE_PROVIDER_DID" \
  --afal-base-url "$AFAL_BASE_URL" \
  --output "$BUNDLE_PATH"

echo "[build:external-agent-pilot-handoff-artifact] package handoff directory"
npm run package:external-agent-pilot-handoff -- \
  --bundle-json "$BUNDLE_PATH" \
  --output-dir "$HANDOFF_DIR"

rm -f "$ARCHIVE_PATH"
tar -C "$OUTPUT_ROOT" -czf "$ARCHIVE_PATH" "$HANDOFF_NAME"

printf '%s\n' \
  "output_root=$OUTPUT_ROOT" \
  "bundle_json=$BUNDLE_PATH" \
  "handoff_dir=$HANDOFF_DIR" \
  "archive=$ARCHIVE_PATH"
