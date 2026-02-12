#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

app_pid=""
inngest_pid=""

cleanup() {
  if [[ -n "${app_pid}" ]]; then
    kill "${app_pid}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${inngest_pid}" ]]; then
    kill "${inngest_pid}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

bun run dev --filter=@rawr/server --filter=@rawr/web &
app_pid="$!"

bun run dev:inngest &
inngest_pid="$!"

wait -n "${app_pid}" "${inngest_pid}"
