#!/usr/bin/env bash
set -euo pipefail
DIR="$(mktemp -d)"
echo "E2E dataDir=$DIR"
DISABLE_HMR=true VITE_PORT=3010 npm run dev -- --port 3010 --host 127.0.0.1 &
DEV_PID=$!
cleanup() {
  kill "$DEV_PID" 2>/dev/null || true
  rm -rf "$DIR" 2>/dev/null || true
}
trap cleanup EXIT
# Wait for server to be ready (with timeout)
for i in $(seq 1 90); do
  if curl -s http://127.0.0.1:3010/ >/dev/null 2>&1; then
    echo "Dev server ready"
    wait "$DEV_PID"
    exit 0
  fi
  sleep 1
done
echo "Dev server did not become ready" >&2
exit 1
