# Hyperresearch Codex Hooks Guardrail Plan

This plan records the scoped hook guardrail work after service plus Codex packet-orchestration parity. The core runtime fixture is now proven for `PreToolUse` and `Stop`; managed plugin projection and lifecycle hook parity remain unclaimed.

## Decision

Implement hooks as guardrails and ergonomics only. The authoritative Hyperresearch loop remains the service ledger, packet outputs, source capture, claim trace, patch log, backend CLI audit trail, and final `validate` result.

Core hook parity is narrow:

1. `PreToolUse` source-bypass guard.
   - This is the only direct Claude Hyperresearch hook analogue observed so far.
   - Claude Hyperresearch installs a `PreToolUse` reminder around generic search/fetch-style tools; it steers agents toward Hyperresearch source handling but does not prove source integrity.
   - Codex/RAWR can approximate this after a fixture proves actual tool names, stdin payload shape, block/allow behavior, and transcript-visible feedback.
2. `Stop` final-closure guard.
   - This is a Codex-native guardrail rather than a Claude Hyperresearch hook parity item.
   - It should block final closure when the active ledger is missing, incomplete, or `rawr hyperresearch codex validate --backend real|fixture` is red.
   - It must allow closure after validation passes.

Everything else is optional ergonomics or explicit non-claim.

## Current Proof Status

Core proof bundle: `services/hyperresearch-codex/spec/evidence/20260503T235332Z-codex-hooks-proof/`.

Observed proof:

- Disposable `CODEX_HOME` with the Codex-required top-level `hooks` object invoked both `PreToolUse` and `Stop` during `codex-rawr exec`.
- Runtime `PreToolUse` payload is preserved at `payloads/pre-tool-use-runtime.jsonl`; it matched `tool_name: "Bash"` and `tool_input.command`.
- Direct fixture execution blocked `curl https://example.com/source` with a Codex-style `hookSpecificOutput.permissionDecision=deny` response and a non-empty reason.
- Direct fixture execution allowed Hyperresearch service commands and explicitly routed source URLs. Allow decisions intentionally emit empty stdout/stderr; the decision logs carry the allow evidence.
- Direct fixture execution blocked missing/incomplete/red ledgers and allowed a green ledger with `validation.passed:true`.
- Runtime `Stop` payload is preserved at `payloads/stop-runtime.jsonl`; the observed payload had `stop_hook_active:false`, so red/green final-answer blocking is proven by direct fixture execution rather than a live final-answer block.

Service-local fixture scripts live under `services/hyperresearch-codex/spec/fixtures/hooks/`.
The distributable Hyperresearch hook source lives downstream under
`plugins/agents/hyperresearch/hooks/`. That downstream placement does not by
itself prove agent-sync hook projection or installation.

## Non-Claims

- Hooks do not replace source capture, artifact hash checks, claim trace, patch log, or final validation.
- `SubagentStart` and `SubagentStop` parity is not claimed. Child lifecycle evidence remains in `CHILD_AGENT_COMPLETION_CONTRACT.md`.
- `PreCompact` and `SessionEnd` parity is not claimed. Durable ledgers and resume packets carry compaction/resume obligations.
- `Notification` parity is not claimed.
- Plugin-packaged Hyperresearch hook installation is not claimed until RAWR agent-sync has managed hook projection with install, update, dry-run, drift, and removal evidence.
- MCP remains parked and is not part of this hook track.

## Hook Tiers

| Tier | Hook | Purpose | Promotion rule |
|---|---|---|---|
| Core | `PreToolUse` | Prevent or record generic source/search bypass during active Hyperresearch runs | Fixture-proven guardrail. Runtime payload and direct block/allow decisions are preserved in `20260503T235332Z-codex-hooks-proof`; service source capture remains authoritative |
| Core | `Stop` | Prevent final answer while ledger validation is red or missing | Fixture-proven guardrail. Runtime invocation is observed; red/green block/allow decisions are direct-fixture proven because the runtime payload had `stop_hook_active:false` |
| Stretch | `PermissionRequest` | Deny unsafe escalations where Codex permission flow exposes enough context | Optional after the two core hooks are proven |
| Stretch | `PostToolUse` | Capture diagnostics after relevant tool calls | Optional evidence convenience; not a parity gate |
| Stretch | `SessionStart` / `UserPromptSubmit` | Inject resume context or point to current ledger/run packet | Optional ergonomics; must not mutate run state |
| Unsupported | Subagent and compaction/session-end lifecycle hooks | No proven Codex/RAWR equivalent | Keep as explicit non-claim |

## Fixture Plan

Use a disposable `CODEX_HOME` and temporary project. Do not mutate the user's active `~/.codex-rawr` during hook proof.

Evidence bundle:

```text
services/hyperresearch-codex/spec/evidence/<timestamp>-codex-hooks-proof/
  README.md
  env.txt
  hooks/hooks.json
  hooks/pre_tool_use_source_guard.ts
  hooks/stop_validation_guard.ts
  payloads/pre-tool-use-*.json
  payloads/stop-*.json
  logs/codex-rawr-version.txt
  logs/hook-events.jsonl
  logs/source-guard-block.txt
  logs/source-guard-allow.txt
  logs/stop-red.txt
  logs/stop-green.txt
  ledgers/red-ledger.json
  ledgers/green-ledger.json
  sha256sums.txt
```

Minimum scenarios:

1. Hook smoke.
   - Configure `codex_hooks=true` in the temp `CODEX_HOME`.
   - Register a harmless `PreToolUse` command hook.
   - Run `codex-rawr exec` in the temp project.
   - Preserve hook stdin payload, exit/result, and hook decision logs. `codex-rawr exec --json` did not emit hook start/completion notifications for this run; the payload and decision logs are the durable proof.
2. Source guard block.
   - Create or point to an active Hyperresearch ledger.
   - Attempt a generic source/search/fetch path that bypasses packet `sourceUrls`.
   - Require a deterministic block or a policy-failure record with a non-empty reason.
3. Source guard allow.
   - Route source capture through packet `sourceUrls` and service source capture.
   - Require the hook to allow the operation while final service validation still verifies the captured source.
4. Stop guard red.
   - Point the hook at a missing, incomplete, or invalid ledger.
   - Require `Stop` to block with the ledger path and validation failure reason.
5. Stop guard green.
   - Point the hook at a completed ledger where `rawr hyperresearch codex validate --backend real|fixture` returns `passed:true`.
   - Require `Stop` to allow closure.
6. Negative cases.
   - Malformed `hooks.json`.
   - Hook disabled.
   - Unsupported event names.
   - Stale or missing ledger path.
   - Hook timeout.
   - Missing block reason.

DRA proof fill-in:

- committed evidence directory path: `services/hyperresearch-codex/spec/evidence/20260503T235332Z-codex-hooks-proof/`;
- Codex/RAWR version: `codex-cli 0.126.0-alpha.3`;
- observed `PreToolUse` payload: `payloads/pre-tool-use-runtime.jsonl`;
- observed `Stop` payload: `payloads/stop-runtime.jsonl`;
- source-bypass block output: `logs/source-guard-block.txt`;
- Hyperresearch-command allow evidence: `logs/hook-events.jsonl` plus expected-empty stdout in `logs/source-guard-allow.txt`;
- routed-source allow evidence: `logs/hook-events-routed-source.jsonl` plus expected-empty stdout in `logs/source-guard-routed-allow.txt`;
- `Stop` red/green evidence: block output in `logs/stop-red.txt`, allow decision in `logs/hook-events.jsonl`, and expected-empty allow stdout in `logs/stop-green.txt`;
- config negative probe: `logs/hook-smoke-events.jsonl` shows the initial missing top-level `hooks` wrapper did not run hooks;
- no downstream hook projection or install claim is made.

## Implementation Phases

### Phase 1: Local Runtime Fixture

- Status: complete for core `PreToolUse`/`Stop` guardrails.
- Fixture scripts live under `spec/fixtures/hooks`.
- Evidence lives under `spec/evidence/20260503T235332Z-codex-hooks-proof/`.
- Active `~/.codex-rawr` was not mutated.

### Phase 2: Downstream Hook Source

- Status: complete for source placement.
- Distributable hook source lives downstream under `plugins/agents/hyperresearch/hooks/`.
- The service package keeps only fixtures and evidence copies of hook scripts.
- Local tests cover payload parsing, source guard block/allow, red/green `Stop` decisions, malformed payloads, unsupported events, ledger path precedence, missing validation markers, and timeout classification.

### Phase 3: Downstream Projection

- Extend RAWR agent-sync to scan and project hook material only after the runtime fixture is green.
- Prove dry-run, sync, force/update, drift detection, and removal/garbage collection for hook material.
- Status: open. This phase is not part of the current parity claim.

## Acceptance

Core hook guardrail proof is complete when:

- `PreToolUse` source guard and `Stop` validation guard are fixture-proven;
- evidence is committed under `spec/evidence`;
- docs state the exact block/allow behavior and payload shape observed;
- downstream hook source exists, but managed projection/install remains unclaimed until a proven hook projection path exists;
- missing lifecycle hooks remain explicit non-claims.

Plugin-packaged hook parity is complete only after agent-sync hook projection exists and has install/update/dry-run/drift/removal evidence.
