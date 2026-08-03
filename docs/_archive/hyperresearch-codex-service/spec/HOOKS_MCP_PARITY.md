# Hooks And MCP Parity Boundary

This document records the current Codex/RAWR hooks and Hyperresearch MCP boundary for the Hyperresearch Codex parity work. The concrete hook proof plan lives in `HOOKS_GUARDRAIL_PLAN.md`.

The authoritative Hyperresearch parity loop remains the service ledger, packet validation, source capture, claim trace, patch log, backend CLI audit trail, and final `validate` result. Hooks and MCP may improve guardrails or ergonomics, but they are not acceptance proof unless a separate fixture proves their runtime behavior.

Current status: core Hyperresearch-specific `PreToolUse` and `Stop` guardrails are fixture-proven under `services/hyperresearch-codex/spec/evidence/20260503T235332Z-codex-hooks-proof/`. This proves runtime payload capture plus deterministic guard decisions; it does not prove plugin-packaged hook projection or lifecycle hook parity.

## Codex/RAWR Hook Surface

The local RAWR Codex fork exposes these hook events in source and has `features.codex_hooks=true` in the active config:

- `PreToolUse`
- `PermissionRequest`
- `PostToolUse`
- `SessionStart`
- `UserPromptSubmit`
- `Stop`

Current project hooks are workstream guardrails, not Hyperresearch parity hooks. They prove config-level hooks are active locally; they do not prove Hyperresearch hook projection or plugin-packaged hook installation.

## Claude And Runtime Behaviors Not Replaced By Hooks

The installed Claude Hyperresearch hook surface is narrow: a project-level `PreToolUse` reminder around generic source/search/fetch-style tools. It steers agents toward Hyperresearch source handling, but it is not source-integrity proof and it is not a lifecycle hook.

The broader Claude advantages in the original harness come from skills, `Task` subagents, `TodoWrite`, tool locks/frontmatter, and Claude runtime behavior. Do not document those as installed Claude Hyperresearch hooks.

No current Codex/RAWR hook equivalent is proven for these lifecycle concerns:

- `SubagentStart`
- `SubagentStop`
- `PreCompact`
- `SessionEnd`
- `Notification`

The closest Codex equivalent to the installed Claude hook is a `PreToolUse` command hook. It must be treated as a guardrail only. It cannot replace service source-capture validation or final integrity gates.

## Core Hooks After Fixture

| Need | Codex event | Current disposition |
|---|---|---|
| Discourage generic source fetch bypass during active Hyperresearch runs | `PreToolUse` | Fixture-proven guardrail. Runtime payload capture and direct block/allow decisions are preserved in `20260503T235332Z-codex-hooks-proof`; service source capture remains authoritative |
| Block final closure until service validation is green | `Stop` | Fixture-proven guardrail. Runtime invocation was observed; red/green block/allow semantics are direct-fixture proven because the observed runtime payload had `stop_hook_active:false` |

## Ergonomic Stretch Hooks

| Need | Codex event | Current disposition |
|---|---|---|
| Deny unsafe or escalated bypass paths where permission flow exists | `PermissionRequest` | Optional after core guards; not a universal gate |
| Record post-tool context for diagnostics | `PostToolUse` | Useful for evidence capture, not required for parity |
| Inject run/resume context | `SessionStart`, `UserPromptSubmit` | Ergonomic only; must not mutate run state |

## Unsupported Or Non-Claimed Hooks

| Need | Codex event | Current disposition |
|---|---|---|
| Observe child-agent lifecycle | none proven | Use `CHILD_AGENT_COMPLETION_CONTRACT.md`; do not claim hook parity |
| Observe compaction lifecycle | none proven | Use durable ledger and resume packet; do not claim hook parity |

## Hook Fixture Promotion Evidence

The detailed plan is `HOOKS_GUARDRAIL_PLAN.md`. The core fixture proof supplied:

1. A temporary Codex project and disposable `CODEX_HOME` with `codex_hooks=true` and top-level `hooks` config.
2. Runtime `PreToolUse` payload shape and matched Bash tool name in `payloads/pre-tool-use-runtime.jsonl`.
3. Direct source-bypass block output in `logs/source-guard-block.txt`.
4. Direct Hyperresearch-command allow evidence in `logs/hook-events.jsonl`; `logs/source-guard-allow.txt` is expected-empty because allow decisions emit empty stdout/stderr.
5. Direct routed-source allow evidence in `logs/hook-events-routed-source.jsonl`; `logs/source-guard-routed-allow.txt` is expected-empty for the same reason.
6. Runtime `Stop` payload in `payloads/stop-runtime.jsonl`.
7. Direct `Stop` red/green decisions in `logs/stop-red.txt` and `logs/hook-events.jsonl`; `logs/stop-green.txt` is expected-empty because allow decisions emit empty stdout/stderr.
8. Negative config evidence showing missing top-level `hooks` did not run hooks.
9. Unit coverage for malformed JSON, unsupported events, missing command text, URL bypasses, allowed routed commands, missing/incomplete/red ledgers, missing passed validation marker, ledger path precedence, green ledgers, and timeout classification.

Plugin/config projection remains unclaimed until the Template-owned agent-plugin
lifecycle and provider adapter accept a versioned immutable curated-content
artifact and a fixture proves install, update, dry-run, idempotence, drift, and
removal behavior for Hyperresearch hook material. A local runtime fixture for
`PreToolUse` or `Stop` is not enough to claim plugin-packaged hook projection.

## Hyperresearch MCP Surface

MCP is intentionally parked. It is not fully specified, not part of the active parity claim, and not required for the core Hyperresearch Codex loop. We have not yet investigated the controlled install shape, Codex MCP registration mechanics, tool schemas, authorization model, write-deny enforcement, or parity-equivalent provenance for MCP writes. That is acceptable for the current closure path because MCP does not provide anything the direct Hyperresearch CLI backend lacks for the authoritative loop: step loading, durable ledgering, packet fan-out/fan-in, CLI call audit, source capture, claim trace, patch log, and final validation all remain service/CLI responsibilities. Hook guardrail work must not silently promote MCP.

If MCP is ever promoted later, the specification work must answer:

- which install environment owns `hyperresearch[mcp]` and how version drift is pinned;
- how Codex/RAWR registers, starts, health-checks, and removes the MCP server;
- what each tool schema accepts and returns in the observed runtime, not just source;
- which tools are read-only, check-only, or write-capable in practice;
- how write-capable calls are denied by default;
- how any allowlisted write call records the same ledger, hash, source, and provenance evidence as the CLI backend;
- how MCP tool failures, partial writes, duplicate writes, and retries are classified;
- how MCP evidence is preserved in the parity proof without weakening the service validation gates.

The local Hyperresearch package is `0.8.5`. Its MCP server source exists, but the installed pipx environment lacks the MCP extra:

```text
hyperresearch mcp
MCP server requires: pip install hyperresearch[mcp]
```

The server source exposes these tools:

| Tool | Policy | Notes |
|---|---|---|
| `search_notes` | read after server proof | Useful agent navigation |
| `read_note` | read after server proof | Useful agent navigation |
| `read_many` | read after server proof | Useful agent navigation |
| `list_notes` | read after server proof | Useful agent navigation |
| `get_backlinks` | read after server proof | Useful graph navigation |
| `get_hubs` | read after server proof | Useful graph navigation |
| `vault_status` | read after server proof | Useful diagnostics |
| `lint_vault` | read/check after server proof | Useful diagnostics; not a replacement for final CLI lint gate |
| `check_source` | read/check after server proof | Useful source inspection |
| `list_sources` | read after server proof | Useful source inspection |
| `fetch_url` | denied by default | Write-capable source capture; allow only if ledgered and validated like CLI fetch |
| `create_note` | denied by default | Write-capable vault mutation; allow only if ledgered and hash/provenance checked |
| `update_note` | denied by default | Write-capable vault mutation; allow only if ledgered and hash/provenance checked |

## MCP Disposition

MCP is optional ergonomics. It does not replace the direct Hyperresearch CLI backend because it does not provide the Codex V8 step loader, durable run ledger, packet fan-out/fan-in, CLI stdout/stderr/exit-code audit, claim trace, patch-only guard, or final validation contract.

MCP can be reconsidered after:

1. `hyperresearch[mcp]` is installed in a controlled environment;
2. server start and tool list are observed;
3. at least one read-only call is captured;
4. write tools are denied by default;
5. any allowed write call is allowlisted, ledgered, hash/provenance checked, and covered by final service validation.
