# Hyperresearch Codex Hooks Guardrail Plan

This plan scopes the remaining hook work after service plus Codex packet-orchestration parity. It is prework for a future implementation session, not a claim that hooks are currently installed or proven.

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
| Core | `PreToolUse` | Prevent or record generic source/search bypass during active Hyperresearch runs | Promote only after a temp-project fixture proves payload shape, matching, block/allow behavior, and service-ledger interaction |
| Core | `Stop` | Prevent final answer while ledger validation is red or missing | Promote only after a fixture proves red blocks and green allows |
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
   - Preserve hook stdin payload, exit/result, and `HookStarted`/`HookCompleted` evidence.
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

## Implementation Phases

### Phase 1: Local Runtime Fixture

- Build fixture-only hook scripts under a temp evidence directory or `spec/fixtures/hooks`.
- Prove `PreToolUse` and `Stop` behavior without touching downstream install projection.
- Update `HOOKS_MCP_PARITY.md`, `TESTING_PLAN.md`, and `REVIEW_LEDGER.md` with observed payloads and outcomes.

### Phase 2: Candidate Hook Material

- Convert proven fixture scripts into candidate Hyperresearch hook material.
- Keep candidate material in references until install projection exists.
- Add local script tests for payload parsing and red/green decisions.

### Phase 3: Downstream Projection

- Extend RAWR agent-sync to scan and project hook material only after the runtime fixture is green.
- Prove dry-run, sync, force/update, drift detection, and removal/garbage collection for hook material.
- Only then move hook material out of reference-only status.

## Acceptance

Hook prework is complete when a future implementation session can execute the fixture plan without design decisions left open. Hook parity is complete only when:

- `PreToolUse` source guard and `Stop` validation guard are fixture-proven;
- evidence is committed under `spec/evidence`;
- docs state the exact block/allow behavior and payload shape observed;
- downstream material is synced only as reference or through a proven hook projection path;
- missing lifecycle hooks remain explicit non-claims.
