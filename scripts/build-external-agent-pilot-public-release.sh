#!/usr/bin/env bash
set -euo pipefail

OUTPUT_ROOT="$(pwd)/dist/external-agent-pilot-public-release"
PACKAGE_NAME="external-agent-pilot-public-release"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-root)
      OUTPUT_ROOT="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$2")"
      shift 2
      ;;
    --package-name)
      PACKAGE_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$OUTPUT_ROOT"

PACKAGE_DIR="$OUTPUT_ROOT/$PACKAGE_NAME"
ARCHIVE_PATH="$OUTPUT_ROOT/$PACKAGE_NAME.tar.gz"

echo "[build:external-agent-pilot-public-release] package release-safe directory"
npm run package:external-agent-pilot-public-release -- \
  --output-dir "$PACKAGE_DIR"

rm -f "$ARCHIVE_PATH"
tar -C "$OUTPUT_ROOT" -czf "$ARCHIVE_PATH" "$PACKAGE_NAME"

printf '%s\n' \
  "output_root=$OUTPUT_ROOT" \
  "package_dir=$PACKAGE_DIR" \
  "archive=$ARCHIVE_PATH"
