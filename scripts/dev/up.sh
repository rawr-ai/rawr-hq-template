#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

WEB_URL="${WEB_URL:-http://localhost:5173/}"
COORDINATION_URL="${COORDINATION_URL:-http://localhost:5173/coordination}"
INNGEST_RUNS_URL="${INNGEST_RUNS_URL:-http://localhost:8288/runs}"

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

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts=60

  while [[ $attempts -gt 0 ]]; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      echo "ready: ${label} (${url})"
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 1
  done

  echo "warn: ${label} did not become ready at ${url}" >&2
  return 1
}

open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "${url}" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1 || true
    return 0
  fi
  return 1
}

open_ui_surfaces() {
  if [[ "${RAWR_OPEN_UI:-1}" != "1" ]]; then
    return 0
  fi

  if open_url "${WEB_URL}"; then
    echo "opened: app home (${WEB_URL})"
  else
    echo "info: no browser opener found for ${WEB_URL}"
  fi

  if open_url "${COORDINATION_URL}"; then
    echo "opened: coordination canvas (${COORDINATION_URL})"
  else
    echo "info: no browser opener found for ${COORDINATION_URL}"
  fi

  if open_url "${INNGEST_RUNS_URL}"; then
    echo "opened: inngest runs (${INNGEST_RUNS_URL})"
  else
    echo "info: no browser opener found for ${INNGEST_RUNS_URL}"
  fi
}

bun run dev:server &
app_pid="$!"

bun run dev:web &
web_pid="$!"

bun run dev:workflows &
inngest_pid="$!"

wait_for_http "${WEB_URL}" "web app" || true
wait_for_http "${INNGEST_RUNS_URL}" "inngest runs" || true
open_ui_surfaces

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
