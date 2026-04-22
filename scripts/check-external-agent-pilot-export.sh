#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR=""
WITH_INSTALL=0
KEEP_OUTPUT=0
ROOT=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --with-install)
      WITH_INSTALL=1
      shift 1
      ;;
    --keep-output)
      KEEP_OUTPUT=1
      shift 1
      ;;
    *)
      echo "Usage: scripts/check-external-agent-pilot-export.sh [--output-dir PATH] [--with-install] [--keep-output]" >&2
      exit 1
      ;;
  esac
done

if [ -n "$OUTPUT_DIR" ]; then
  ROOT="$OUTPUT_DIR"
  mkdir -p "$ROOT"
  KEEP_OUTPUT=1
else
  ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-external-agent-export-check.XXXXXX")"
fi

cleanup() {
  if [ "$KEEP_OUTPUT" -eq 0 ]; then
    rm -rf "$ROOT"
  else
    echo "[validate:external-agent-pilot-export] output kept at $ROOT"
  fi
}

trap cleanup EXIT INT TERM

echo "[validate:external-agent-pilot-export] export skeleton"
node scripts/export-standalone-external-agent-pilot.mjs --output-dir "$ROOT"

require_path() {
  local path="$1"
  if [ ! -e "$ROOT/$path" ]; then
    echo "[validate:external-agent-pilot-export] missing expected path: $path" >&2
    exit 1
  fi
}

require_path ".env.example"
require_path ".gitignore"
require_path "README.md"
require_path "package.json"
require_path "tsconfig.json"
require_path "src/payment-client.ts"
require_path "src/resource-client.ts"
require_path "src/callback-receiver.ts"

echo "[validate:external-agent-pilot-export] verify README and package metadata"
if grep -q "docs/product/" "$ROOT/README.md"; then
  echo "[validate:external-agent-pilot-export] exported README still contains monorepo doc links" >&2
  exit 1
fi

if grep -q "samples/standalone-external-agent-pilot" "$ROOT/README.md"; then
  echo "[validate:external-agent-pilot-export] exported README still references monorepo sample paths" >&2
  exit 1
fi

if [ "$WITH_INSTALL" -eq 1 ]; then
  echo "[validate:external-agent-pilot-export] install external skeleton dependencies"
  (
    cd "$ROOT"
    npm install
    npx tsc --noEmit
  )
fi

echo "[validate:external-agent-pilot-export] validation passed"
