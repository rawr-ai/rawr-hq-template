#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
BUN_BINARY="${RAWR_BUN_BINARY:-$(command -v bun)}"

exec /usr/bin/env \
  -u BUN_CONFIG \
  -u BUN_INSTALL \
  -u BUN_INSTALL_CACHE_DIR \
  -u BUN_OPTIONS \
  -u BUN_PRELOAD \
  -u BUN_WORKSPACE \
  -u NODE_OPTIONS \
  -u NODE_PATH \
  "${BUN_BINARY}" \
  --config=/dev/null \
  --no-env-file \
  --no-install \
  "${ROOT_DIR}/scripts/controller/cli-build-production.ts" \
  activate \
  "$@"
