#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OLD_REF="${1:-}"
NEW_REF="${2:-HEAD}"
SOURCE="${3:-hook}"

cd "${ROOT_DIR}"

branch="$(git branch --show-current)"
if [ "${branch}" != "main" ]; then
  exit 0
fi

changed_files=""
if [ -n "${OLD_REF}" ] && git rev-parse --verify --quiet "${OLD_REF}^{commit}" >/dev/null; then
  changed_files="$(git diff --name-only "${OLD_REF}" "${NEW_REF}" || true)"
elif git rev-parse --verify --quiet ORIG_HEAD^{commit} >/dev/null; then
  changed_files="$(git diff --name-only ORIG_HEAD HEAD || true)"
fi

if [ -n "${changed_files}" ]; then
  if ! printf '%s\n' "${changed_files}" | grep -Eq '^(apps/cli/|packages/|plugins/|package.json|bun.lock|turbo\.json|tsconfig)'; then
    exit 0
  fi
fi

echo "[rawr-auto-refresh] source=${SOURCE} branch=main"

if ! bun install --frozen-lockfile >/dev/null 2>&1; then
  bun install >/dev/null
fi

"${ROOT_DIR}/scripts/dev/install-global-rawr.sh" >/dev/null

if rawr --version >/dev/null 2>&1; then
  echo "[rawr-auto-refresh] global rawr refreshed and smoke-checked"
else
  echo "[rawr-auto-refresh] warning: refresh completed, but smoke check failed" >&2
fi
