---
name: agent-sync
description: |
  Sync a RAWR HQ plugin's canonical content (skills/workflows/scripts) into Codex and Claude agent plugin directories.

  Use this when the user asks to "sync skills", "deploy skills", "ship workflows", or "mirror a plugin to Codex/Claude".

  Key triggers: "sync to codex", "sync to claude", "agent plugins", "deploy skills", "skill registry", "workflows directory".
---

# Agent Sync (RAWR HQ -> Codex + Claude)

## What this does

This skill guides you to run the RAWR CLI command that syncs a source plugin's **canonical content** to agent directories.

Canonical source directories inside a plugin:
- `skills/` (skill directories containing `SKILL.md`)
- `workflows/` (markdown workflows; maps to prompts/commands)
- `scripts/` (shipped helper scripts)

Anything outside those directories is ignored.

## Important boundary: shipped scripts vs plugin-internal scripts

- `scripts/` is for **shipped helper scripts** that you intentionally want available alongside the plugin.
- Do not put plugin-internal implementation scripts in `scripts/`.
  - Plugin-internal code belongs in the plugin's normal implementation layout (`src/**`, etc.).

## How to run

1. Dry-run first:

```bash
rawr plugins sync <plugin-ref> --dry-run
```

2. If the plan looks correct, apply:

```bash
rawr plugins sync <plugin-ref>
```

## Cowork drag-and-drop `.zip` artifacts

Cowork expects a ZIP file (drag-and-drop into Cowork). It does **not** load raw folders like `~/.claude/plugins/local/plugins/*` directly.

By default, `rawr plugins sync ...` also generates a Cowork artifact for the synced plugin at:
- `dist/cowork/plugins/<pluginName>.zip`

You can:
- change output dir: `--cowork-out <dir>`
- disable packaging: `--no-cowork`

This `.zip` is generated from the **RAWR HQ plugin source** using the same mapping rules as Claude sync (workflows -> commands, skills, scripts, and optionally agents).

Compatibility alias (deprecated):
```bash
rawr agent sync <plugin-ref>
```

## Sync everything (batch)

```bash
rawr plugins sync all --dry-run
rawr plugins sync all
```

`rawr plugins sync all` is the canonical daily command. It performs full convergence by default:
- Codex + Claude sync
- Cowork `.plugin` packaging
- Claude install + enable refresh
- stale managed plugin retirement (rename/delete cleanup)
- deterministic overwrite + managed-GC defaults

Rollback operator for the last mutating sync run:

```bash
rawr undo
```

If you intentionally want a partial exception (e.g. `--scope agents`, `--agent codex`, `--no-cowork`, `--no-claude-install`, `--no-force`, `--no-gc`), add:

```bash
rawr plugins sync all --allow-partial <partial-flags...>
```

## Target selection

- Default targets are both Codex + Claude.
- Restrict to one agent:

```bash
rawr plugins sync <plugin-ref> --agent codex
rawr plugins sync <plugin-ref> --agent claude
```

## Home overrides (when needed)

```bash
rawr plugins sync <plugin-ref> --codex-home <path> --claude-home <path>
```

- `--codex-home` is repeatable and should point at a Codex home.
- `--claude-home` is repeatable and should point at a Claude local home.

Defaults (when flags are omitted):
- Codex homes:
  - `$RAWR_AGENT_SYNC_CODEX_HOMES` (comma-separated), else
  - `$CODEX_HOME` + `$CODEX_MIRROR_HOME`, else
  - `~/.codex-rawr` and `~/.codex`
- Claude homes:
  - `$RAWR_AGENT_SYNC_CLAUDE_HOMES` (comma-separated), else
  - `~/.claude/plugins/local`

## Conflicts and safety

- Default behavior is protective: if a target file/skill already exists and differs, sync fails.
- To overwrite, add `--force`.

For `rawr plugins sync all`, deterministic mode enables overwrite + GC defaults and blocks partial mode unless `--allow-partial` is explicitly provided.

## Cleanup of managed orphans

If you removed a workflow/skill/script from the source plugin's canonical directories and want targets cleaned up:

```bash
rawr plugins sync <plugin-ref> --dry-run --gc
rawr plugins sync <plugin-ref> --gc
```

`--gc` only deletes items that were previously managed by this sync mechanism (it will not delete unmanaged extras).
