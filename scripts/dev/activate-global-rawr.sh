#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OWNER_DIR="${HOME}/.rawr"
OWNER_FILE="${OWNER_DIR}/global-rawr-owner-path"

prior_owner=""
if [ -f "${OWNER_FILE}" ]; then
  prior_owner="$(tr -d '\r\n' < "${OWNER_FILE}")"
fi

mkdir -p "${OWNER_DIR}"
printf '%s\n' "${ROOT_DIR}" > "${OWNER_FILE}"

"${ROOT_DIR}/scripts/dev/install-global-rawr.sh"

if command -v rawr >/dev/null 2>&1; then
  rawr doctor global --json >/dev/null || true
fi

if [ -z "${prior_owner}" ]; then
  echo "Global rawr owner initialized to this instance."
elif [ "${prior_owner}" = "${ROOT_DIR}" ]; then
  echo "Global rawr owner already pointed to this instance."
else
  echo "Global rawr owner transferred from ${prior_owner} to ${ROOT_DIR}."
fi

echo "Owner file: ${OWNER_FILE}"
echo "Active global rawr owner set to: ${ROOT_DIR}"
