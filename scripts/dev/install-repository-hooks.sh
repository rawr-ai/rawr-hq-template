#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! git -C "${ROOT_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

git -C "${ROOT_DIR}" config core.hooksPath scripts/githooks
