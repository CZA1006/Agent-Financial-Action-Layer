#!/usr/bin/env sh
set -eu

HOST="${CALLBACK_RECEIVER_HOST:-127.0.0.1}"
PORT="${CALLBACK_RECEIVER_PORT:-3401}"
TARGET_URL="http://${HOST}:${PORT}"

if command -v cloudflared >/dev/null 2>&1; then
  echo "[tunnel:start] using cloudflared for ${TARGET_URL}"
  exec cloudflared tunnel --url "${TARGET_URL}"
fi

if command -v ngrok >/dev/null 2>&1; then
  echo "[tunnel:start] using ngrok for ${TARGET_URL}"
  echo "[tunnel:start] note: ngrok may require a verified account and configured authtoken"
  exec ngrok http "${PORT}" --log stdout
fi

echo "[tunnel:start] no supported tunnel tool found"
echo "[tunnel:start] install cloudflared or ngrok before continuing"
exit 1
