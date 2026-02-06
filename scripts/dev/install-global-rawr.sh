#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GLOBAL_BIN_DIR="$(bun pm bin -g 2>/dev/null || true)"

if [ -z "${GLOBAL_BIN_DIR}" ]; then
  GLOBAL_BIN_DIR="${HOME}/.bun/bin"
fi

TARGET_BIN="${GLOBAL_BIN_DIR}/rawr"
SOURCE_BIN="${ROOT_DIR}/apps/cli/bin/run.js"

mkdir -p "${GLOBAL_BIN_DIR}"

if [ ! -x "${SOURCE_BIN}" ]; then
  echo "rawr install: expected executable not found at ${SOURCE_BIN}" >&2
  exit 1
fi

# Replace stale files/symlinks.
if [ -L "${TARGET_BIN}" ] || [ -e "${TARGET_BIN}" ]; then
  rm -f "${TARGET_BIN}"
fi

ln -s "${SOURCE_BIN}" "${TARGET_BIN}"

echo "Installed Bun-global rawr symlink at ${TARGET_BIN}"
echo "Target: ${SOURCE_BIN}"
