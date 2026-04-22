#!/usr/bin/env bash
set -euo pipefail

ROOT=""
KEEP_OUTPUT=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-root)
      ROOT="$2"
      KEEP_OUTPUT=1
      shift 2
      ;;
    --keep-output)
      KEEP_OUTPUT=1
      shift 1
      ;;
    *)
      echo "Usage: scripts/check-external-agent-pilot-release-surfaces.sh [--output-root PATH] [--keep-output]" >&2
      exit 1
      ;;
  esac
done

if [ -z "$ROOT" ]; then
  ROOT="$(mktemp -d "${TMPDIR:-/tmp}/afal-external-release-surfaces.XXXXXX")"
fi

HANDOFF_ROOT="$ROOT/internal-handoff"
PUBLIC_ROOT="$ROOT/public-release"
HANDOFF_DIR="$HANDOFF_ROOT/external-agent-pilot-handoff"
PUBLIC_DIR="$PUBLIC_ROOT/external-agent-pilot-public-release"

cleanup() {
  if [ "$KEEP_OUTPUT" -eq 0 ]; then
    rm -rf "$ROOT"
  else
    echo "[validate:external-agent-pilot-release-surfaces] output kept at $ROOT"
  fi
}

trap cleanup EXIT INT TERM

echo "[validate:external-agent-pilot-release-surfaces] build internal handoff artifact"
npm run build:external-agent-pilot-handoff-artifact -- --output-root "$HANDOFF_ROOT"

echo "[validate:external-agent-pilot-release-surfaces] build public release package"
npm run build:external-agent-pilot-public-release -- --output-root "$PUBLIC_ROOT"

require_path() {
  local path="$1"
  if [ ! -e "$path" ]; then
    echo "[validate:external-agent-pilot-release-surfaces] missing expected path: $path" >&2
    exit 1
  fi
}

require_absent() {
  local path="$1"
  if [ -e "$path" ]; then
    echo "[validate:external-agent-pilot-release-surfaces] expected path to be absent: $path" >&2
    exit 1
  fi
}

require_grep() {
  local pattern="$1"
  local path="$2"
  if ! grep -q "$pattern" "$path"; then
    echo "[validate:external-agent-pilot-release-surfaces] expected '$pattern' in $path" >&2
    exit 1
  fi
}

require_no_grep() {
  local pattern="$1"
  local path="$2"
  if grep -q "$pattern" "$path"; then
    echo "[validate:external-agent-pilot-release-surfaces] unexpected '$pattern' in $path" >&2
    exit 1
  fi
}

require_path "$HANDOFF_ROOT/afal-external-bundle.json"
require_path "$HANDOFF_DIR/.env"
require_path "$HANDOFF_DIR/bundle.json"
require_path "$HANDOFF_DIR/manifest.json"
require_path "$HANDOFF_ROOT/external-agent-pilot-handoff.tar.gz"

require_path "$PUBLIC_DIR/.env.template"
require_path "$PUBLIC_DIR/bundle.template.json"
require_path "$PUBLIC_DIR/manifest.json"
require_path "$PUBLIC_ROOT/external-agent-pilot-public-release.tar.gz"
require_absent "$PUBLIC_DIR/.env"
require_absent "$PUBLIC_DIR/bundle.json"

require_grep 'AFAL_SIGNING_KEY=' "$HANDOFF_DIR/.env"
require_no_grep 'AFAL_SIGNING_KEY=request-from-afal-team' "$HANDOFF_DIR/.env"
require_no_grep 'AFAL_CLIENT_ID=replace-with-provisioned-client-id' "$HANDOFF_DIR/.env"

require_grep 'AFAL_SIGNING_KEY=request-from-afal-team' "$PUBLIC_DIR/.env.template"
require_grep 'AFAL_BASE_URL=https://replace-with-afal-base-url' "$PUBLIC_DIR/.env.template"
require_grep '"signingKey": "request-from-afal-team"' "$PUBLIC_DIR/bundle.template.json"
require_no_grep '"signingKey": "[0-9a-f]\{32\}"' "$PUBLIC_DIR/bundle.template.json"

require_grep 'external-agent-pilot-v\*' ".github/workflows/external-agent-pilot-release.yml"
require_grep 'releaseSafe' "$PUBLIC_DIR/manifest.json"

echo "[validate:external-agent-pilot-release-surfaces] validation passed"
