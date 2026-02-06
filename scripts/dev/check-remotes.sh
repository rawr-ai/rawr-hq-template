#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

origin_url="$(git remote get-url origin 2>/dev/null || true)"
expected_origin="https://github.com/rawr-ai/rawr-hq-template.git"

if [ "${origin_url}" != "${expected_origin}" ]; then
  echo "[rawr-remotes] origin mismatch: expected ${expected_origin}, got ${origin_url}" >&2
  exit 1
fi
