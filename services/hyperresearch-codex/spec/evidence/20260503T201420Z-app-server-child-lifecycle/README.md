# App-Server Child Lifecycle Smoke

Status: failed cold-resume child-handle durability, with stronger structured evidence than the `exec` JSONL diagnostic.

Purpose: test whether `codex-rawr app-server` provides a more native path for the child-agent completion issue behind `HR-CODEX-035`.

The harnesses use a local mock Responses provider through `codex-rawr app-server`. They do not call a live model. They exercise Codex's app-server thread/turn/collab plumbing with deterministic model responses that request `spawn_agent`, `wait_agent`, and `close_agent`.

## Files

- `manifest.json`: aggregate verdict and key thread ids.
- `harness/app-server-same-process-harness.mjs`: same-process app-server lifecycle harness.
- `harness/app-server-cold-resume-child-harness.mjs`: cold parent-resume child-handle harness.
- `same-process/summary.json`: passing same-process spawn/wait/close summary.
- `same-process/jsonrpc.jsonl`: raw JSON-RPC app-server stream for the passing same-process case.
- `same-process/mock-responses-requests.jsonl`: mock Responses API request log.
- `same-process/app-server.stderr.log`: app-server stderr log.
- `cold-resume/summary.json`: failing cold-resume summary.
- `cold-resume/jsonrpc.jsonl`: raw JSON-RPC app-server stream for the failing cold-resume case.
- `cold-resume/mock-responses-requests.jsonl`: mock Responses API request log.
- `cold-resume/app-server.stderr.log`: app-server stderr log.
- `sha256sums.txt`: evidence checksums.

## Result

Same-process app-server lifecycle passed:

- `spawnAgent` completed and returned child `019def77-f1f6-71d2-a498-b6c019a5f4da`.
- `wait` completed for that child with status `completed`.
- `closeAgent` completed for that child with status `completed`.
- `thread/read includeTurns:true` reconstructed the collab lifecycle items after parent resume while the history remained available.

Cold parent resume failed:

- Parent thread: `019def79-feb7-76c0-9c7a-1657a3e804a2`.
- Child thread spawned before resume: `019def79-fee5-75c1-980c-ce5d136d6328`.
- After restarting app-server with the same temp `CODEX_HOME`, parent `thread/resume` succeeded and loaded the parent.
- `wait` against the original child id completed as a failed collab item with child agent status `notFound`.
- `closeAgent` against the original child id completed as a failed collab item with child agent status `notFound`.

## Conclusion

App-server is the right diagnostic surface because it gives structured `collabAgentToolCall` items, thread status, and thread history. It does not close the parity blocker by itself. The same child-handle durability failure appears after cold parent resume, now as structured `notFound` rather than only `exec` stderr/JSONL behavior.

The remaining repair should target Codex/RAWR descendant resume behavior, not the Hyperresearch service. Candidate shapes are an explicit app-server descendant-resume option, such as `thread/resume { resumeOpenDescendants: true }`, or public experimental agent lifecycle RPCs backed by `AgentControl`.
