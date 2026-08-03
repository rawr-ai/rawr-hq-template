#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${RUN_ID:-20260503T193257Z-child-agent-completion}"
TEMPLATE_REPO="${TEMPLATE_REPO:-/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity}"
CODEX_HOME="${CODEX_HOME:-/Users/mateicanavra/.codex-rawr}"
PROOF_ROOT="${PROOF_ROOT:-/tmp/codex-rawr-child-diagnostic-${RUN_ID}}"
EVIDENCE_ROOT="${EVIDENCE_ROOT:-${TEMPLATE_REPO}/services/hyperresearch-codex/spec/evidence/${RUN_ID}}"

SCENARIO_TIMEOUT_SECONDS="${SCENARIO_TIMEOUT_SECONDS:-900}"
PROCESS_SNAPSHOT_SECONDS="${PROCESS_SNAPSHOT_SECONDS:-30}"
PROCESS_SETTLE_SECONDS="${PROCESS_SETTLE_SECONDS:-10}"

mkdir -p \
  "${PROOF_ROOT}"/{prompts,outputs,events,logs,process,manifest,sessions,hyperresearch-shaped} \
  "${EVIDENCE_ROOT}"/{prompts,outputs,events,logs,process,manifest,sessions,hyperresearch-shaped}

snapshot_processes() {
  local scenario="$1"
  local label="$2"
  local out="${PROOF_ROOT}/process/${scenario}-${label}.txt"
  {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
    echo "$ pgrep -af codex-rawr"
    pgrep -af codex-rawr || true
    if [[ -n "${CODEX_PARENT_PID:-}" ]]; then
      echo "$ ps -p ${CODEX_PARENT_PID} -o pid,ppid,stat,etime,command"
      ps -p "${CODEX_PARENT_PID}" -o pid,ppid,stat,etime,command || true
    fi
  } > "${out}"
  cp "${out}" "${EVIDENCE_ROOT}/process/"
}

record_env() {
  {
    echo "RUN_ID=${RUN_ID}"
    echo "TEMPLATE_REPO=${TEMPLATE_REPO}"
    echo "CODEX_HOME=${CODEX_HOME}"
    echo "PROOF_ROOT=${PROOF_ROOT}"
    echo "EVIDENCE_ROOT=${EVIDENCE_ROOT}"
    echo "SHELL=${SHELL:-unknown}"
    echo "OSTYPE=${OSTYPE:-unknown}"
    echo "$ codex-rawr --version"
    codex-rawr --version || true
    echo "$ hyperresearch --version"
    hyperresearch --version || true
    echo "$ git rev-parse HEAD"
    git -C "${TEMPLATE_REPO}" rev-parse HEAD || true
    echo "$ git status --short"
    git -C "${TEMPLATE_REPO}" status --short || true
  } > "${PROOF_ROOT}/env.txt" 2>&1
  cp "${PROOF_ROOT}/env.txt" "${EVIDENCE_ROOT}/env.txt"
}

run_with_watchdog() {
  local scenario="$1"
  local prompt="$2"
  local events="$3"
  local stderr="$4"
  local exit_file="$5"
  local last_message="$6"
  local resume_session_id="${7:-}"

  snapshot_processes "${scenario}" "before-spawn"
  set +e
  (
    cd "${TEMPLATE_REPO}"
    if [[ -n "${resume_session_id}" ]]; then
      CODEX_HOME="${CODEX_HOME}" codex-rawr exec resume "${resume_session_id}" \
        --dangerously-bypass-approvals-and-sandbox \
        --json \
        --output-last-message "${last_message}" \
        < "${prompt}"
    else
      CODEX_HOME="${CODEX_HOME}" codex-rawr exec \
        --dangerously-bypass-approvals-and-sandbox \
        --json \
        --output-last-message "${last_message}" \
        -C "${TEMPLATE_REPO}" \
        < "${prompt}"
    fi
  ) > "${events}" 2> "${stderr}" &
  CODEX_PARENT_PID="$!"
  echo "${CODEX_PARENT_PID}" > "${PROOF_ROOT}/logs/${scenario}.pid"
  snapshot_processes "${scenario}" "after-spawn"

  local deadline=$((SECONDS + SCENARIO_TIMEOUT_SECONDS))
  local timed_out=0
  while kill -0 "${CODEX_PARENT_PID}" 2>/dev/null; do
    snapshot_processes "${scenario}" "during-wait"
    if (( SECONDS >= deadline )); then
      timed_out=1
      snapshot_processes "${scenario}" "timeout-before-terminate"
      kill -TERM "${CODEX_PARENT_PID}" 2>/dev/null || true
      sleep "${PROCESS_SETTLE_SECONDS}"
      kill -KILL "${CODEX_PARENT_PID}" 2>/dev/null || true
      break
    fi
    sleep "${PROCESS_SNAPSHOT_SECONDS}"
  done

  wait "${CODEX_PARENT_PID}"
  local code="$?"
  set -e
  if [[ "${timed_out}" == "1" ]]; then
    code=124
    echo "manual_terminated" > "${PROOF_ROOT}/logs/${scenario}.classification"
  fi
  echo "${code}" > "${exit_file}"
  snapshot_processes "${scenario}" "after-exit"

  cp "${events}" "${EVIDENCE_ROOT}/events/" 2>/dev/null || true
  cp "${stderr}" "${EVIDENCE_ROOT}/logs/" 2>/dev/null || true
  cp "${exit_file}" "${EVIDENCE_ROOT}/logs/" 2>/dev/null || true
  cp "${last_message}" "${EVIDENCE_ROOT}/logs/" 2>/dev/null || true
  cp "${PROOF_ROOT}/logs/${scenario}.pid" "${EVIDENCE_ROOT}/logs/" 2>/dev/null || true
  cp "${PROOF_ROOT}/logs/${scenario}.classification" "${EVIDENCE_ROOT}/logs/" 2>/dev/null || true
  return 0
}

write_prompt() {
  local scenario="$1"
  local prompt="${PROOF_ROOT}/prompts/${scenario}.md"
  case "${scenario}" in
    single-happy)
      cat > "${prompt}" <<PROMPT
You are running the Hyperresearch child-agent completion diagnostic scenario "single-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available in this runtime:
- spawn one child agent,
- wait for that exact child,
- close that exact child.

If spawn_agent, wait_agent, or close_agent are unavailable, do not write the child output yourself. Instead write ${PROOF_ROOT}/manifest/single-happy.json with classification "unsupported_runtime_surface" and explain which lifecycle surface was missing.

Child task:
- Write exactly this JSON, with no trailing commentary, to ${PROOF_ROOT}/outputs/single-1.json:
{"schemaVersion":1,"scenarioId":"single-happy","logicalChildId":"single-1","attemptId":"single-1-a1","result":"DONE single-1","payload":"hyperresearch-child-completion-diagnostic"}
- Return the final answer exactly: DONE single-1

Parent task:
- Spawn the child with the child task above.
- Wait for the child.
- Close the child.
- Compute SHA-256 for ${PROOF_ROOT}/outputs/single-1.json using shasum -a 256.
- Write ${PROOF_ROOT}/manifest/single-happy.json as JSON with schemaVersion, runId "${RUN_ID}", scenarioId, kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings. Include childSessionId/agent id if known, childFinalState, parentWaitResult, parentCloseResult, expectedOutputPath, expectedOutputSha256, diagnosticClassification, and eventChain.
- A clean pass requires childFinalState "Completed", parentWaitResult "wait_completed", parentCloseResult "close_ok" or "close_already_closed", and the output hash present. For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
PROMPT
      ;;
    multi-happy)
      cat > "${prompt}" <<PROMPT
You are running the Hyperresearch child-agent completion diagnostic scenario "multi-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available. Spawn three child agents before waiting. If spawn_agent, wait_agent, or close_agent are unavailable, do not write child outputs yourself; write ${PROOF_ROOT}/manifest/multi-happy.json with classification "unsupported_runtime_surface".

Child tasks:
1. Child single-1 writes exactly {"schemaVersion":1,"scenarioId":"multi-happy","logicalChildId":"multi-1","attemptId":"multi-1-a1","result":"DONE multi-1","payload":"hyperresearch-child-completion-diagnostic"} to ${PROOF_ROOT}/outputs/multi-1.json and returns DONE multi-1.
2. Child multi-2 writes exactly {"schemaVersion":1,"scenarioId":"multi-happy","logicalChildId":"multi-2","attemptId":"multi-2-a1","result":"DONE multi-2","payload":"hyperresearch-child-completion-diagnostic"} to ${PROOF_ROOT}/outputs/multi-2.json and returns DONE multi-2.
3. Child multi-3 writes exactly {"schemaVersion":1,"scenarioId":"multi-happy","logicalChildId":"multi-3","attemptId":"multi-3-a1","result":"DONE multi-3","payload":"hyperresearch-child-completion-diagnostic"} to ${PROOF_ROOT}/outputs/multi-3.json and returns DONE multi-3.

Parent task:
- Spawn all three children.
- Wait for each exact child.
- Close each exact child.
- Compute SHA-256 for each output using shasum -a 256.
- Write ${PROOF_ROOT}/manifest/multi-happy.json as JSON with schemaVersion, runId "${RUN_ID}", scenarioId, kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings. Include childSessionId/agent id if known, childFinalState, parentWaitResult, parentCloseResult, expectedOutputPath, expectedOutputSha256, diagnosticClassification, and eventChain for each child.
- A clean pass requires every child to reach Completed, every wait to complete, every close to complete or already be closed with evidence, and every hash to be present. For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
PROMPT
      ;;
    multi-resume-happy-initial)
      cat > "${prompt}" <<PROMPT
You are running the initial half of Hyperresearch child-agent completion diagnostic scenario "multi-resume-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available. If spawn_agent is unavailable, write ${PROOF_ROOT}/manifest/multi-resume-happy-initial.json with classification "unsupported_runtime_surface".

Spawn three child agents. Each child should wait 10 seconds, write its deterministic output file, and return its DONE marker:
- resume-1 writes {"schemaVersion":1,"scenarioId":"multi-resume-happy","logicalChildId":"resume-1","attemptId":"resume-1-a1","result":"DONE resume-1","payload":"hyperresearch-child-completion-diagnostic"} to ${PROOF_ROOT}/outputs/resume-1.json and returns DONE resume-1.
- resume-2 writes {"schemaVersion":1,"scenarioId":"multi-resume-happy","logicalChildId":"resume-2","attemptId":"resume-2-a1","result":"DONE resume-2","payload":"hyperresearch-child-completion-diagnostic"} to ${PROOF_ROOT}/outputs/resume-2.json and returns DONE resume-2.
- resume-3 writes {"schemaVersion":1,"scenarioId":"multi-resume-happy","logicalChildId":"resume-3","attemptId":"resume-3-a1","result":"DONE resume-3","payload":"hyperresearch-child-completion-diagnostic"} to ${PROOF_ROOT}/outputs/resume-3.json and returns DONE resume-3.

After spawn_agent returns for all three children, write ${PROOF_ROOT}/manifest/multi-resume-happy-initial.json with the child handles/agent ids you received and classification "resume_pending". Do not wait for or close the children in this initial run. End your final response with the exact marker READY_FOR_RESUME multi-resume-happy.
PROMPT
      ;;
    multi-resume-happy-resume)
      cat > "${prompt}" <<PROMPT
Resume the Hyperresearch child-agent completion diagnostic scenario "multi-resume-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the child handles/agent ids spawned earlier in this same session for resume-1, resume-2, and resume-3. Wait for each exact child, close each exact child, compute SHA-256 for each output file in ${PROOF_ROOT}/outputs/, and write ${PROOF_ROOT}/manifest/multi-resume-happy.json.

If the resumed runtime cannot access the prior child handles, classify the scenario as non-clean. Use parentWaitResult "wait_not_found" or "wait_not_attempted" as appropriate, parentCloseResult "close_not_found" or "close_not_attempted", and diagnosticClassification "stuck_final_no_wait" or "unsupported_runtime_surface". Do not replace the children for this positive scenario.

The manifest must include schemaVersion, runId "${RUN_ID}", scenarioId "multi-resume-happy", kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings, and per-child childFinalState, parentWaitResult, parentCloseResult, expectedOutputPath, expectedOutputSha256, diagnosticClassification, and eventChain.

For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
PROMPT
      ;;
    hyperresearch-shaped-packet-loop)
      cat > "${prompt}" <<PROMPT
You are running the Hyperresearch child-agent completion diagnostic scenario "hyperresearch-shaped-packet-loop".

Do not use MCP. Do not test hooks. Do not edit the repository.

The service packet job has been prepared at ${PROOF_ROOT}/hyperresearch-shaped/selected-packet.json. Read it and use its expectedOutputPath plus artifact contract. Use the Codex child-agent lifecycle tools if they are available:
- spawn one role-like child for this packet job,
- wait for that exact child,
- close that exact child.

If spawn_agent, wait_agent, or close_agent are unavailable, do not write packet output yourself. Instead write ${PROOF_ROOT}/manifest/hyperresearch-shaped-packet-loop.json with classification "unsupported_runtime_surface".

Child task:
- Read ${PROOF_ROOT}/hyperresearch-shaped/selected-packet.json.
- Write a deterministic assigned artifact at the packet's assigned artifact path under ${PROOF_ROOT}/hyperresearch-shaped/vault.
- Compute that artifact SHA-256.
- Write the packet result JSON at the service-declared expectedOutputPath under ${PROOF_ROOT}/hyperresearch-shaped/vault. The result must include status "complete", artifactWrites with the assigned artifact path, sha256, and summary "Deterministic child diagnostic artifact.", sourceUrls [], and summary "DONE hyperresearch-shaped-1".
- Return DONE hyperresearch-shaped-1.

Parent task:
- Spawn the child with the child task above.
- Wait for the child.
- Close the child.
- Compute SHA-256 for the packet result.
- Write ${PROOF_ROOT}/manifest/hyperresearch-shaped-packet-loop.json with schemaVersion, runId "${RUN_ID}", scenarioId, kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings, selectedPacketPath, expectedOutputPath, and child lifecycle fields.
- For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
PROMPT
      ;;
    bad-output)
      cat > "${prompt}" <<PROMPT
You are running the Hyperresearch child-agent completion diagnostic negative scenario "bad-output".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available. If unavailable, write ${PROOF_ROOT}/manifest/bad-output.json with classification "unsupported_runtime_surface".

Child task:
- Write this malformed JSON to ${PROOF_ROOT}/outputs/bad-output.json: {"schemaVersion":1,"scenarioId":"bad-output",
- Return DONE bad-output.

Parent task:
- Spawn the child, wait for it, close it, then write ${PROOF_ROOT}/manifest/bad-output.json.
- This scenario should not pass cleanly. Expected classification is "artifact_only_succeeded" or another non-clean hash/schema failure. Include explicit blockingFindings for malformed JSON even if the child reached Completed and close returned.
PROMPT
      ;;
    *)
      echo "Unknown scenario ${scenario}" >&2
      return 2
      ;;
  esac
  cp "${prompt}" "${EVIDENCE_ROOT}/prompts/"
}

extract_session_id() {
  local events="$1"
  node - "${events}" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
let found = "";
for (const line of fs.readFileSync(path, 'utf8').split(/\n/)) {
  if (!line.trim()) continue;
  try {
    const value = JSON.parse(line);
    const text = JSON.stringify(value);
    const matches = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
    if (matches && matches.length) {
      found = matches[0];
      break;
    }
  } catch {}
}
process.stdout.write(found);
NODE
}

prepare_hyperresearch_packet() {
  local vault="${PROOF_ROOT}/hyperresearch-shaped/vault"
  mkdir -p "${vault}" "${EVIDENCE_ROOT}/hyperresearch-shaped"
  (
    cd "${TEMPLATE_REPO}"
    bun run --cwd apps/cli rawr hyperresearch codex start \
      --query "Child completion diagnostic packet loop" \
      --vault "${vault}" \
      --steps "${TEMPLATE_REPO}/services/hyperresearch-codex/references/v8-steps" \
      --tier light \
      --backend fixture \
      --json \
      > "${PROOF_ROOT}/logs/hyperresearch-shaped-start.json"
    bun run --cwd apps/cli rawr hyperresearch codex advance \
      --ledger "${vault}/research/temp/hyperresearch-codex-run.json" \
      --agent-mode packets \
      --backend fixture \
      --json \
      > "${PROOF_ROOT}/logs/hyperresearch-shaped-awaiting.json"
  )
  node - "${PROOF_ROOT}/logs/hyperresearch-shaped-awaiting.json" "${PROOF_ROOT}/hyperresearch-shaped/selected-packet.json" "${vault}" <<'NODE'
const fs = require('node:fs');
const [input, output, vault] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
const packetPaths = [];
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.packetPath === 'string') packetPaths.push(value.packetPath);
  if (typeof value.path === 'string' && value.path.includes('codex-agent-packets')) packetPaths.push(value.path);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach(walk);
    else walk(child);
  }
}
walk(payload);
const unique = [...new Set(packetPaths)];
let selected = unique.find((p) => fs.existsSync(p));
if (!selected) {
  const temp = `${vault}/research/temp`;
  const candidates = fs.existsSync(temp)
    ? fs.readdirSync(temp, { recursive: true }).map((p) => `${temp}/${p}`).filter((p) => p.endsWith('.json') && p.includes('packet'))
    : [];
  selected = candidates.find((p) => fs.existsSync(p));
}
if (!selected) {
  throw new Error(`No packet JSON found in advance output: ${input}`);
}
fs.copyFileSync(selected, output);
NODE
  cp "${PROOF_ROOT}/logs/hyperresearch-shaped-start.json" "${EVIDENCE_ROOT}/logs/"
  cp "${PROOF_ROOT}/logs/hyperresearch-shaped-awaiting.json" "${EVIDENCE_ROOT}/logs/"
  cp "${PROOF_ROOT}/hyperresearch-shaped/selected-packet.json" "${EVIDENCE_ROOT}/hyperresearch-shaped/"
}

run_hyperresearch_fanin() {
  local vault="${PROOF_ROOT}/hyperresearch-shaped/vault"
  (
    cd "${TEMPLATE_REPO}"
    bun run --cwd apps/cli rawr hyperresearch codex advance \
      --ledger "${vault}/research/temp/hyperresearch-codex-run.json" \
      --agent-mode packets \
      --backend fixture \
      --json \
      > "${PROOF_ROOT}/logs/hyperresearch-shaped-fanin.json"
  ) || true
  cp "${PROOF_ROOT}/logs/hyperresearch-shaped-fanin.json" "${EVIDENCE_ROOT}/logs/" 2>/dev/null || true
}

copy_generated_files() {
  for dir in outputs manifest sessions process logs events prompts hyperresearch-shaped; do
    if [[ -d "${PROOF_ROOT}/${dir}" ]]; then
      mkdir -p "${EVIDENCE_ROOT}/${dir}"
      cp -R "${PROOF_ROOT}/${dir}/." "${EVIDENCE_ROOT}/${dir}/" 2>/dev/null || true
    fi
  done
}

write_sha256sums() {
  (
    cd "${EVIDENCE_ROOT}"
    find . -type f \
      ! -name sha256sums.txt \
      ! -name .DS_Store \
      -print0 | sort -z | xargs -0 shasum -a 256
  ) > "${EVIDENCE_ROOT}/sha256sums.txt"
}

write_readme() {
  local verdict="${1:-incomplete}"
  cat > "${EVIDENCE_ROOT}/README.md" <<README
# Child Agent Completion Diagnostic Evidence

- Run id: \`${RUN_ID}\`
- Verdict: \`${verdict}\`
- Proof root: \`${PROOF_ROOT}\`
- Evidence root: \`${EVIDENCE_ROOT}\`

This evidence bundle executes the child-agent lifecycle diagnostic from
\`services/hyperresearch-codex/spec/CHILD_AGENT_COMPLETION_CONTRACT.md\`.

Non-claims:

- MCP is parked and was not installed, registered, or tested.
- Hooks were not tested.
- Service packet fan-in remains supporting evidence only; clean completion depends on child spawn/wait/close evidence.

Review files:

- \`commands.sh\`: exact diagnostic runner and watchdog.
- \`manifest/*.json\`: scenario manifests written by parent Codex sessions.
- \`events/*.jsonl\`: raw \`codex-rawr exec --json\` logs.
- \`process/*.txt\`: process snapshots.
- \`logs/*.exit\`, \`logs/*.stderr\`, \`logs/*.last-message.txt\`: wrapper outputs.
- \`sha256sums.txt\`: independent hashes.
README
}

run_scenario() {
  local scenario="$1"
  write_prompt "${scenario}"
  local prompt="${PROOF_ROOT}/prompts/${scenario}.md"
  local events="${PROOF_ROOT}/events/${scenario}.jsonl"
  local stderr="${PROOF_ROOT}/logs/${scenario}.stderr"
  local exit_file="${PROOF_ROOT}/logs/${scenario}.exit"
  local last_message="${PROOF_ROOT}/logs/${scenario}.last-message.txt"
  run_with_watchdog "${scenario}" "${prompt}" "${events}" "${stderr}" "${exit_file}" "${last_message}"
  copy_generated_files
}

run_resume_scenario() {
  write_prompt "multi-resume-happy-initial"
  local initial_events="${PROOF_ROOT}/events/multi-resume-happy-initial.jsonl"
  run_with_watchdog \
    "multi-resume-happy-initial" \
    "${PROOF_ROOT}/prompts/multi-resume-happy-initial.md" \
    "${initial_events}" \
    "${PROOF_ROOT}/logs/multi-resume-happy-initial.stderr" \
    "${PROOF_ROOT}/logs/multi-resume-happy-initial.exit" \
    "${PROOF_ROOT}/logs/multi-resume-happy-initial.last-message.txt"
  local session_id
  session_id="$(extract_session_id "${initial_events}")"
  echo "${session_id}" > "${PROOF_ROOT}/sessions/multi-resume-happy-parent-session-id.txt"
  if [[ -z "${session_id}" ]]; then
    echo "Could not extract parent session id for resume scenario" > "${PROOF_ROOT}/logs/multi-resume-happy-resume.stderr"
    copy_generated_files
    return 0
  fi
  sleep 20
  write_prompt "multi-resume-happy-resume"
  run_with_watchdog \
    "multi-resume-happy-resume" \
    "${PROOF_ROOT}/prompts/multi-resume-happy-resume.md" \
    "${PROOF_ROOT}/events/multi-resume-happy-resume.jsonl" \
    "${PROOF_ROOT}/logs/multi-resume-happy-resume.stderr" \
    "${PROOF_ROOT}/logs/multi-resume-happy-resume.exit" \
    "${PROOF_ROOT}/logs/multi-resume-happy-resume.last-message.txt" \
    "${session_id}"
  copy_generated_files
}

run_hyperresearch_scenario() {
  prepare_hyperresearch_packet
  run_scenario "hyperresearch-shaped-packet-loop"
  run_hyperresearch_fanin
  copy_generated_files
}

main() {
  local mode="${1:-all}"
  record_env
  write_readme "running"
  if [[ "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")" != "${EVIDENCE_ROOT}/commands.sh" ]]; then
    cp "${BASH_SOURCE[0]}" "${EVIDENCE_ROOT}/commands.sh"
  fi
  case "${mode}" in
    single-happy|multi-happy|bad-output)
      run_scenario "${mode}"
      ;;
    multi-resume-happy)
      run_resume_scenario
      ;;
    hyperresearch-shaped-packet-loop)
      run_hyperresearch_scenario
      ;;
    positives)
      run_scenario "single-happy"
      run_scenario "multi-happy"
      run_resume_scenario
      run_hyperresearch_scenario
      ;;
    all)
      run_scenario "single-happy"
      run_scenario "multi-happy"
      run_resume_scenario
      run_hyperresearch_scenario
      run_scenario "bad-output"
      ;;
    *)
      echo "Usage: $0 [single-happy|multi-happy|multi-resume-happy|hyperresearch-shaped-packet-loop|bad-output|positives|all]" >&2
      return 2
      ;;
  esac
  copy_generated_files
  write_readme "review-required"
  write_sha256sums
}

main "$@"
