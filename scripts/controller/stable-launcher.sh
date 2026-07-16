#!/bin/sh

set -eu

die() {
  printf 'rawr: %s\n' "$1" >&2
  exit 78
}

operator_cwd=$(pwd -P) || die CONTROLLER_OPERATOR_CWD_INVALID
operator_home=${HOME-}
operator_xdg_config_home=${XDG_CONFIG_HOME-}
if [ "${HOME+x}" = x ]; then
  operator_home_set=1
else
  operator_home_set=0
fi
if [ "${XDG_CONFIG_HOME+x}" = x ]; then
  operator_xdg_config_home_set=1
else
  operator_xdg_config_home_set=0
fi

if [ -n "${RAWR_DATA_DIR-}" ]; then
  data_root=$RAWR_DATA_DIR
elif [ -n "${XDG_DATA_HOME-}" ]; then
  data_root=$XDG_DATA_HOME/rawr
elif [ -n "$operator_home" ]; then
  data_root=$operator_home/.local/share/rawr
else
  die CONTROLLER_DATA_ROOT_REQUIRED
fi

case "$data_root" in
  /*) ;;
  *) die CONTROLLER_DATA_ROOT_INVALID ;;
esac
data_root=$(CDPATH= cd -P "$data_root" 2>/dev/null && pwd -P) ||
  die CONTROLLER_DATA_ROOT_INVALID

selector_path=$data_root/controller/current
[ -f "$selector_path" ] && [ ! -L "$selector_path" ] || die CONTROLLER_SELECTION_INVALID
if selector_stat=$(/usr/bin/stat -f '%l %z' "$selector_path" 2>/dev/null); then
  :
elif selector_stat=$(/usr/bin/stat -c '%h %s' "$selector_path" 2>/dev/null); then
  :
else
  die CONTROLLER_SELECTION_INVALID
fi
selector_links=${selector_stat%% *}
selector_size=${selector_stat#* }
[ "$selector_links" -eq 1 ] || die CONTROLLER_SELECTION_INVALID
[ "$selector_size" -eq 65 ] || die CONTROLLER_SELECTION_INVALID
exec 3<"$selector_path" || die CONTROLLER_SELECTION_REQUIRED
IFS= read -r controller_digest <&3 || die CONTROLLER_SELECTION_INVALID
exec 3<&-

if [ "${#controller_digest}" -ne 64 ]; then
  die CONTROLLER_SELECTION_INVALID
fi
case "$controller_digest" in
  *[!0-9a-f]*) die CONTROLLER_SELECTION_INVALID ;;
esac

release_root=$data_root/controller/releases/$controller_digest
runtime=$release_root/runtime/bun
entry=$release_root/app/rawr.mjs
[ -x "$runtime" ] || die CONTROLLER_RUNTIME_REQUIRED
[ -f "$entry" ] || die CONTROLLER_ENTRY_REQUIRED

cd "$release_root" || die CONTROLLER_RELEASE_REQUIRED

exec /usr/bin/env \
  -u BUN_OPTIONS \
  -u BUN_CONFIG \
  -u BUN_PRELOAD \
  -u BUN_WORKSPACE \
  -u BUN_INSTALL \
  -u BUN_INSTALL_CACHE_DIR \
  -u NODE_OPTIONS \
  -u NODE_PATH \
  -u RAWR_DATA_DIR \
  -u RAWR_CONTROLLER_DIGEST \
  -u RAWR_CONTROLLER_RELEASE_ROOT \
  -u RAWR_OPERATOR_CWD \
  -u RAWR_OPERATOR_HOME \
  -u RAWR_OPERATOR_HOME_SET \
  -u RAWR_OPERATOR_XDG_CONFIG_HOME \
  -u RAWR_OPERATOR_XDG_CONFIG_HOME_SET \
  HOME=/dev/null \
  XDG_CONFIG_HOME=/dev/null \
  BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
  RAWR_DATA_DIR="$data_root" \
  RAWR_CONTROLLER_DIGEST="$controller_digest" \
  RAWR_CONTROLLER_RELEASE_ROOT="$release_root" \
  RAWR_OPERATOR_CWD="$operator_cwd" \
  RAWR_OPERATOR_HOME="$operator_home" \
  RAWR_OPERATOR_HOME_SET="$operator_home_set" \
  RAWR_OPERATOR_XDG_CONFIG_HOME="$operator_xdg_config_home" \
  RAWR_OPERATOR_XDG_CONFIG_HOME_SET="$operator_xdg_config_home_set" \
  "$runtime" \
  --config=/dev/null \
  --no-env-file \
  --no-install \
  "$entry" \
  "$@"
