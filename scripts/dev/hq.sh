#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR="${ROOT_DIR}/.rawr/hq"
STATE_FILE="${STATE_DIR}/state.env"
STATUS_FILE="${STATE_DIR}/status.json"
LOG_FILE="${STATE_DIR}/runtime.log"

HQ_WEB_URL="http://localhost:5173/"
HQ_COORDINATION_URL="http://localhost:5173/coordination"
HQ_INNGEST_RUNS_URL="http://localhost:8288/runs"
HQ_SERVER_HEALTH_URL="http://localhost:3000/health"
HQ_OBSERVABILITY_UI_URL="http://localhost:8080/"
HQ_OBSERVABILITY_OTLP_URL="http://127.0.0.1:4318"

SERVER_PORT=3000
WEB_PORT=5173
INNGEST_PORT=8288
INNGEST_CONNECT_GATEWAY_PORT=8289
INNGEST_CONNECT_GATEWAY_GRPC_PORT=50052
INNGEST_CONNECT_EXECUTOR_GRPC_PORT=50053

action="${1:-}"
shift || true

open_policy="${RAWR_HQ_OPEN:-coordination}"
observability_mode="${RAWR_HQ_OBSERVABILITY:-auto}"

hq_manager_pid=""
hq_server_pid=""
hq_web_pid=""
hq_async_pid=""
hq_started_at=""

stack_started_here=0
shutting_down=0
tail_pid=""
otlp_endpoint=""

log() {
  echo "$*"
}

err() {
  echo "error: $*" >&2
}

ensure_artifact_dir() {
  mkdir -p "$STATE_DIR"
  touch "$LOG_FILE"
}

run_status_writer() {
  bun apps/cli/src/lib/hq-status.ts \
    --workspace-root "$ROOT_DIR" \
    --mode "$observability_mode" \
    --write \
    --quiet
}

validate_open_policy() {
  case "$1" in
    none|coordination|app|app+inngest|all)
      return 0
      ;;
  esac

  err "invalid open policy '$1' (expected one of: none, coordination, app, app+inngest, all)"
  exit 2
}

validate_observability_mode() {
  case "$1" in
    auto|required|off)
      return 0
      ;;
  esac

  err "invalid observability mode '$1' (expected one of: auto, required, off)"
  exit 2
}

is_pid_running() {
  local pid="${1:-}"
  if [[ -z "$pid" || ! "$pid" =~ ^[0-9]+$ ]]; then
    return 1
  fi

  kill -0 "$pid" >/dev/null 2>&1
}

load_state() {
  hq_manager_pid=""
  hq_server_pid=""
  hq_web_pid=""
  hq_async_pid=""
  hq_started_at=""
  hq_open_policy=""
  hq_observability_mode=""

  if [[ ! -f "$STATE_FILE" ]]; then
    return 1
  fi

  # shellcheck disable=SC1090
  source "$STATE_FILE"
  return 0
}

managed_pid_candidates() {
  load_state >/dev/null 2>&1 || return 0
  printf '%s\n' "$hq_manager_pid" "$hq_server_pid" "$hq_web_pid" "$hq_async_pid" | awk '/^[0-9]+$/'
}

state_has_live_processes() {
  load_state >/dev/null 2>&1 || return 1

  if is_pid_running "$hq_manager_pid"; then return 0; fi
  if is_pid_running "$hq_server_pid"; then return 0; fi
  if is_pid_running "$hq_web_pid"; then return 0; fi
  if is_pid_running "$hq_async_pid"; then return 0; fi
  return 1
}

prune_dead_state_for_start() {
  if [[ -f "$STATE_FILE" ]] && ! state_has_live_processes; then
    rm -f "$STATE_FILE"
  fi
}

write_state_file() {
  ensure_artifact_dir
  cat >"$STATE_FILE" <<STATE
hq_manager_pid=$$
hq_server_pid=${hq_server_pid}
hq_web_pid=${hq_web_pid}
hq_async_pid=${hq_async_pid}
hq_started_at=${hq_started_at}
# Persist the chosen posture so later `rawr hq status` calls can report the
# active HQ mode even when no explicit flags are passed.
hq_open_policy=${open_policy}
hq_observability_mode=${observability_mode}
STATE
}

listener_pids_for_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | awk -v port=":${port}" '$4 ~ port { print "unknown" }' | sort -u || true
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | awk -v port=".${port} " '$0 ~ port && $0 ~ /LISTEN/ { print "unknown" }' | sort -u || true
  fi
}

is_managed_pid() {
  local pid="$1"
  local managed
  while IFS= read -r managed; do
    if [[ -n "$managed" && "$managed" == "$pid" ]]; then
      return 0
    fi
  done < <(managed_pid_candidates)
  return 1
}

port_has_unmanaged_listener() {
  local port="$1"
  local pid
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    if [[ "$pid" == "unknown" ]]; then
      return 0
    fi
    if ! is_managed_pid "$pid"; then
      return 0
    fi
  done < <(listener_pids_for_port "$port")

  return 1
}

assert_lifecycle_ports_available() {
  local port
  for port in \
    "$SERVER_PORT" \
    "$WEB_PORT" \
    "$INNGEST_PORT" \
    "$INNGEST_CONNECT_GATEWAY_PORT" \
    "$INNGEST_CONNECT_GATEWAY_GRPC_PORT" \
    "$INNGEST_CONNECT_EXECUTOR_GRPC_PORT"; do
    if port_has_unmanaged_listener "$port"; then
      err "lifecycle port ${port} is already in use"
      log "remediation:"
      log "  - inspect listeners: lsof -nP -iTCP:${port} -sTCP:LISTEN"
      log "  - stop the conflicting process or use 'rawr hq down' if this workspace owns it"
      exit 1
    fi
  done
}

ensure_observability_posture() {
  if [[ "$observability_mode" == "off" ]]; then
    otlp_endpoint=""
    return 0
  fi

  if ! command -v docker >/dev/null 2>&1; then
    if [[ "$observability_mode" == "required" ]]; then
      err "docker is required for --observability required"
      exit 1
    fi
    log "warn: docker not available; continuing without managed HyperDX support"
    otlp_endpoint=""
    return 0
  fi

  local container_running=""
  container_running="$(docker inspect --format '{{.State.Running}}' rawr-hq-hyperdx 2>/dev/null || true)"
  # The managed HyperDX container is expected to own 8080/4318 when observability is enabled.
  # Check it before the generic port-conflict branch so required mode does not reject the managed stack itself.
  if [[ "$container_running" == "true" ]]; then
    otlp_endpoint="$HQ_OBSERVABILITY_OTLP_URL"
    return 0
  fi

  local ui_conflict=0
  local otlp_conflict=0
  if port_has_unmanaged_listener 8080; then ui_conflict=1; fi
  if port_has_unmanaged_listener 4318; then otlp_conflict=1; fi
  if [[ "$ui_conflict" -eq 1 || "$otlp_conflict" -eq 1 ]]; then
    if [[ "$observability_mode" == "required" ]]; then
      err "HyperDX support ports 8080/4318 are already in use"
      exit 1
    fi
    log "warn: HyperDX support ports are occupied; continuing without managed observability"
    otlp_endpoint=""
    return 0
  fi

  if [[ "$observability_mode" == "required" ]]; then
    err "HyperDX container rawr-hq-hyperdx is not running"
    log "remediation: docker start rawr-hq-hyperdx"
    exit 1
  fi

  log "warn: HyperDX container rawr-hq-hyperdx is not running; continuing without managed observability"
  otlp_endpoint=""
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts=45

  while [[ "$attempts" -gt 0 ]]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "ready: ${label} (${url})"
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 1
  done

  log "warn: ${label} did not become ready at ${url}"
  return 1
}

open_url() {
  local url="$1"

  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
    return 0
  fi

  return 1
}

open_ui_surfaces() {
  local should_open_observability=0
  if [[ "$open_policy" != "none" && -n "$otlp_endpoint" ]]; then
    should_open_observability=1
  fi

  case "$open_policy" in
    none)
      log "open policy: none"
      ;;
    coordination)
      open_url "$HQ_COORDINATION_URL" || true
      ;;
    app)
      open_url "$HQ_WEB_URL" || true
      ;;
    app+inngest)
      open_url "$HQ_WEB_URL" || true
      open_url "$HQ_INNGEST_RUNS_URL" || true
      ;;
    all)
      open_url "$HQ_WEB_URL" || true
      open_url "$HQ_COORDINATION_URL" || true
      open_url "$HQ_INNGEST_RUNS_URL" || true
      ;;
  esac

  # HyperDX is part of the managed local stack posture, so when the stack opens
  # browser surfaces we also pop the observability UI instead of hiding it
  # behind a special-case `--open all` requirement.
  if [[ "$should_open_observability" -eq 1 ]]; then
    open_url "$HQ_OBSERVABILITY_UI_URL" || true
  fi
}

list_descendants() {
  local parent="$1"

  if ! command -v pgrep >/dev/null 2>&1; then
    return 0
  fi

  local child
  while IFS= read -r child; do
    [[ -n "$child" ]] || continue
    list_descendants "$child"
    printf '%s\n' "$child"
  done < <(pgrep -P "$parent" 2>/dev/null || true)
}

signal_pid_tree() {
  local pid="$1"
  local signal_name="$2"

  if ! is_pid_running "$pid"; then
    return 0
  fi

  local child
  while IFS= read -r child; do
    [[ -n "$child" ]] || continue
    kill "-${signal_name}" "$child" >/dev/null 2>&1 || true
  done < <(list_descendants "$pid" | awk '/^[0-9]+$/' | sort -u)

  kill "-${signal_name}" "$pid" >/dev/null 2>&1 || true
}

wait_for_pid_exit() {
  local pid="$1"
  local timeout_seconds="$2"
  local elapsed=0

  while is_pid_running "$pid"; do
    if [[ "$elapsed" -ge "$timeout_seconds" ]]; then
      return 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  return 0
}

stop_managed_stack() {
  load_state >/dev/null 2>&1 || true
  local candidates
  candidates="$(printf '%s\n' "$hq_manager_pid" "$hq_server_pid" "$hq_web_pid" "$hq_async_pid" | awk '/^[0-9]+$/' | sort -u)"

  if [[ -z "$candidates" ]]; then
    rm -f "$STATE_FILE"
    run_status_writer
    log "info: no managed HQ runtime state found"
    return 0
  fi

  log "stopping managed HQ runtime"

  local pid
  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    signal_pid_tree "$pid" INT
  done <<<"$candidates"

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    wait_for_pid_exit "$pid" 5 || true
  done <<<"$candidates"

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    signal_pid_tree "$pid" TERM
  done <<<"$candidates"

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    wait_for_pid_exit "$pid" 5 || true
  done <<<"$candidates"

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    if is_pid_running "$pid"; then
      signal_pid_tree "$pid" KILL
    fi
  done <<<"$candidates"

  rm -f "$STATE_FILE"
  run_status_writer
  log "stopped managed HQ runtime"
}

wait_for_any_exit() {
  while true; do
    local pid
    for pid in "$hq_server_pid" "$hq_web_pid" "$hq_async_pid"; do
      if [[ -z "$pid" ]]; then
        continue
      fi

      if ! is_pid_running "$pid"; then
        set +e
        wait "$pid" 2>/dev/null
        local status=$?
        set -e

        if [[ "$shutting_down" -eq 1 ]]; then
          return 0
        fi
        if [[ "$status" -eq 130 || "$status" -eq 143 ]]; then
          return 0
        fi

        return "$status"
      fi
    done
    sleep 1
  done
}

cleanup_running_stack() {
  if [[ "$stack_started_here" -ne 1 ]]; then
    return 0
  fi

  local pid
  for pid in "$hq_server_pid" "$hq_web_pid" "$hq_async_pid"; do
    if [[ -n "$pid" ]]; then
      signal_pid_tree "$pid" TERM
    fi
  done

  for pid in "$hq_server_pid" "$hq_web_pid" "$hq_async_pid"; do
    if [[ -n "$pid" ]]; then
      wait_for_pid_exit "$pid" 5 || true
    fi
  done

  for pid in "$hq_server_pid" "$hq_web_pid" "$hq_async_pid"; do
    if [[ -n "$pid" ]] && is_pid_running "$pid"; then
      signal_pid_tree "$pid" KILL
    fi
  done

  rm -f "$STATE_FILE"
  run_status_writer
}

graceful_shutdown() {
  shutting_down=1
  cleanup_running_stack
}

cleanup() {
  if [[ -n "$tail_pid" ]] && is_pid_running "$tail_pid"; then
    kill "$tail_pid" >/dev/null 2>&1 || true
  fi

  if [[ "$shutting_down" -eq 0 ]]; then
    cleanup_running_stack
  fi
}

trap cleanup EXIT
trap 'graceful_shutdown; exit 0' INT TERM

show_help() {
  cat <<HELP
Usage: scripts/dev/hq.sh <up|down|status|restart|attach> [--open <policy>] [--observability <mode>]

Open policies:
  none | coordination | app | app+inngest | all

Observability modes:
  auto | required | off

Environment:
  RAWR_HQ_OPEN
  RAWR_HQ_OBSERVABILITY
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --open)
      open_policy="${2:-}"
      shift 2
      ;;
    --observability)
      observability_mode="${2:-}"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      err "unknown argument: $1"
      show_help
      exit 2
      ;;
  esac
done

case "$action" in
  up|down|status|restart|attach)
    ;;
  *)
    err "expected an HQ lifecycle action"
    show_help
    exit 2
    ;;
esac

validate_open_policy "$open_policy"
validate_observability_mode "$observability_mode"
ensure_artifact_dir

if [[ "$action" == "status" ]]; then
  run_status_writer
  if [[ -f "$STATUS_FILE" ]]; then
    cat "$STATUS_FILE"
  fi
  exit 0
fi

if [[ "$action" == "down" ]]; then
  stop_managed_stack
  exit 0
fi

if [[ "$action" == "attach" ]]; then
  run_status_writer
  load_state >/dev/null 2>&1 || true
  if ! is_pid_running "$hq_manager_pid"; then
    err "no managed HQ runtime is currently running"
    exit 1
  fi

  log "attaching to ${LOG_FILE}"
  tail -n 40 -F "$LOG_FILE" &
  tail_pid="$!"
  while is_pid_running "$hq_manager_pid"; do
    sleep 2
  done
  run_status_writer
  exit 0
fi

if [[ "$action" == "restart" ]]; then
  stop_managed_stack
fi

prune_dead_state_for_start
if state_has_live_processes; then
  err "managed HQ runtime is already running"
  log "remediation: use 'rawr hq status', 'rawr hq attach', 'rawr hq down', or 'rawr hq restart'"
  exit 1
fi

assert_lifecycle_ports_available
ensure_observability_posture

: >"$LOG_FILE"

log "starting managed HQ runtime"
log "  server: ${HQ_SERVER_HEALTH_URL}"
log "  web: ${HQ_WEB_URL}"
log "  async: ${HQ_INNGEST_RUNS_URL}"
log "  observability mode: ${observability_mode}"
if [[ -n "$otlp_endpoint" ]]; then
  log "  otlp http: ${otlp_endpoint}"
  log "  observability ui: ${HQ_OBSERVABILITY_UI_URL}"
fi

(
  cd apps/server
  if [[ -n "$otlp_endpoint" ]]; then
    exec env \
      OTEL_EXPORTER_OTLP_ENDPOINT="$otlp_endpoint" \
      INNGEST_DEV="http://localhost:${INNGEST_PORT}" \
      bun --hot src/index.ts > >(tee -a "$LOG_FILE") 2>&1
  fi
  # Tell the host server it is running against the local Inngest Dev Server so
  # `/api/inngest` accepts unsigned dev sync/serve handshakes without weakening
  # production ingress verification.
  exec env INNGEST_DEV="http://localhost:${INNGEST_PORT}" bun --hot src/index.ts > >(tee -a "$LOG_FILE") 2>&1
) &
hq_server_pid="$!"

(
  cd apps/web
  exec bunx vite --strictPort --port "${WEB_PORT}" > >(tee -a "$LOG_FILE") 2>&1
) &
hq_web_pid="$!"

(
  cd apps/server
  exec env npm_config_ignore_scripts=false npm exec --yes --package=inngest-cli@latest -- \
    inngest dev \
      -u "http://localhost:${SERVER_PORT}/api/inngest" \
      --port "${INNGEST_PORT}" \
      --connect-gateway-port "${INNGEST_CONNECT_GATEWAY_PORT}" \
      --connect-gateway-grpc-port "${INNGEST_CONNECT_GATEWAY_GRPC_PORT}" \
      --connect-executor-grpc-port "${INNGEST_CONNECT_EXECUTOR_GRPC_PORT}" > >(tee -a "$LOG_FILE") 2>&1
) &
hq_async_pid="$!"

hq_started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
stack_started_here=1
write_state_file
run_status_writer

wait_for_http "$HQ_SERVER_HEALTH_URL" "server health" || true
wait_for_http "$HQ_WEB_URL" "web app" || true
wait_for_http "$HQ_INNGEST_RUNS_URL" "async runs" || true
if [[ -n "$otlp_endpoint" ]]; then
  wait_for_http "$HQ_OBSERVABILITY_UI_URL" "observability ui" || true
fi
run_status_writer

log "managed HQ runtime ready"
log "  coordination: ${HQ_COORDINATION_URL}"
log "  log file: ${LOG_FILE}"
log "  status file: ${STATUS_FILE}"
log "  open policy: ${open_policy}"

open_ui_surfaces

if ! wait_for_any_exit; then
  exit $?
fi
