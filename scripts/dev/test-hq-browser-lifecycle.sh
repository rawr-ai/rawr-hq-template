#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HQ_CMD=(bun run rawr hq)

detect_default_browser_bundle_id() {
  local launch_services_plist="${HOME}/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist"
  if [[ ! -f "$launch_services_plist" ]] || ! command -v plutil >/dev/null 2>&1 || ! command -v python >/dev/null 2>&1; then
    return 1
  fi

  plutil -convert json -o - "$launch_services_plist" 2>/dev/null \
    | python -c 'import json, sys
obj = json.load(sys.stdin)
for entry in obj.get("LSHandlers", []):
    if entry.get("LSHandlerURLScheme") in ("http", "https"):
        bundle_id = entry.get("LSHandlerRoleAll")
        if bundle_id:
            print(bundle_id)
            break'
}

resolve_browser_app_name() {
  if [[ -n "${RAWR_HQ_BROWSER_APP:-}" ]]; then
    printf '%s\n' "${RAWR_HQ_BROWSER_APP}"
    return 0
  fi

  case "$(detect_default_browser_bundle_id || true)" in
    company.thebrowser.browser) printf '%s\n' "Arc" ;;
    com.google.Chrome) printf '%s\n' "Google Chrome" ;;
    com.brave.Browser) printf '%s\n' "Brave Browser" ;;
    *)
      printf '%s\n' "Arc"
      ;;
  esac
}

run_osascript() {
  local script="$1"
  osascript <<APPLESCRIPT
${script}
APPLESCRIPT
}

assert_eq() {
  local expected="$1"
  local actual="$2"
  local message="$3"
  if [[ "$expected" != "$actual" ]]; then
    printf 'assertion failed: %s (expected=%s actual=%s)\n' "$message" "$expected" "$actual" >&2
    exit 1
  fi
}

browser_app="$(resolve_browser_app_name)"
readonly browser_app

readonly HQ_HOME_URL="http://localhost:5173/"
readonly HQ_INNGEST_URL="http://localhost:8288/runs"
readonly HQ_HDX_URL="http://localhost:8080/"
readonly HQ_URLS=("${HQ_HOME_URL}" "${HQ_INNGEST_URL}" "${HQ_HDX_URL}")
readonly HQ_PREFIXES=(
  "http://localhost:3000"
  "http://localhost:5173"
  "http://localhost:8288"
  "http://localhost:8080"
  "http://localhost:4318"
  "http://127.0.0.1:3000"
  "http://127.0.0.1:5173"
  "http://127.0.0.1:8288"
  "http://127.0.0.1:8080"
  "http://127.0.0.1:4318"
)

render_applescript_list() {
  local rendered=()
  local value=""
  for value in "$@"; do
    local escaped="${value//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    rendered+=("\"${escaped}\"")
  done

  local IFS=", "
  printf '{%s}' "${rendered[*]}"
}

hq_urls_list="$(render_applescript_list "${HQ_URLS[@]}")"
hq_prefixes_list="$(render_applescript_list "${HQ_PREFIXES[@]}")"

collect_metrics() {
  case "$browser_app" in
    "Arc")
      run_osascript "
on list_contains(theList, targetValue)
  repeat with candidateValue in theList
    if (candidateValue as text) is targetValue then return true
  end repeat
  return false
end list_contains

on append_unique(theList, targetValue)
  if my list_contains(theList, targetValue) then return theList
  set end of theList to targetValue
  return theList
end append_unique

on url_matches_prefixes(theUrl, urlPrefixes)
  repeat with prefixValue in urlPrefixes
    if theUrl starts with (prefixValue as text) then return true
  end repeat
  return false
end url_matches_prefixes

tell application \"Arc\"
  set urlPrefixes to ${hq_prefixes_list}
  set targetUrls to ${hq_urls_list}
  set processedSpaceIds to {}
  set hqTabCount to 0
  set hqContextCount to 0
  set nonHqTabCount to 0

  repeat with browserWindow in every window
    try
      repeat with browserSpace in spaces of browserWindow
        try
          set spaceId to id of browserSpace as text
        on error
          set spaceId to \"\"
        end try
        if spaceId is not \"\" and not my list_contains(processedSpaceIds, spaceId) then
          set processedSpaceIds to my append_unique(processedSpaceIds, spaceId)
          set spaceHasHq to false
          repeat with browserTab in tabs of browserSpace
            try
              set tabUrl to URL of browserTab
            on error
              set tabUrl to \"\"
            end try
            if tabUrl is not \"\" and my url_matches_prefixes(tabUrl, urlPrefixes) then
              set hqTabCount to hqTabCount + 1
              set spaceHasHq to true
            else if tabUrl is not \"\" then
              set nonHqTabCount to nonHqTabCount + 1
            end if
          end repeat
          if spaceHasHq then set hqContextCount to hqContextCount + 1
        end if
      end repeat
    end try
  end repeat

  return (hqTabCount as text) & \"|\" & (hqContextCount as text) & \"|\" & (nonHqTabCount as text)
end tell"
      ;;
    "Google Chrome"|"Brave Browser")
      run_osascript "
on url_matches_prefixes(theUrl, urlPrefixes)
  repeat with prefixValue in urlPrefixes
    if theUrl starts with (prefixValue as text) then return true
  end repeat
  return false
end url_matches_prefixes

tell application \"${browser_app}\"
  set urlPrefixes to ${hq_prefixes_list}
  set hqTabCount to 0
  set hqContextCount to 0
  set nonHqTabCount to 0

  repeat with browserWindow in every window
    set windowHasHq to false
    repeat with browserTab in tabs of browserWindow
      try
        set tabUrl to URL of browserTab
      on error
        set tabUrl to \"\"
      end try
      if tabUrl is not \"\" and my url_matches_prefixes(tabUrl, urlPrefixes) then
        set hqTabCount to hqTabCount + 1
        set windowHasHq to true
      else if tabUrl is not \"\" then
        set nonHqTabCount to nonHqTabCount + 1
      end if
    end repeat
    if windowHasHq then set hqContextCount to hqContextCount + 1
  end repeat

  return (hqTabCount as text) & \"|\" & (hqContextCount as text) & \"|\" & (nonHqTabCount as text)
end tell"
      ;;
    *)
      printf 'unsupported browser for smoke script: %s\n' "$browser_app" >&2
      exit 1
      ;;
  esac
}

scatter_hq_tabs() {
  case "$browser_app" in
    "Arc")
      run_osascript "
tell application \"Arc\"
  if (count of every window) is 0 then
    make new window
    delay 0.3
  end if
  set targetUrls to ${hq_urls_list}
  if (count of spaces of front window) < 2 then error \"need at least two Arc spaces to test reclaim\"
  tell item 1 of (spaces of front window) to make new tab with properties {URL:(item 1 of targetUrls as text)}
  tell item 2 of (spaces of front window) to make new tab with properties {URL:(item 2 of targetUrls as text)}
end tell"
      ;;
    "Google Chrome"|"Brave Browser")
      run_osascript "
tell application \"${browser_app}\"
  set targetUrls to ${hq_urls_list}
  if (count of every window) < 2 then
    make new window
    delay 0.2
  end if
  tell window 1 to make new tab with properties {URL:(item 1 of targetUrls as text)}
  tell window 2 to make new tab with properties {URL:(item 2 of targetUrls as text)}
end tell"
      ;;
  esac
}

read_metrics() {
  local metrics
  metrics="$(collect_metrics)"
  IFS='|' read -r HQ_TAB_COUNT HQ_CONTEXT_COUNT NON_HQ_TAB_COUNT <<<"$metrics"
}

printf 'browser=%s\n' "$browser_app"

(
  cd "${ROOT_DIR}"
  "${HQ_CMD[@]}" down >/dev/null
)

scatter_hq_tabs
read_metrics
assert_eq "2" "$HQ_CONTEXT_COUNT" "scattered setup should span two contexts"
baseline_non_hq="$NON_HQ_TAB_COUNT"

(
  cd "${ROOT_DIR}"
  "${HQ_CMD[@]}" restart --open all --observability required >/dev/null
)

read_metrics
assert_eq "3" "$HQ_TAB_COUNT" "restart --open all should yield one tab per HQ URL"
assert_eq "1" "$HQ_CONTEXT_COUNT" "restart --open all should reclaim HQ into one context"
assert_eq "$baseline_non_hq" "$NON_HQ_TAB_COUNT" "reclaim should not touch unrelated tabs"

(
  cd "${ROOT_DIR}"
  "${HQ_CMD[@]}" restart --open all --observability required >/dev/null
)

read_metrics
assert_eq "3" "$HQ_TAB_COUNT" "second restart should not duplicate HQ tabs"
assert_eq "1" "$HQ_CONTEXT_COUNT" "second restart should remain consolidated"
assert_eq "$baseline_non_hq" "$NON_HQ_TAB_COUNT" "dedupe should not touch unrelated tabs"

(
  cd "${ROOT_DIR}"
  "${HQ_CMD[@]}" down >/dev/null
)

read_metrics
assert_eq "0" "$HQ_TAB_COUNT" "down should close all HQ tabs"
assert_eq "0" "$HQ_CONTEXT_COUNT" "down should leave no HQ contexts"
assert_eq "$baseline_non_hq" "$NON_HQ_TAB_COUNT" "down should not touch unrelated tabs"

printf 'browser lifecycle smoke passed for %s\n' "$browser_app"
