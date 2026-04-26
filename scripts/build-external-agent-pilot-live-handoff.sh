#!/usr/bin/env bash
set -euo pipefail

AFAL_BASE_URL=""
ALLOW_LOCAL=0
FORWARD_ARGS=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --afal-base-url)
      if [ "${2:-}" = "" ]; then
        echo "[build:external-agent-pilot-live-handoff] missing value for --afal-base-url" >&2
        exit 1
      fi
      AFAL_BASE_URL="$2"
      FORWARD_ARGS+=("$1" "$2")
      shift 2
      ;;
    --allow-local)
      ALLOW_LOCAL=1
      shift
      ;;
    --help)
      cat <<'USAGE'
Usage:
  scripts/build-external-agent-pilot-live-handoff.sh \
    --afal-base-url <reachable-public-afal-url> \
    [build-external-agent-pilot-handoff-artifact args...]

This command refuses localhost URLs by default and verifies the AFAL base URL is
reachable before it builds a credential-bearing external handoff package.

Use --allow-local only for local operator drills.
USAGE
      exit 0
      ;;
    *)
      if [ "${2:-}" = "" ]; then
        echo "[build:external-agent-pilot-live-handoff] missing value for $1" >&2
        exit 1
      fi
      FORWARD_ARGS+=("$1" "$2")
      shift 2
      ;;
  esac
done

if [ "$AFAL_BASE_URL" = "" ]; then
  echo "[build:external-agent-pilot-live-handoff] --afal-base-url is required" >&2
  exit 1
fi

case "$AFAL_BASE_URL" in
  http://127.*|https://127.*|http://localhost*|https://localhost*)
    if [ "$ALLOW_LOCAL" -ne 1 ]; then
      echo "[build:external-agent-pilot-live-handoff] refusing local AFAL_BASE_URL: $AFAL_BASE_URL" >&2
      echo "[build:external-agent-pilot-live-handoff] use --allow-local only for local operator drills" >&2
      exit 1
    fi
    ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "[build:external-agent-pilot-live-handoff] curl is required for liveness preflight" >&2
  exit 1
fi

BODY_PATH="$(mktemp "${TMPDIR:-/tmp}/afal-live-handoff-preflight.XXXXXX")"
trap 'rm -f "$BODY_PATH"' EXIT

echo "[build:external-agent-pilot-live-handoff] preflight AFAL_BASE_URL=$AFAL_BASE_URL"
HTTP_CODE="$(
  curl -L -sS \
    --max-time 10 \
    -o "$BODY_PATH" \
    -w "%{http_code}" \
    "$AFAL_BASE_URL/" || true
)"

if [ "$HTTP_CODE" = "" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "[build:external-agent-pilot-live-handoff] AFAL_BASE_URL is not reachable" >&2
  exit 1
fi

if grep -qiE 'ERR_NGROK_3200|endpoint .* offline|tunnel .* offline' "$BODY_PATH"; then
  echo "[build:external-agent-pilot-live-handoff] AFAL_BASE_URL appears to be an offline tunnel" >&2
  exit 1
fi

if [ "$HTTP_CODE" -ge 500 ]; then
  echo "[build:external-agent-pilot-live-handoff] AFAL_BASE_URL returned HTTP $HTTP_CODE" >&2
  exit 1
fi

echo "[build:external-agent-pilot-live-handoff] preflight passed with HTTP $HTTP_CODE"
exec bash scripts/build-external-agent-pilot-handoff-artifact.sh "${FORWARD_ARGS[@]}"
