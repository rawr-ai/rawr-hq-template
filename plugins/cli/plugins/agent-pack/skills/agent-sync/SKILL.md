---
name: agent-sync
description: |
  Deploy a RAWR HQ plugin's canonical content through native Codex and Claude provider plugin paths.

  Use this when the user asks to "sync skills", "deploy skills", "ship workflows", or "mirror a plugin to Codex/Claude".

  Key triggers: "sync to codex", "sync to claude", "agent plugins", "deploy skills", "skill registry", "workflows directory", "plugin export".
---

# Agent Sync (RAWR HQ -> Codex + Claude)

## What this does

This skill guides you to run the RAWR CLI command that deploys a source
plugin's **canonical content** through native Codex and Claude provider plugin
paths. Use projection/export only for explicit mapped filesystem destinations.

Canonical source directories inside a plugin:
- `skills/` (skill directories containing `SKILL.md`)
- `workflows/` (markdown workflows; maps to prompts/commands)
- `scripts/` (shipped helper scripts)
- `agents/` (Claude agents and Codex standalone TOML unless explicitly disabled)
- `hooks/`
- `mcp/` and root `.mcp.json`
- `settings/`
- `assets/`

Anything outside those directories is ignored.

## Material sync vs semantic support

`IN_SYNC` means managed files, metadata, and configured destinations are materially converged. It does not mean Claude, Codex, and Cowork have equivalent runtime semantics.

Codex custom agents are projected as standalone TOML with only:
- `name`
- `description`
- `developer_instructions`

Claude-only fields such as `tools`, `hooks`, `mcpServers`, `permissionMode`, `skills`, `model`, and `color` are reported as semantic support residuals instead of being written into Codex TOML. Claude-style `Skill(...)`, `Task(...)`, and `TodoWrite` orchestration is also reported as semantic support status, not material drift.

Native provider plugins are the Codex and Claude harness sync path. Filesystem
projection is a separate destination-path output lane for explicit mapped
destinations, fixtures, repair, migration, ad-hoc packaging, repo dumps, and
non-CLI systems.

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

## Codex native marketplace packages

Codex official plugin package generation is the default native deployment path. RAWR writes a local Codex marketplace and installs generated plugins through the selected Codex CLI by default:

```bash
rawr plugins sync <plugin-ref>
rawr plugins sync all
```

Use `--no-codex-package` to skip package generation, or `--no-codex-install` to generate the marketplace without installing it. Use `--codex-bin <path>` to choose a Codex binary; default resolution is `RAWR_CODEX_BIN`, then `~/.local/bin/codex`, then `codex` on `PATH`.

Use `--install-scope user` when you need to be explicit. `user` is the default and currently the only supported install scope; other scopes are intentionally reserved until RAWR supports them end to end.

Default outputs:
- `dist/codex/.agents/plugins/marketplace.json`
- `dist/codex/plugins/<pluginName>/`

The package includes `.codex-plugin/plugin.json`, `skills/`, `hooks/hooks.json` when hook lifecycle config is modeled, hook scripts as support material, MCP config/files when modeled, shipped scripts, custom agents, settings/config material, and assets.

Codex plugin hooks require a provider with the `plugin_hooks` feature. If the default `codex-rawr` binary is behind upstream, use `--codex-bin <latest-codex>` for hook verification, for example `/Users/mateicanavra/.volta/bin/codex`.

## Destination-path projection

Use projection when you intentionally need RAWR-modeled content copied to
explicit filesystem destinations without native provider install:

```bash
rawr plugins export <plugin-ref> --agent codex|claude|all --codex-home <path> --claude-home <path>
rawr plugins export all --agent codex|claude|all --codex-home <path> --claude-home <path>
```

Projection requires explicit destination homes for the selected agent shape. It
does not fall back to `CODEX_HOME`, `RAWR_AGENT_SYNC_*`, configured provider
homes, or provider default homes.

`rawr plugins sync --destination-projection` can be used when a workstream needs
native deployment plus destination-path filesystem output in one run. Projection
is not a Codex or Claude harness sync fallback.

By default, successful native provider sync also exposes the generic
`cleanupBehind` result surface. The first implemented policy is Codex native
install superseding RAWR-managed direct projection residue. Cleanup removes only
registry-owned residue that the same Codex home's provider install has
verified, reports retained residue in JSON, and is suppressed by
`--destination-projection`, `--no-codex-install`, or `--no-cleanup-behind`.

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
- Cowork `.zip` packaging
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
  - `$CODEX_HOME`, else
  - `~/.codex-rawr`
- Claude homes:
  - `$RAWR_AGENT_SYNC_CLAUDE_HOMES` (comma-separated), else
  - `~/.claude/plugins/local`

Native Codex package install currently uses the first selected Codex home for
the provider app-server session. Additional Codex homes are explicit
destination-path projection targets only when `rawr plugins export` or
`--destination-projection` is used.

Cleanup behind native install is exposed through the generic `cleanupBehind`
result surface. The first implemented policy is Codex native install
superseding RAWR-managed direct projection residue. It is scoped to the same
Codex home that provider install verified. Shared runtime skill roots are
checked against sibling Codex homes before a physical runtime skill directory is
removed.

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
