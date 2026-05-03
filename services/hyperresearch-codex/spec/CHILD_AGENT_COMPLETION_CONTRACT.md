# Child Agent Completion Contract

This contract separates Hyperresearch service fan-in from Codex/RAWR child-session lifecycle behavior.

The current Hyperresearch service proof is file and ledger based: packet files are emitted, packet output files are reread from disk, artifact writes are hash-checked, source captures are ledgered, claim traces and patch logs are validated, and final `validate` gates acceptance. The stuck wait behavior observed in the runtime proofs did not break those service gates.

Bare parent-resume child-session completion remains unclaimed: a resumed parent cannot assume old child handles are usable. The accepted Hyperresearch lifecycle behavior is explicit child resume for known child ids after parent resume, followed by wait and close. If explicit child resume still cannot cleanly complete a child attempt, the service falls back to replacement-attempt fan-in: the original attempt stays non-clean and the same logical packet job may complete only through a ledgered replacement packet output that passes all service gates. Replacement packet outputs prove service durability; they do not prove the original child handle completed cleanly.

## Observed Diagnostic Result

The first focused diagnostic was executed and preserved under `spec/evidence/20260503T193257Z-child-agent-completion/`.

Result: failed for clean resume lifecycle.

- Same-process `codex-rawr exec` child lifecycle passed for `single-happy`, `multi-happy`, and `hyperresearch-shaped-packet-loop`.
- `bad-output` classified correctly as a non-clean artifact failure despite successful child lifecycle.
- `multi-resume-happy` failed: after `codex-rawr exec resume`, the resumed parent could not wait/close the child ids spawned before resume. All three resumed `wait` and `close_agent` calls returned `not_found`, while the child output files existed and hashed.

This remains the boundary evidence that bare `exec resume` is insufficient. The service packet/ledger proof remains valid.

The paired native-surface review in `NATIVE_CODEX_SURFACE_REVIEW.md` confirmed that SDK/app-server surfaces should not replace the Hyperresearch service loop. The TypeScript Codex SDK wraps `codex exec`; raw OpenAI SDKs are a different runtime; app-server is diagnostic/recovery evidence because it exposes thread start/resume, live reconnect, thread read/list APIs, streamed item events, and collaborative-agent lifecycle items. The app-server smoke preserved under `spec/evidence/20260503T201420Z-app-server-child-lifecycle/` reproduced the resume failure in structured form: after cold parent `thread/resume`, `wait` and `closeAgent` against the original child id failed with child status `notFound`. The explicit-child-resume evidence under `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/` now proves the recovery path after the Codex status-seeding fix: `resume_agent` recovers the original child to `Completed`, `wait` returns without timeout, and `closeAgent` observes previous status `Completed`.

## Operational Rule

After cold parent resume, the coordinator must explicitly rehydrate known open or uncertain child attempts before completing the logical packet job:

1. Resume the parent thread/session and inspect the logical packet jobs still awaiting output.
2. Explicitly call `resume_agent` for known open child ids.
3. Then call `wait`.
4. Then call `close_agent` / `closeAgent`.
5. If explicit child resume still cannot cleanly complete an attempt, record the original attempt as non-clean and use a replacement packet attempt for the same logical job.
6. Require any replacement packet output to include attempt id/number, replaced attempt id, replacement reason, and original attempt classification.
7. Accept the logical job only after output, artifact writes, source URLs, claim trace, patch log, and final validation pass.

Do not claim that bare parent resume automatically rehydrates descendants, and do not upgrade the original attempt to `clean_completed`. Hooks are separate follow-up work. MCP is parked; do not install `hyperresearch[mcp]`, register MCP, test MCP tools, or design MCP parity while executing this child track.

The app-server diagnostic has two decisive resume cases:

- `app-server-live-reconnect`: keep the same app-server process loaded, connect a second client, call `thread/resume` on the parent, and require wait/close against the original child ids. This remains useful for UI/reconnect ergonomics but does not by itself prove durable child handles after process restart.
- `app-server-cold-resume-direct`: stop app-server, restart it with the same `CODEX_HOME`, call `thread/resume` on the parent, and require wait/close against the original child ids. This has failed in the preserved app-server smoke.

`app-server-cold-resume-explicit-child-resume` has been run and passes after the runtime status-seeding fix. Treat it as runtime recovery evidence for known child ids after parent resume. Hyperresearch service plus packet-orchestration parity closes through replacement-attempt fan-in for child attempts that classify non-clean.

Start from the template repo:

```bash
cd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity
git status --short
codex-rawr --version
```

Create a disposable runtime root and a durable evidence target:

```bash
export RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-child-agent-completion"
export TEMPLATE_REPO="/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity"
export CODEX_HOME="${CODEX_HOME:-/Users/mateicanavra/.codex-rawr}"
export PROOF_ROOT="/tmp/codex-rawr-child-diagnostic-${RUN_ID}"
export EVIDENCE_ROOT="${TEMPLATE_REPO}/services/hyperresearch-codex/spec/evidence/${RUN_ID}"
mkdir -p "${PROOF_ROOT}"/{prompts,outputs,events,logs,process,manifest,sessions} "${EVIDENCE_ROOT}"
```

Record exact commands in `${PROOF_ROOT}/commands.sh`; preserve that file in the evidence bundle. Use these command templates unless the live CLI help proves a necessary adjustment:

```bash
(
  cd "${TEMPLATE_REPO}" &&
  CODEX_HOME="${CODEX_HOME}" codex-rawr exec \
    --dangerously-bypass-approvals-and-sandbox \
    --json \
    -C "${TEMPLATE_REPO}" \
    < "${PROOF_ROOT}/prompts/parent-initial.md" \
    | tee "${PROOF_ROOT}/events/parent-initial.jsonl"
)

(
  cd "${TEMPLATE_REPO}" &&
  CODEX_HOME="${CODEX_HOME}" codex-rawr exec resume "${PARENT_SESSION_ID}" \
    --dangerously-bypass-approvals-and-sandbox \
    --json \
    < "${PROOF_ROOT}/prompts/parent-resume.md" \
    | tee "${PROOF_ROOT}/events/parent-resume.jsonl"
)
```

`commands.sh` must use an explicit watchdog instead of relying on an operator to notice a stuck wait. The wrapper shape is:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCENARIO_TIMEOUT_SECONDS="${SCENARIO_TIMEOUT_SECONDS:-1800}"
PROCESS_SNAPSHOT_SECONDS="${PROCESS_SNAPSHOT_SECONDS:-30}"
PROCESS_SETTLE_SECONDS="${PROCESS_SETTLE_SECONDS:-30}"

snapshot_processes() {
  local scenario="$1"
  local label="$2"
  local out="${PROOF_ROOT}/process/${scenario}-${label}.txt"
  {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
    pgrep -af codex-rawr || true
    if [[ -n "${CODEX_PARENT_PID:-}" ]]; then
      ps -p "${CODEX_PARENT_PID}" -o pid,ppid,stat,etime,command || true
    fi
  } > "${out}"
}

run_with_watchdog() {
  local scenario="$1"
  local prompt="$2"
  local events="$3"
  local stderr="$4"
  local exit_file="$5"
  local resume_session_id="${6:-}"

  snapshot_processes "${scenario}" "before-spawn"
  set +e
  (
    cd "${TEMPLATE_REPO}"
    if [[ -n "${resume_session_id}" ]]; then
      CODEX_HOME="${CODEX_HOME}" codex-rawr exec resume "${resume_session_id}" \
        --dangerously-bypass-approvals-and-sandbox \
        --json \
        < "${prompt}"
    else
      CODEX_HOME="${CODEX_HOME}" codex-rawr exec \
        --dangerously-bypass-approvals-and-sandbox \
        --json \
        -C "${TEMPLATE_REPO}" \
        < "${prompt}"
    fi
  ) > "${events}" 2> "${stderr}" &
  CODEX_PARENT_PID="$!"
  echo "${CODEX_PARENT_PID}" > "${PROOF_ROOT}/logs/${scenario}.pid"

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
  return "${code}"
}
```

Exit code `124` or any wrapper-initiated `TERM`/`KILL` is `manual_terminated`. It may be expected for a negative case, but it never contributes to clean child-completion proof. Preserve the raw exit-code files and classification files.

The parent prompt must ask Codex to spawn the required child agents, wait for each child, close each child, and write the manifest. If the active `codex-rawr` runtime cannot expose spawn/wait/close tools in `exec`, the scenario is `unsupported_runtime_surface`, not a clean pass.

## Output Schema

Each child writes exactly one deterministic JSON file under `${PROOF_ROOT}/outputs/`. The child output must not include timestamps, process IDs, session IDs, or any value that changes between runs. Hashes are SHA-256 over the exact bytes written on disk; do not reformat before hashing.

Minimal child output:

```json
{
  "schemaVersion": 1,
  "scenarioId": "single-happy",
  "logicalChildId": "single-1",
  "attemptId": "single-1-a1",
  "result": "DONE single-1",
  "payload": "hyperresearch-child-completion-diagnostic"
}
```

The parent manifest records runtime observations that are not deterministic enough for the child output:

```json
{
  "schemaVersion": 1,
  "runId": "20260503T000000Z-child-agent-completion",
  "codexRawrVersion": "codex-cli 0.126.0-alpha.3",
  "templateHead": "<git-sha>",
  "proofRoot": "/tmp/codex-rawr-child-diagnostic-...",
  "evidenceRoot": "services/hyperresearch-codex/spec/evidence/...",
  "passed": false,
  "blockingFindings": [],
  "warningFindings": [],
  "timeoutPolicy": {
    "childWaitSeconds": 600,
    "closeSeconds": 120,
    "scenarioSeconds": 1800,
    "processSettleSeconds": 30
  },
  "scenarios": [
    {
      "scenarioId": "single-happy",
      "kind": "positive",
      "passed": false,
      "classification": "incomplete",
      "parentSessionId": "<thread-id>",
      "parentInitialEventLog": "events/parent-initial.jsonl",
      "parentResumeEventLog": null,
      "commands": ["commands.sh:initial-single-happy"],
      "processSnapshots": ["process/single-happy-before-spawn.txt"],
      "children": [
        {
          "logicalChildId": "single-1",
          "attemptId": "single-1-a1",
          "attemptNumber": 1,
          "replacesAttemptId": null,
          "replacementReason": null,
          "childSessionId": "<child-thread-id>",
          "spawnItemId": "<item-id>",
          "waitItemId": "<item-id>",
          "closeItemId": "<item-id>",
          "expectedOutputPath": "outputs/single-1.json",
          "expectedOutputSha256": "<sha256>",
          "childFinalState": "Completed",
          "parentWaitResult": "wait_completed",
          "parentCloseResult": "close_ok",
          "diagnosticClassification": "clean_completed",
          "eventChain": [
            "spawn_agent completed",
            "wait_agent completed",
            "close_agent completed"
          ]
        }
      ]
    }
  ]
}
```

The manifest cannot override raw event/session evidence. Any disagreement between manifest, event JSONL, session-resolution output, child output hashes, or process state is `observation_conflict` and blocks a clean pass.

## State And Result Taxonomy

Child final states:

- `Completed`: the only clean child final state.
- `Errored`: terminal non-clean.
- `Shutdown`: terminal non-clean unless the scenario explicitly injects shutdown.
- `NotFound`: terminal non-clean unless the scenario explicitly injects missing-session behavior.
- `Interrupted`: non-clean and unresolved unless a later resume observes `Completed`.
- `Unknown`: no reliable final state observed.

Parent wait results:

- `wait_completed`: parent wait returned and observed child `Completed`.
- `wait_timeout`: parent wait exceeded `childWaitSeconds`.
- `wait_interrupted`: parent wait was interrupted before observing completion.
- `wait_error`: parent wait returned an error.
- `wait_not_found`: parent wait could not resolve the child/session.
- `wait_not_attempted`: parent did not attempt wait; this is never clean.

Parent close results:

- `close_ok`: parent close completed for the child handle/session.
- `close_already_closed`: acceptable only after `wait_completed` and raw evidence proves the child was already closed.
- `close_timeout`: close exceeded `closeSeconds`.
- `close_not_found`: close could not resolve the child/session.
- `close_error`: close returned an error.
- `close_not_attempted`: parent did not attempt close; this is never clean.

Diagnostic classifications:

- `clean_completed`: child `Completed`, parent wait returned, parent close completed or was already closed with evidence, hashes match, and process/session evidence has no conflict.
- `stuck_output_no_final`: child output file exists and hashes, but no child final state is observed before timeout.
- `stuck_final_no_wait`: child reaches a final state, but parent wait misses it or times out.
- `close_hung`: wait completed, but close timed out or never returned.
- `manual_terminated`: any parent/child process or wrapper had to be killed to continue.
- `replacement_succeeded`: a replacement attempt completed, but the original attempt did not cleanly complete.
- `artifact_only_succeeded`: files were valid enough for service fan-in, but child lifecycle did not cleanly complete.
- `observation_conflict`: preserved evidence disagrees.
- `unsupported_runtime_surface`: required spawn/wait/close behavior is unavailable in the tested runtime.
- `incomplete`: evidence bundle is missing required fields.

Replacement rule: a replacement attempt may have `childFinalState: "Completed"`, but it never upgrades the replaced attempt to `clean_completed`. The manifest must record logical child job id, attempt number, replaced attempt id, replacement reason, original-handle classification, and replacement-handle classification.

## Required Evidence Bundle

Preserve a reviewable bundle under `services/hyperresearch-codex/spec/evidence/<RUN_ID>/` with:

- `README.md`: scenario summary, verdict, non-claims, and exact remaining caveats;
- `commands.sh`: exact initial and resume commands, exit codes, and environment variables;
- `manifest/manifest.json`: the schema above;
- `sha256sums.txt`: independent hashes for prompts, child outputs, event logs, manifest, and summaries;
- `prompts/*.md`: parent initial/resume prompts and any child prompt text sent by the parent;
- `outputs/*.json`: deterministic child output files;
- `events/*.jsonl`: parent `codex-rawr exec --json` event logs before and after resume;
- `sessions/*`: copied session JSONL or session-resolution output for every parent and child session that can be resolved;
- `process/*.txt`: timestamped process snapshots;
- `logs/*.stdout` and `logs/*.stderr`: wrapper stdout/stderr where not already captured by JSONL;
- `env.txt`: `codex-rawr --version`, `hyperresearch --version`, `git rev-parse HEAD`, `git status --short`, `CODEX_HOME`, and OS/shell summary.

Process snapshots must include:

- before spawn;
- after spawn;
- during wait;
- after child output appears;
- after wait return or timeout;
- after close return or timeout;
- after resume close for resume scenarios.

Use both:

```bash
pgrep -af codex-rawr
ps -p <pid> -o pid,ppid,stat,etime,command
```

If a PID cannot be found, record the lookup command and output. A missing process can support a clean pass only when event/session evidence already proves `wait_completed` and close completion or already-closed status.

## Diagnostic Scenarios

Run the positive cases first:

1. `single-happy`: one child writes valid JSON and returns `DONE single-1`; parent wait and close both complete.
2. `multi-happy`: three children write distinct valid JSON outputs and return `DONE <child-id>`; parent waits and closes all three.
3. `multi-resume-happy`: three children are spawned, the parent is interrupted/resumed from a fresh `codex-rawr exec resume <parent-session-id>` process, and the resumed parent observes wait and close completion.
4. `hyperresearch-shaped-packet-loop`: use the same Codex/RAWR spawn/wait/close/resume path as Hyperresearch role-agent packets, but keep child work trivial and deterministic. Use the blessed service packet-gate path below; do not replace it with a prompt-only facsimile.

Run negative/classification cases after the positive baseline:

5. `output-no-completion`: child writes valid output but never reaches `Completed` before `childWaitSeconds`; expected classification is `stuck_output_no_final`.
6. `completion-no-wait`: child reaches final state but parent wait misses or times out; expected classification is `stuck_final_no_wait`.
7. `bad-output`: child output is malformed JSON, truncated JSON, or valid JSON with the wrong SHA-256; expected classification is non-clean and hash/schema failure must be explicit.
8. `replacement-required`: original attempt remains non-clean and replacement attempt completes. Expected classification is `replacement_succeeded`; this proves service durability only, not clean child completion.

If the runtime cannot force a negative case directly, record that scenario as `unsupported_runtime_surface` or `incomplete` with evidence. Do not silently remove it from the diagnostic matrix.

## Hyperresearch-Shaped Packet Loop

The blessed execution path for `hyperresearch-shaped-packet-loop` is:

1. Create a disposable vault under `${PROOF_ROOT}/hyperresearch-shaped/vault`.
2. Start a light fixture run with absolute step references:

```bash
bun run --cwd apps/cli rawr hyperresearch codex start \
  --query "Child completion diagnostic packet loop" \
  --vault "${PROOF_ROOT}/hyperresearch-shaped/vault" \
  --steps "${TEMPLATE_REPO}/services/hyperresearch-codex/references/v8-steps" \
  --tier light \
  --backend fixture \
  --json \
  > "${PROOF_ROOT}/logs/hyperresearch-shaped-start.json"
```

3. Advance until the service returns an `awaiting_agents` packet gate:

```bash
bun run --cwd apps/cli rawr hyperresearch codex advance \
  --ledger "${PROOF_ROOT}/hyperresearch-shaped/vault/research/temp/hyperresearch-codex-run.json" \
  --agent-mode packets \
  --backend fixture \
  --json \
  > "${PROOF_ROOT}/logs/hyperresearch-shaped-awaiting.json"
```

4. Select one returned packet job and preserve its packet JSON. The packet must include at least:

```json
{
  "id": "02-width-sweep-1-fetcher",
  "role": "hyperresearch-fetcher",
  "expectedOutputPath": "research/temp/codex-agent-results/02-width-sweep-1-fetcher.json",
  "artifactContract": {
    "assignedArtifacts": [
      {
        "path": "research/temp/diagnostic-child-artifact.json",
        "required": true
      }
    ]
  }
}
```

If the live packet schema uses different field names, copy the live packet exactly and record the schema difference in `README.md`. The required behavior is unchanged: the parent must spawn the role-named child, wait for it, close it, and correlate those events with the packet job and expected output path.

5. The child writes the assigned deterministic artifact plus the packet result at the service-declared `expectedOutputPath`. The packet result must include:

```json
{
  "status": "complete",
  "artifactWrites": [
    {
      "path": "research/temp/diagnostic-child-artifact.json",
      "sha256": "<sha256>",
      "summary": "Deterministic child diagnostic artifact."
    }
  ],
  "sourceUrls": [],
  "summary": "DONE hyperresearch-shaped-1"
}
```

6. After parent wait/close, run one more `advance` against the same ledger to prove the packet output remains service-valid. This service fan-in check is supporting evidence only; clean child completion still requires correlated spawn/wait/close evidence.

## Pass Criteria

Clean child completion is proven only when all positive scenarios pass with:

- every required child reaches `Completed`;
- every parent wait returns `wait_completed`, including after resume;
- every parent close returns `close_ok` or evidence-backed `close_already_closed`;
- every child output file exists and matches its recorded SHA-256;
- parent event JSONL, child/session evidence, session-resolution output, process snapshots, and manifest agree;
- no replacement attempt is required to make a positive case pass;
- no manual process termination is required;
- `hyperresearch-shaped-packet-loop` passes without relying on service fan-in alone.

Negative cases do not need to be clean; they need to classify deterministically. Classified failures are evidence quality, not clean pass evidence.

## Fail Criteria

The diagnostic fails or remains open if:

- a child writes the expected output but never emits `Completed`;
- a child reaches `Completed` but parent wait misses it;
- parent resume leaves an open child handle that cannot be closed or classified;
- close is missing, hung, or uncorrelated for any child;
- `Interrupted` remains the terminal observed state;
- replacement is required for any positive scenario;
- event/session/process evidence conflicts with the manifest;
- runtime tools needed for spawn/wait/close are unavailable.

## Closure Rule

`HR-CODEX-035` is closed for Hyperresearch service plus Codex packet-orchestration parity by ledgered replacement attempts after a child attempt classifies non-clean. Explicit child resume after parent resume is runtime recovery evidence, but native clean child-handle resume remains unclaimed. A cold-resumed pending child may finish as `replacement_succeeded`; that classification is service parity evidence only. It never upgrades the original child attempt to `clean_completed`.

Required replacement evidence fields:

- `originalAttemptId`
- `originalChildThreadId` when known
- `originalObservedState`
- `replacementAttemptId`
- `replacementChildThreadId` when known
- `replacesAttemptId`
- `classification: "replacement_succeeded"`
- `serviceValidationPassed: true`
- `notNativeChildResumeEvidence: true`

Reopen `HR-CODEX-035` if replacement packet outputs no longer complete the same logical job through validated artifacts, source capture, claim trace, patch log, and final validation. Explicit child resume regressions belong to the Codex/RAWR runtime track unless they prevent replacement-attempt classification or packet completion. Replacement packet outputs must not be used to overclaim native clean original-child completion.

## Hyperresearch Runtime Boundary

Missing Codex `SubagentStop`-style hooks are not a service defect and should not be papered over as hook parity. Hyperresearch runs rely on the packet output contract and final service validation for artifact integrity. Native child lifecycle proof is a separate runtime ergonomics gate for parent wait/close behavior.

Diagnostic evidence should stay outside service source and under `spec/evidence/`. The service ledger records only the Hyperresearch-relevant result: logical packet job attempts, non-clean original classifications, accepted replacement attempts, accepted output hashes, and validation state.

Any service hardening must stay inside the existing topology:

- allowed likely touchpoints: `src/service/modules/runs/helpers/agent-packets.ts`, `src/service/modules/runs/helpers/ledger.ts`, `src/service/modules/runs/helpers/result.ts`, `src/service/modules/runs/router.ts`, `src/service/shared/entities.ts`, and focused tests;
- do not create `runtime`, `modules/common`, `modules/*/services`, module-root business files, `shared/helpers`, a child-session manager, a scheduler, or a new callable surface;
- keep behavior under `runs.advanceV8Run` and the existing packet/job flow.
