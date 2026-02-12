# `@rawr/plugin-plugins`

Sync canonical plugin content from RAWR HQ into Codex and Claude agent plugin directories.

## Command

```bash
rawr plugins sync <plugin-ref> [--agent codex|claude|all] [--codex-home <path>] [--claude-home <path>] [--dry-run] [--force] [--gc] [--json]
rawr plugins sync all [--scope all|agents|cli|web] [--agent codex|claude|all] [--codex-home <path>] [--claude-home <path>] [--dry-run] [--json]
rawr plugins lifecycle check --target <path|id> --type <cli|web|agent|skill|workflow|composed> [--base <ref>] [--json]
rawr plugins improve --target <path|id> --type <cli|web|agent|skill|workflow|composed> [--publish] [--wait-minutes 20] [--json]
rawr plugins sweep --scope plugin-system --scheduled|--manual [--publish] [--limit <n>] [--json]
```

Canonical daily command:

```bash
rawr plugins sync all
```

If you need to revert the last mutating sync run:

```bash
rawr undo
```

`rawr undo` replays the temporary sync backup capsule and expires after the next unrelated command.

This performs a full deterministic sync pipeline by default:
- syncs to Codex + Claude targets,
- builds Cowork `.plugin` artifacts,
- refreshes Claude install + enable,
- retires stale managed plugins from rename/delete operations,
- uses `--force` and `--gc` defaults for deterministic convergence.

## Cowork `.zip` packaging (drag-and-drop)

Cowork does not load raw folders directly. It expects a ZIP file you drag-and-drop into Cowork.

By default, `rawr plugins sync ...` also generates a Cowork artifact for each synced plugin:

- Output (default): `dist/cowork/plugins/<pluginName>.zip`
- Override: `--cowork-out <dir>`
- Disable: `--no-cowork`

The `.zip` is generated from **RAWR HQ source content** using the same mapping rules as Claude sync (`workflows -> commands`, `skills`, `scripts`, and optionally `agents`), so it stays in parity with what Claude would see.

## Claude marketplace refresh (install + enable)

Sync writes into a Claude local marketplace directory (default `~/.claude/plugins/local`). Claude Code may also maintain a cached installed copy under `~/.claude/plugins/cache/...`.

By default, after syncing to Claude targets, this command also refreshes the plugin via Claude Code:

- Install/refresh: `claude plugin install <plugin>@<marketplace>`
- Enable: `claude plugin enable <plugin>@<marketplace>`

Disable with:
- `--no-claude-install` and/or `--no-claude-enable`

## Partial mode guard (advanced)

`rawr plugins sync all` blocks partial mode by default. If you intentionally disable part of the full pipeline (example: `--agent claude`, `--scope agents`, `--no-cowork`, `--no-claude-install`, `--no-force`, `--no-gc`, `--no-retire-orphans`), you must add:

```bash
--allow-partial
```

This guard exists to prevent accidental drift and hidden carry-over state.

Compatibility alias (deprecated):
```bash
rawr agent sync <plugin-ref> ...
```

`<plugin-ref>` can be:
- workspace package name (example: `@rawr/plugin-plugins`),
- plugin directory name under `plugins/` (example: `agent-sync`),
- absolute or relative path to a plugin directory.

## Canonical source layout

Only these top-level directories are synced:
- `skills/`
- `workflows/`
- `scripts/`

Anything outside those directories is ignored.

## Mapping

- Codex:
  - `workflows/*.md -> <codex-home>/prompts/*.md`
  - `skills/<name>/** -> <codex-home>/skills/<name>/**`
  - `scripts/<file> -> <codex-home>/scripts/<pluginName>--<file>`
- Claude:
  - `workflows/*.md -> <claude-home>/plugins/<pluginName>/commands/*.md`
  - `skills/<name>/** -> <claude-home>/plugins/<pluginName>/skills/<name>/**`
  - `scripts/<file> -> <claude-home>/plugins/<pluginName>/scripts/<file>`

## Important script boundary

Two script concepts are intentionally separate:
- Plugin-internal implementation scripts: scripts your plugin command/runtime uses internally. These are not part of this sync contract.
- Shipped helper scripts: user/agent-facing helper scripts placed in the canonical `scripts/` directory. These are synced.

Keep plugin-internal scripts out of the canonical shipped `scripts/` directory to avoid accidental distribution.

## Safety behavior

- For `rawr plugins sync all`, deterministic defaults are:
  - `--force` enabled
  - `--gc` enabled
  - `--retire-orphans` enabled
- `rawr plugins sync <plugin-ref>` keeps conservative defaults (`--force` off unless provided).
- `--dry-run`: reports planned operations without writing files.
- `--gc`: removes only previously managed orphaned files (registry/manifest tracked), never unmanaged extras.
- `--retire-orphans`: for sync-all, retires stale managed plugins (rename/delete cleanup) while preserving unmanaged plugins/files.
- Successful mutating sync emits `undo` metadata (`provider`, `capsuleId`, expiry semantics) in JSON output.

## Multi-home configuration

Homes can be provided by repeatable flags:
- `--codex-home <path>` (repeatable)
- `--claude-home <path>` (repeatable)

Or by environment variables:
- `RAWR_AGENT_SYNC_CODEX_HOMES` (comma-separated)
- `RAWR_AGENT_SYNC_CLAUDE_HOMES` (comma-separated)

Back-compat:
- `CODEX_HOME` and `CODEX_MIRROR_HOME` are used when `RAWR_AGENT_SYNC_CODEX_HOMES` is not set.

## Lifecycle Quality Commands

These commands enforce and automate plugin lifecycle quality checks and strict no-policy merge flow.

### Lifecycle check

```bash
rawr plugins lifecycle check --target plugins/cli/plugins --type cli --json
```

Checks:
- tests/docs/dependents completeness for the change unit
- sync dry-run verification
- drift check verification

### Improve (two-pass policy judgment)

```bash
rawr plugins improve --target plugins/cli/plugins --type cli --publish --wait-minutes 20 --json
```

Flow:
- runs lifecycle check
- optionally publishes stack (`gt submit --stack --ai`)
- waits for comment window (default 20m)
- runs two independent policy judges
- auto-merges only on strict dual `auto_merge` consensus with no comment blockers

Judge command wiring (env):
- `RAWR_POLICY_JUDGE1_CMD`
- `RAWR_POLICY_JUDGE2_CMD`

### Sweep (scheduled/manual)

```bash
rawr plugins sweep --scope plugin-system --scheduled --json
rawr plugins sweep --scope plugin-system --manual --publish --json
```

Default scope is plugin-system only.
