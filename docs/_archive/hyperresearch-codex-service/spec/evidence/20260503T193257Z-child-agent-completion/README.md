# Child Agent Completion Diagnostic Evidence

Status: failed.

This run executed the child-agent lifecycle diagnostic from `CHILD_AGENT_COMPLETION_CONTRACT.md` using `codex-rawr exec` / `codex-rawr exec resume` and a watchdog wrapper. It did not use MCP and did not test hooks.

## Verdict

Clean child-session completion is still not proven. Same-process child lifecycle works, but child handles are not durable across `codex-rawr exec resume` in this diagnostic.

The decisive blocker is `multi-resume-happy`: the initial parent spawned three children and exited with `READY_FOR_RESUME`; the resumed parent process resumed the same parent thread id, but `wait` and `close_agent` against all three original child ids returned `not_found`. The child output files existed and hashed, so the service packet/disk durability model remains valid, but the original child handles did not complete cleanly from the resumed parent perspective.

## Scenario Summary

| scenario | result | classification | notes |
|---|---:|---|---|
| `single-happy` | pass | `clean_completed` | one child spawned, waited, closed, and hashed |
| `multi-happy` | pass | `clean_completed` | three children spawned before wait; all waited, closed, and hashed |
| `multi-resume-happy` | fail | `stuck_final_no_wait` | resumed parent saw prior child handles as `not_found` for wait and close |
| `hyperresearch-shaped-packet-loop` | pass | `clean_completed` | role-like packet child completed and selected packet output was service-valid; second packet job intentionally remained outside scenario |
| `bad-output` | classified negative | `artifact_only_succeeded` | child lifecycle completed, malformed JSON artifact blocked clean artifact success |

Not run after the positive resume blocker: `output-no-completion`, `completion-no-wait`, and `replacement-required`.

## Evidence Map

- `commands.sh`: exact runner and watchdog used for all scenarios.
- `manifest/manifest.json`: aggregate normalized verdict.
- `manifest/*.json`: per-scenario parent-authored manifests.
- `events/*.jsonl`: raw `codex-rawr exec --json` parent event logs.
- `logs/*.stderr` and `logs/*.exit`: stderr and exit status for each parent process.
- `process/*.txt`: timestamped process snapshots.
- `outputs/*.json`: deterministic child outputs or intentional malformed output.
- `sessions/session-resolution.json`: local session JSONL resolution summary.
- `hyperresearch-shaped/selected-packet.json`: service packet selected for the Hyperresearch-shaped scenario.
- `sha256sums.txt`: independent hashes for checked-in evidence files.

## Non-Claims

- MCP remains parked.
- Hooks were not tested.
- This does not prove child lifecycle parity after resume.
- This does not invalidate the Hyperresearch service packet fan-in model; it preserves the distinction between disk-backed service durability and Codex child-handle ergonomics.
