# App-Server Explicit Child Resume Evidence

Status: passed as runtime recovery evidence. It does not close Hyperresearch service parity by native child-handle resume.

Purpose: preserve native Codex app-server evidence for explicit child recovery. The scenario starts a parent, spawns a child, stops the app-server, restarts it with the same `CODEX_HOME`, resumes the parent, explicitly resumes the original child id, then waits and closes the child.

## Boundary

This evidence does not prove automatic descendant rehydration from bare parent `thread/resume` or bare `codex-rawr exec resume`. It also does not replace the Hyperresearch service closure strategy, which is ledgered replacement packet attempts for cold-resumed pending children.

If a future Codex/RAWR runtime track chooses explicit child recovery, the observed sequence is:

1. Resume the parent thread/session.
2. Explicitly call `resume_agent` for known open child ids.
3. Wait for the resumed child.
4. Close the resumed child.

## Runtime Repair

The first run of this harness recovered the child handle only to `pending_init`; `wait` timed out. The Codex runtime repair seeds resumed session agent status from the persisted rollout's last status event:

- Codex commit: `24d8fb32aa fix(agent): seed resumed status from rollout`
- Targeted test: `cargo test -p codex-core record_initial_history_resumed_seeds_agent_status_from_rollout`
- Installed CLI observed by the harness: `codex-cli 0.126.0-alpha.3`

## Passing Result

- parent thread: `019defb9-b353-7493-bca5-1d0b4e9676a2`
- original child thread: `019defb9-b389-7220-8621-4fbeb3a623e2`
- classification: `explicit_child_resume_recovered_clean_completion`
- `resumeAgent`: `completed` with `{"explicit_child_result":"ok"}`
- `wait`: `timed_out:false`, child status `completed`
- `closeAgent`: previous status `completed`
- `notFoundStatuses`: `[]`

## Files

- `manifest.json`: review summary and pass/fail fields.
- `explicit-child-resume/summary.json`: full harness summary.
- `explicit-child-resume/jsonrpc.jsonl`: raw app-server JSON-RPC stream.
- `explicit-child-resume/mock-responses-requests.jsonl`: mock Responses requests used by the deterministic provider.
- `harness/app-server-cold-resume-explicit-child-resume-harness.mjs`: deterministic harness.
- `prompts/*.md`: prompts used by the parent turn and resume turn.
- `sha256sums.txt`: hashes for the preserved evidence files.

## Claim

This bundle proves explicit runtime recovery for known child ids after parent resume. It does not prove that bare parent resume makes old child handles usable, and it does not replace the Hyperresearch service closure through ledgered replacement attempts for non-clean child attempts.
