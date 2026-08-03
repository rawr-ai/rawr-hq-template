# Codex Hooks Guardrail Proof

Status: fixture-proven guardrails; downstream hook source placed separately; managed installation unclaimed.

This bundle proves the two core Hyperresearch Codex hook guardrails in a disposable `CODEX_HOME`; it does not mutate or install anything into the active `~/.codex-rawr` home.

## What passed

- `PreToolUse` runtime discovery worked after `hooks.json` used the Codex-required top-level `hooks` object.
- Real `codex-rawr exec` invoked the `PreToolUse` guard for a Bash command and preserved the observed stdin payload in `payloads/pre-tool-use-runtime.jsonl`.
- Direct fixture execution blocked a generic source fetch command (`curl https://example.com/source`) with a Codex-style `hookSpecificOutput.permissionDecision=deny` response in `logs/source-guard-block.txt`.
- Direct fixture execution allowed an explicit Hyperresearch service command. Allow decisions emit empty stdout/stderr, so the decision is recorded in `logs/hook-events.jsonl`.
- Direct fixture execution allowed an explicitly routed source URL (`curl https://example.com/source` with `HYPERRESEARCH_ALLOWED_SOURCE_URLS=https://example.com/source`). Allow stdout/stderr are empty in `logs/source-guard-routed-allow.txt` and `logs/source-guard-routed-allow.stderr`; the decision and reason are recorded in `logs/hook-events-routed-source.jsonl`.
- Direct fixture execution blocked a red/incomplete ledger in `logs/stop-red.txt` and allowed a green completed ledger with `validation.passed=true`. Green allow stdout/stderr are empty, and the decision is recorded in `logs/hook-events.jsonl`.
- Real `codex-rawr exec` invoked the `Stop` guard and preserved the observed stdin payload in `payloads/stop-runtime.jsonl`; the observed runtime payload had `stop_hook_active:false`, so red/green blocking semantics are proven by direct fixture execution rather than a live final-answer block.

## Important non-claims

- Hook events do not replace source capture, artifact hashes, claim trace, patch log, or final service validation.
- This is not plugin-packaged hook projection. Downstream hook source now lives under `plugins/agents/hyperresearch/hooks/`, but installation remains unclaimed until agent-sync supports managed hook material with dry-run, sync, update, drift, and removal evidence.
- MCP, lifecycle hook parity, automatic descendant rehydration, production readiness, and unrelated global plugin drift remain unclaimed.

## Files

- `hooks/`: exact hook scripts and runtime `hooks.json` used for the proof.
- `payloads/`: observed runtime payloads and direct fixture payloads.
- `logs/`: block outputs, expected-empty allow outputs, smoke events, stderr, and hook decision logs.
- `ledgers/`: red and green ledgers used by `Stop` direct fixture proof.
- `sha256sums.txt`: checksums for committed proof files.

## Runtime notes

- `logs/hook-smoke-events.jsonl` is the initial negative probe where `hooks.json` lacked the top-level `hooks` wrapper and hooks did not run.
- `logs/hook-smoke-final-events.jsonl` is the accepted runtime smoke after the wrapper fix.
- `codex-rawr exec --json` did not emit `hook/started` or `hook/completed` items into JSONL output; the local Codex exec event processor suppresses those notifications. The hook scripts' payload and decision logs are therefore the durable runtime evidence.
