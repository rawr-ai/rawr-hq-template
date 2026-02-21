#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GLOBAL_BIN_DIR="$(bun pm bin -g 2>/dev/null || true)"
OWNER_FILE="${HOME}/.rawr/global-rawr-owner-path"

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

owner_workspace=""
owner_workspace_real=""
owner_seam_status="owner-file-missing"
current_root_real="$(cd "${ROOT_DIR}" && pwd -P)"

if [ -f "${OWNER_FILE}" ]; then
  owner_seam_status="owner-file-empty"
  owner_workspace="$(tr -d '\r\n' < "${OWNER_FILE}")"
  if [ -n "${owner_workspace}" ]; then
    owner_seam_status="owner-other-instance"
    if [ -d "${owner_workspace}" ]; then
      owner_workspace_real="$(cd "${owner_workspace}" && pwd -P)"
    fi
    if [ -n "${owner_workspace_real}" ] && [ "${owner_workspace_real}" = "${current_root_real}" ]; then
      owner_seam_status="owner-current-instance"
    fi
  fi
fi

echo "Installed Bun-global rawr symlink at ${TARGET_BIN}"
echo "Target: ${SOURCE_BIN}"
echo "Instance root: ${ROOT_DIR}"
echo "Alias/instance seam: ${owner_seam_status}"
echo "Owner file: ${OWNER_FILE}"

if [ -n "${owner_workspace}" ]; then
  echo "Owner workspace: ${owner_workspace}"
fi

if [ "${owner_seam_status}" = "owner-other-instance" ]; then
  echo "Note: symlink now targets this checkout, but owner remains explicit and points to another instance."
  echo "To transfer ownership explicitly, run: ./scripts/dev/activate-global-rawr.sh"
fi

if [ "${owner_seam_status}" = "owner-file-missing" ]; then
  echo "Note: no owner file is set; run ./scripts/dev/activate-global-rawr.sh to claim this instance explicitly."
fi
