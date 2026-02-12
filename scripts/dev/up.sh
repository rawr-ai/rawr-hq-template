#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

app_pid=""
web_pid=""
inngest_pid=""

cleanup() {
  if [[ -n "${app_pid}" ]]; then
    kill "${app_pid}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${web_pid}" ]]; then
    kill "${web_pid}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${inngest_pid}" ]]; then
    kill "${inngest_pid}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

bun run dev:server &
app_pid="$!"

bun run dev:web &
web_pid="$!"

bun run dev:workflows &
inngest_pid="$!"

wait_for_any_exit() {
  while true; do
    for pid in "${app_pid}" "${web_pid}" "${inngest_pid}"; do
      if ! kill -0 "${pid}" >/dev/null 2>&1; then
        wait "${pid}" 2>/dev/null || true
        return
      fi
    done
    sleep 1
  done
}

wait_for_any_exit
