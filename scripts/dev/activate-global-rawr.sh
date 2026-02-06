#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OWNER_DIR="${HOME}/.rawr"
OWNER_FILE="${OWNER_DIR}/global-rawr-owner-path"

mkdir -p "${OWNER_DIR}"
printf '%s\n' "${ROOT_DIR}" > "${OWNER_FILE}"

"${ROOT_DIR}/scripts/dev/install-global-rawr.sh"

if command -v rawr >/dev/null 2>&1; then
  rawr doctor global --json >/dev/null || true
fi

echo "Active global rawr owner set to: ${ROOT_DIR}"
