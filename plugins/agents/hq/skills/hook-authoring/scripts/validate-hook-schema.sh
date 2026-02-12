#!/usr/bin/env bash
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" ]]; then
  echo "usage: validate-hook-schema.sh <hooks.json>" >&2
  exit 1
fi

python3 - "$FILE" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

hooks = data.get("hooks", data) if isinstance(data, dict) else None
if not isinstance(hooks, dict):
    raise SystemExit("ERR: expected hooks config to be an object (or {hooks:{...}} wrapper)")

allowed = {
    "PreToolUse",
    "PostToolUse",
    "Stop",
    "SubagentStop",
    "SessionStart",
    "SessionEnd",
    "UserPromptSubmit",
    "PreCompact",
    "Notification",
}

unknown = sorted([k for k in hooks.keys() if k not in allowed])
if unknown:
    raise SystemExit("ERR: unknown hook events: " + ", ".join(unknown))

for event, rules in hooks.items():
    if not isinstance(rules, list):
        raise SystemExit(f"ERR: event {event} must be a list")
    for i, rule in enumerate(rules):
        if not isinstance(rule, dict):
            raise SystemExit(f"ERR: event {event} rule[{i}] must be an object")
        # Keep this permissive: different runtimes evolve rule shapes.
        if "matcher" in rule and not isinstance(rule["matcher"], str):
            raise SystemExit(f"ERR: event {event} rule[{i}].matcher must be a string")
        if "hooks" in rule and not isinstance(rule["hooks"], list):
            raise SystemExit(f"ERR: event {event} rule[{i}].hooks must be a list")

print("ok")
PY

