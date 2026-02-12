#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

WEB_URL="${WEB_URL:-http://localhost:5173/}"
COORDINATION_URL="${COORDINATION_URL:-http://localhost:5173/coordination}"
INNGEST_RUNS_URL="${INNGEST_RUNS_URL:-http://localhost:8288/runs}"
SERVER_HEALTH_URL="${SERVER_HEALTH_URL:-http://localhost:3000/health}"

STATE_DIR="${ROOT_DIR}/.rawr/dev-up"
STATE_FILE="${STATE_DIR}/state.env"
LOCK_DIR="${STATE_DIR}/lock"

app_pid=""
web_pid=""
inngest_pid=""
stack_started_here=0
shutting_down=0
lock_held=0

state_manager_pid=""
state_app_pid=""
state_web_pid=""
state_inngest_pid=""
state_started_at=""

requested_action="${RAWR_DEV_UP_ACTION:-auto}"
requested_open_policy="${RAWR_DEV_UP_OPEN:-${RAWR_OPEN_POLICY:-}}"
force_non_interactive="${RAWR_DEV_UP_NON_INTERACTIVE:-0}"

log() {
  echo "$*"
}

err() {
  echo "error: $*" >&2
}

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}

is_pid_running() {
  local pid="$1"
  if [[ -z "$pid" || ! "$pid" =~ ^[0-9]+$ ]]; then
    return 1
  fi
  kill -0 "$pid" >/dev/null 2>&1
}

is_non_interactive() {
  if [[ "$force_non_interactive" == "1" ]]; then
    return 0
  fi
  if [[ -n "${CI:-}" ]]; then
    return 0
  fi
  if [[ ! -t 0 || ! -t 1 ]]; then
    return 0
  fi
  return 1
}

acquire_lock() {
  ensure_state_dir

  local attempts=200
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    if [[ -f "$LOCK_DIR/pid" ]]; then
      local lock_pid
      lock_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
      if [[ -n "$lock_pid" ]] && ! is_pid_running "$lock_pid"; then
        rm -rf "$LOCK_DIR"
        continue
      fi
    fi

    attempts=$((attempts - 1))
    if [[ "$attempts" -le 0 ]]; then
      err "timed out waiting for dev:up lock ($LOCK_DIR)"
      exit 1
    fi
    sleep 0.1
  done

  printf '%s\n' "$$" >"$LOCK_DIR/pid"
  lock_held=1
}

release_lock() {
  if [[ "$lock_held" -eq 1 ]]; then
    rm -rf "$LOCK_DIR"
    lock_held=0
  fi
}

port_from_url() {
  local url="$1"
  local fallback="$2"
  local host

  host="${url#*://}"
  host="${host%%/*}"

  if [[ "$host" == *:* ]]; then
    local port
    port="${host##*:}"
    if [[ "$port" =~ ^[0-9]+$ ]]; then
      printf '%s\n' "$port"
      return
    fi
  fi

  if [[ "$url" == https://* ]]; then
    printf '443\n'
  else
    printf '%s\n' "$fallback"
  fi
}

WEB_PORT="$(port_from_url "$WEB_URL" "5173")"
SERVER_PORT="$(port_from_url "$SERVER_HEALTH_URL" "3000")"
INNGEST_PORT="$(port_from_url "$INNGEST_RUNS_URL" "8288")"
INNGEST_CONNECT_GATEWAY_PORT="${RAWR_DEV_UP_INNGEST_CONNECT_GATEWAY_PORT:-8289}"
INNGEST_CONNECT_GATEWAY_GRPC_PORT="${RAWR_DEV_UP_INNGEST_CONNECT_GATEWAY_GRPC_PORT:-50052}"
INNGEST_CONNECT_EXECUTOR_GRPC_PORT="${RAWR_DEV_UP_INNGEST_CONNECT_EXECUTOR_GRPC_PORT:-50053}"

for required_port in \
  "$SERVER_PORT" \
  "$WEB_PORT" \
  "$INNGEST_PORT" \
  "$INNGEST_CONNECT_GATEWAY_PORT" \
  "$INNGEST_CONNECT_GATEWAY_GRPC_PORT" \
  "$INNGEST_CONNECT_EXECUTOR_GRPC_PORT"; do
  if [[ ! "$required_port" =~ ^[0-9]+$ ]]; then
    err "invalid port value: ${required_port}"
    exit 2
  fi
done

listener_pids_for_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | awk -v port=":${port}" '$4 ~ port {print $0}' >/dev/null 2>&1 && printf 'unknown\n' || true
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | awk -v port=".${port} " '$0 ~ port && $0 ~ /LISTEN/ {print "unknown"}' || true
  fi
}

load_state() {
  state_manager_pid=""
  state_app_pid=""
  state_web_pid=""
  state_inngest_pid=""
  state_started_at=""

  if [[ ! -f "$STATE_FILE" ]]; then
    return 1
  fi

  # shellcheck disable=SC1090
  source "$STATE_FILE"
  return 0
}

state_has_live_processes() {
  load_state >/dev/null 2>&1 || return 1

  if is_pid_running "$state_manager_pid"; then
    return 0
  fi
  if is_pid_running "$state_app_pid"; then
    return 0
  fi
  if is_pid_running "$state_web_pid"; then
    return 0
  fi
  if is_pid_running "$state_inngest_pid"; then
    return 0
  fi

  return 1
}

managed_pid_candidates() {
  load_state >/dev/null 2>&1 || return 0
  printf '%s\n' "$state_manager_pid" "$state_app_pid" "$state_web_pid" "$state_inngest_pid" | awk '/^[0-9]+$/' | sort -u
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

prune_stale_state_if_needed() {
  if [[ -f "$STATE_FILE" ]] && ! state_has_live_processes; then
    rm -f "$STATE_FILE"
  fi
}

print_stack_status() {
  prune_stale_state_if_needed
  load_state >/dev/null 2>&1 || true

  local manager_state="dead"
  local app_state="dead"
  local web_state="dead"
  local inngest_state="dead"

  if is_pid_running "$state_manager_pid"; then manager_state="alive"; fi
  if is_pid_running "$state_app_pid"; then app_state="alive"; fi
  if is_pid_running "$state_web_pid"; then web_state="alive"; fi
  if is_pid_running "$state_inngest_pid"; then inngest_state="alive"; fi

  log "dev:up status"
  log "  manager: ${state_manager_pid:-n/a} (${manager_state})"
  log "  server : ${state_app_pid:-n/a} (${app_state})"
  log "  web    : ${state_web_pid:-n/a} (${web_state})"
  log "  inngest: ${state_inngest_pid:-n/a} (${inngest_state})"

  local port
  for port in \
    "$SERVER_PORT" \
    "$WEB_PORT" \
    "$INNGEST_PORT" \
    "$INNGEST_CONNECT_GATEWAY_PORT" \
    "$INNGEST_CONNECT_GATEWAY_GRPC_PORT" \
    "$INNGEST_CONNECT_EXECUTOR_GRPC_PORT"; do
    local listeners
    listeners="$(listener_pids_for_port "$port" | tr '\n' ' ' | xargs 2>/dev/null || true)"
    if [[ -n "$listeners" ]]; then
      log "  port ${port}: listening (${listeners})"
    else
      log "  port ${port}: not listening"
    fi
  done

  log "  canonical canvas route: ${COORDINATION_URL} (served by host shell)"
  log "  standalone canvas server: none by default"
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
  prune_stale_state_if_needed
  load_state >/dev/null 2>&1 || true

  local candidates
  candidates="$(printf '%s\n' "$state_manager_pid" "$state_app_pid" "$state_web_pid" "$state_inngest_pid" | awk '/^[0-9]+$/' | sort -u)"

  if [[ -z "$candidates" ]]; then
    log "info: no managed dev:up stack state found"
    rm -f "$STATE_FILE"
    return 0
  fi

  log "stopping managed dev:up stack"

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

  log "stopped managed stack"
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

validate_open_policy() {
  local policy="$1"
  case "$policy" in
    none|coordination|app|app+inngest|all)
      return 0
      ;;
  esac

  err "invalid open policy '${policy}' (expected one of: none, coordination, app, app+inngest, all)"
  exit 2
}

derive_open_policy() {
  if [[ -n "$requested_open_policy" ]]; then
    printf '%s\n' "$requested_open_policy"
    return
  fi

  if [[ -n "${RAWR_OPEN_UI+x}" ]]; then
    case "$RAWR_OPEN_UI" in
      0|false|FALSE|no|NO)
        printf 'none\n'
        return
        ;;
      1|true|TRUE|yes|YES)
        printf 'all\n'
        return
        ;;
      none|coordination|app|app+inngest|all)
        printf '%s\n' "$RAWR_OPEN_UI"
        return
        ;;
    esac
  fi

  printf 'coordination\n'
}

open_ui_surfaces() {
  local policy="$1"

  case "$policy" in
    none)
      log "open policy: none"
      return 0
      ;;
    coordination)
      if open_url "$COORDINATION_URL"; then
        log "opened: coordination canvas (${COORDINATION_URL})"
      else
        log "info: no browser opener found for ${COORDINATION_URL}"
      fi
      return 0
      ;;
    app)
      if open_url "$WEB_URL"; then
        log "opened: app home (${WEB_URL})"
      else
        log "info: no browser opener found for ${WEB_URL}"
      fi
      return 0
      ;;
    app+inngest)
      if open_url "$WEB_URL"; then
        log "opened: app home (${WEB_URL})"
      else
        log "info: no browser opener found for ${WEB_URL}"
      fi
      if open_url "$INNGEST_RUNS_URL"; then
        log "opened: inngest runs (${INNGEST_RUNS_URL})"
      else
        log "info: no browser opener found for ${INNGEST_RUNS_URL}"
      fi
      return 0
      ;;
    all)
      if open_url "$WEB_URL"; then
        log "opened: app home (${WEB_URL})"
      else
        log "info: no browser opener found for ${WEB_URL}"
      fi
      if open_url "$COORDINATION_URL"; then
        log "opened: coordination canvas (${COORDINATION_URL})"
      else
        log "info: no browser opener found for ${COORDINATION_URL}"
      fi
      if open_url "$INNGEST_RUNS_URL"; then
        log "opened: inngest runs (${INNGEST_RUNS_URL})"
      else
        log "info: no browser opener found for ${INNGEST_RUNS_URL}"
      fi
      return 0
      ;;
  esac
}

write_state_file() {
  cat >"$STATE_FILE" <<STATE
state_manager_pid=$$
state_app_pid=${app_pid}
state_web_pid=${web_pid}
state_inngest_pid=${inngest_pid}
state_started_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
STATE
}

has_unmanaged_port_conflicts() {
  local port
  local has_conflict=0

  for port in \
    "$SERVER_PORT" \
    "$WEB_PORT" \
    "$INNGEST_PORT" \
    "$INNGEST_CONNECT_GATEWAY_PORT" \
    "$INNGEST_CONNECT_GATEWAY_GRPC_PORT" \
    "$INNGEST_CONNECT_EXECUTOR_GRPC_PORT"; do
    local pid
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue

      if [[ "$pid" == "unknown" ]]; then
        has_conflict=1
        log "port ${port} is already listening (pid unknown)"
        continue
      fi

      if ! is_managed_pid "$pid"; then
        has_conflict=1
        log "port ${port} is already listening by pid ${pid}"
      fi
    done < <(listener_pids_for_port "$port")
  done

  if [[ "$has_conflict" -eq 1 ]]; then
    return 0
  fi
  return 1
}

wait_for_any_exit() {
  while true; do
    local pid
    for pid in "$app_pid" "$web_pid" "$inngest_pid"; do
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
  for pid in "$app_pid" "$web_pid" "$inngest_pid"; do
    if [[ -n "$pid" ]]; then
      signal_pid_tree "$pid" TERM
    fi
  done

  for pid in "$app_pid" "$web_pid" "$inngest_pid"; do
    if [[ -n "$pid" ]]; then
      wait_for_pid_exit "$pid" 5 || true
    fi
  done

  for pid in "$app_pid" "$web_pid" "$inngest_pid"; do
    if [[ -n "$pid" ]] && is_pid_running "$pid"; then
      signal_pid_tree "$pid" KILL
    fi
  done

  if [[ -f "$STATE_FILE" ]]; then
    load_state >/dev/null 2>&1 || true
    if [[ "$state_manager_pid" == "$$" ]]; then
      rm -f "$STATE_FILE"
    fi
  fi
}

graceful_shutdown() {
  if [[ "$stack_started_here" -ne 1 ]]; then
    return 0
  fi

  shutting_down=1

  local pid
  for pid in "$app_pid" "$web_pid" "$inngest_pid"; do
    if [[ -n "$pid" ]]; then
      signal_pid_tree "$pid" INT
    fi
  done

  for pid in "$app_pid" "$web_pid" "$inngest_pid"; do
    if [[ -n "$pid" ]]; then
      wait_for_pid_exit "$pid" 5 || true
    fi
  done

  cleanup_running_stack
}

cleanup() {
  if [[ "$shutting_down" -eq 0 ]]; then
    cleanup_running_stack
  fi
  release_lock
}

trap cleanup EXIT
trap 'graceful_shutdown; exit 0' INT TERM

show_help() {
  cat <<HELP
Usage: bun run dev:up [--action <mode>] [--open <policy>] [--non-interactive]

Lifecycle modes:
  auto     Start stack when stopped; when already running choose status/attach/stop/restart
  start    Start stack (fails if managed stack already running)
  status   Print managed stack + port status and exit
  attach   Follow existing managed stack lifecycle without starting duplicates
  stop     Stop existing managed stack and exit
  restart  Stop existing managed stack, then start fresh

Open policies:
  none | coordination | app | app+inngest | all

Env controls:
  RAWR_DEV_UP_ACTION          same as --action
  RAWR_DEV_UP_OPEN            same as --open
  RAWR_OPEN_POLICY            alias for open policy
  RAWR_OPEN_UI                legacy compatibility (0 => none, 1 => all)
  RAWR_DEV_UP_NON_INTERACTIVE set to 1 to suppress prompts
  RAWR_DEV_UP_INNGEST_CONNECT_GATEWAY_PORT
  RAWR_DEV_UP_INNGEST_CONNECT_GATEWAY_GRPC_PORT
  RAWR_DEV_UP_INNGEST_CONNECT_EXECUTOR_GRPC_PORT
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --action)
      requested_action="${2:-}"
      shift 2
      ;;
    --open)
      requested_open_policy="${2:-}"
      shift 2
      ;;
    --non-interactive)
      force_non_interactive=1
      shift
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

case "$requested_action" in
  auto|start|status|attach|stop|restart)
    ;;
  *)
    err "invalid action '${requested_action}'"
    show_help
    exit 2
    ;;
esac

open_policy="$(derive_open_policy)"
validate_open_policy "$open_policy"

prompt_running_action() {
  log "dev:up detected an already running managed stack."
  log "  1) status (default)"
  log "  2) attach"
  log "  3) stop"
  log "  4) restart"

  local choice=""
  if [[ -t 0 ]]; then
    read -r -p "Choose action [1-4]: " choice || true
  fi

  case "$choice" in
    2)
      printf 'attach\n'
      ;;
    3)
      printf 'stop\n'
      ;;
    4)
      printf 'restart\n'
      ;;
    *)
      printf 'status\n'
      ;;
  esac
}

acquire_lock
prune_stale_state_if_needed

resolved_action="$requested_action"
if [[ "$requested_action" == "auto" ]]; then
  if state_has_live_processes; then
    if is_non_interactive; then
      resolved_action="status"
      log "info: stack already running; non-interactive mode defaults to status"
    else
      resolved_action="$(prompt_running_action)"
    fi
  else
    resolved_action="start"
  fi
fi

case "$resolved_action" in
  status)
    print_stack_status
    exit 0
    ;;
  attach)
    print_stack_status
    load_state >/dev/null 2>&1 || true
    if is_pid_running "$state_manager_pid"; then
      log "attach: monitoring manager pid ${state_manager_pid}. Press Ctrl+C to detach."
      release_lock
      while is_pid_running "$state_manager_pid"; do
        sleep 2
      done
      log "attach: managed stack exited"
      exit 0
    fi

    if is_pid_running "$state_app_pid" || is_pid_running "$state_web_pid" || is_pid_running "$state_inngest_pid"; then
      log "attach: manager pid is not alive; showing status only to avoid duplicate starts"
    else
      log "attach: no running managed stack detected"
    fi
    exit 0
    ;;
  stop)
    stop_managed_stack
    print_stack_status
    exit 0
    ;;
  restart)
    stop_managed_stack
    ;;
  start)
    if state_has_live_processes; then
      err "managed stack is already running; use '--action status', '--action attach', '--action stop', or '--action restart'"
      print_stack_status
      exit 1
    fi
    ;;
esac

if has_unmanaged_port_conflicts; then
  err "refusing to spawn duplicate or conflicting services"
  err "resolve occupied lifecycle ports or stop the existing stack first"
  print_stack_status
  exit 1
fi

log "starting dev stack (server + web + inngest)"
log "  server port: ${SERVER_PORT}"
log "  web port: ${WEB_PORT}"
log "  inngest port: ${INNGEST_PORT}"
log "  inngest gateway port: ${INNGEST_CONNECT_GATEWAY_PORT}"
log "  inngest grpc ports: ${INNGEST_CONNECT_GATEWAY_GRPC_PORT}/${INNGEST_CONNECT_EXECUTOR_GRPC_PORT}"

(cd apps/server && exec bun --hot src/index.ts) &
app_pid="$!"

(cd apps/web && exec bunx vite --strictPort --port "${WEB_PORT}") &
web_pid="$!"

(
  cd apps/server
  exec env npm_config_ignore_scripts=false npm exec --yes --package=inngest-cli@latest -- \
    inngest dev \
      -u "http://localhost:${SERVER_PORT}/api/inngest" \
      --port "${INNGEST_PORT}" \
      --connect-gateway-port "${INNGEST_CONNECT_GATEWAY_PORT}" \
      --connect-gateway-grpc-port "${INNGEST_CONNECT_GATEWAY_GRPC_PORT}" \
      --connect-executor-grpc-port "${INNGEST_CONNECT_EXECUTOR_GRPC_PORT}"
) &
inngest_pid="$!"

stack_started_here=1
write_state_file
release_lock

wait_for_http "$SERVER_HEALTH_URL" "server health" || true
wait_for_http "$WEB_URL" "web app" || true
wait_for_http "$INNGEST_RUNS_URL" "inngest runs" || true

log "dev stack ready"
log "  app home: ${WEB_URL}"
log "  canonical canvas: ${COORDINATION_URL} (host-shell route)"
log "  inngest runs: ${INNGEST_RUNS_URL}"
log "  standalone canvas: none by default"
log "  open policy: ${open_policy}"

open_ui_surfaces "$open_policy"

if ! wait_for_any_exit; then
  exit $?
fi
