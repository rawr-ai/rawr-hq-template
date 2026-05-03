# Hooks And MCP Parity Boundary

This document records the current Codex/RAWR hooks and Hyperresearch MCP boundary for the Hyperresearch Codex parity work.

The authoritative Hyperresearch parity loop remains the service ledger, packet validation, source capture, claim trace, patch log, backend CLI audit trail, and final `validate` result. Hooks and MCP may improve guardrails or ergonomics, but they are not acceptance proof unless a separate fixture proves their runtime behavior.

## Codex/RAWR Hook Surface

The local RAWR Codex fork exposes these hook events in source and has `features.codex_hooks=true` in the active config:

- `PreToolUse`
- `PermissionRequest`
- `PostToolUse`
- `SessionStart`
- `UserPromptSubmit`
- `Stop`

Current project hooks are workstream guardrails, not Hyperresearch parity hooks. They prove config-level hooks are active locally; they do not prove Hyperresearch hook projection or plugin-packaged hook installation.

## Claude Hook Behavior Not Ported

No current Codex/RAWR hook equivalent is proven for:

- `SubagentStart`
- `SubagentStop`
- `PreCompact`
- `SessionEnd`
- `Notification`

Claude Hyperresearch uses a `PreToolUse` vault/web-fetch reminder. The closest Codex equivalent is a `PreToolUse` command hook, but it must be treated as a guardrail only. It cannot replace service source-capture validation or final integrity gates.

## Core Guardrail Mapping

| Need | Codex event | Current disposition |
|---|---|---|
| Discourage generic source fetch bypass during active Hyperresearch runs | `PreToolUse` | Useful core guardrail after fixture proof; it must hard-block the bypass or record it as a policy failure, and service source capture remains authoritative |
| Deny unsafe or escalated bypass paths where permission flow exists | `PermissionRequest` | Optional guardrail; not a universal gate |
| Record post-tool context for diagnostics | `PostToolUse` | Useful for evidence capture, not required for parity |
| Inject run/resume context | `SessionStart`, `UserPromptSubmit` | Ergonomic only |
| Block final closure until service validation is green | `Stop` | Useful core guardrail after fixture proof |
| Observe child-agent lifecycle | none proven | Use `CHILD_AGENT_COMPLETION_CONTRACT.md`; do not claim hook parity |
| Observe compaction lifecycle | none proven | Use durable ledger and resume packet; do not claim hook parity |

## Hook Fixtures Required Before Promotion

1. A temporary Codex project with `codex_hooks=true` and a harmless `PreToolUse` command hook records `HookStarted`/`HookCompleted` and stdin payload shape.
2. A Hyperresearch source guard blocks generic source fetch/search during an active run unless the action routes through packet `sourceUrls` and service source capture, or records the bypass as a policy failure.
3. A `Stop` guard blocks final answer when the ledger is incomplete or validation is red, and allows closure after `validate --backend real` passes.
4. A child-loop diagnostic proves missing subagent lifecycle hooks are covered by session evidence and packet/service validation.

Plugin/config projection remains unclaimed until a fixture proves install, update, and removal behavior for Hyperresearch hook material.

## Hyperresearch MCP Surface

MCP is intentionally parked. It is not fully specified, not part of the active parity claim, and not required for the core Hyperresearch Codex loop. We have not yet investigated the controlled install shape, Codex MCP registration mechanics, tool schemas, authorization model, write-deny enforcement, or parity-equivalent provenance for MCP writes. That is acceptable for the current closure path because MCP does not provide anything the direct Hyperresearch CLI backend lacks for the authoritative loop: step loading, durable ledgering, packet fan-out/fan-in, CLI call audit, source capture, claim trace, patch log, and final validation all remain service/CLI responsibilities.

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
