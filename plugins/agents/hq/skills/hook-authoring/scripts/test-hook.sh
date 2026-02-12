#!/usr/bin/env bash
set -euo pipefail

show_usage() {
  cat <<'EOF'
usage:
  test-hook.sh --create-sample <EventName>
  test-hook.sh [--timeout SEC] [--verbose] <hook-script> <input.json>

examples:
  test-hook.sh --create-sample PreToolUse > sample.json
  test-hook.sh ./my-hook.sh sample.json
EOF
}

VERBOSE=0
TIMEOUT=60

if [[ $# -eq 0 ]]; then
  show_usage
  exit 1
fi

if [[ "${1:-}" == "--create-sample" ]]; then
  EVENT="${2:-}"
  if [[ -z "$EVENT" ]]; then
    echo "ERR: missing event name" >&2
    exit 1
  fi

  case "$EVENT" in
    PreToolUse)
      cat <<'JSON'
{
  "hook_event_name": "PreToolUse",
  "cwd": ".",
  "tool_name": "Write",
  "tool_input": { "file_path": "tmp/example.txt", "content": "hello" }
}
JSON
      ;;
    Stop|SubagentStop)
      cat <<'JSON'
{
  "hook_event_name": "Stop",
  "cwd": ".",
  "reason": "agent thinks it is done"
}
JSON
      ;;
    SessionStart|SessionEnd)
      cat <<'JSON'
{
  "hook_event_name": "SessionStart",
  "cwd": "."
}
JSON
      ;;
    *)
      echo "ERR: unknown event name: $EVENT" >&2
      exit 1
      ;;
  esac
  exit 0
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) show_usage; exit 0 ;;
    -v|--verbose) VERBOSE=1; shift ;;
    -t|--timeout) TIMEOUT="${2:-}"; shift 2 ;;
    *) break ;;
  esac
done

if [[ $# -ne 2 ]]; then
  echo "ERR: expected <hook-script> <input.json>" >&2
  show_usage
  exit 1
fi

HOOK_SCRIPT="$1"
INPUT_JSON="$2"

if [[ ! -f "$HOOK_SCRIPT" ]]; then
  echo "ERR: hook script not found: $HOOK_SCRIPT" >&2
  exit 1
fi

if [[ ! -f "$INPUT_JSON" ]]; then
  echo "ERR: input json not found: $INPUT_JSON" >&2
  exit 1
fi

python3 - "$INPUT_JSON" <<'PY'
import json,sys
json.load(open(sys.argv[1], "r", encoding="utf-8"))
PY

export CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
export CLAUDE_PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(pwd)}"
export CLAUDE_ENV_FILE="${CLAUDE_ENV_FILE:-/tmp/claude-hook-env-$$}"

if [[ $VERBOSE -eq 1 ]]; then
  echo "INFO: hook: $HOOK_SCRIPT"
  echo "INFO: input: $INPUT_JSON"
  echo "INFO: timeout: ${TIMEOUT}s"
fi

python3 - "$TIMEOUT" "$INPUT_JSON" "$HOOK_SCRIPT" <<'PY'
import json
import os
import subprocess
import sys
import time

timeout_s = int(sys.argv[1])
input_path = sys.argv[2]
hook = sys.argv[3]

payload = open(input_path, "rb").read()

t0 = time.time()
try:
    p = subprocess.run(
        [hook] if os.access(hook, os.X_OK) else ["bash", hook],
        input=payload,
        capture_output=True,
        timeout=timeout_s,
        env=os.environ.copy(),
    )
except subprocess.TimeoutExpired:
    print("status: timeout")
    sys.exit(1)
dt = time.time() - t0

print(f"duration_sec: {dt:.3f}")
print(f"exit_code: {p.returncode}")
stdout = (p.stdout or b"").decode("utf-8", errors="replace")
stderr = (p.stderr or b"").decode("utf-8", errors="replace")

print("---- stdout ----")
print(stdout if stdout.strip() else "(empty)")
try:
    obj = json.loads(stdout)
    print("---- stdout (json) ----")
    print(json.dumps(obj, indent=2, sort_keys=True))
except Exception:
    pass

print("---- stderr ----")
print(stderr if stderr.strip() else "(empty)")

if p.returncode in (0, 2):
    sys.exit(0)
sys.exit(1)
PY

