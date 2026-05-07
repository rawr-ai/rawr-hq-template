# `@rawr/plugin-plugins`

Deploy canonical RAWR plugin content through native Codex and Claude provider
plugin paths. Use `rawr plugins export` only for explicit generic filesystem
projection.

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
- builds Cowork `.zip` artifacts,
- builds/registers/installs Codex marketplace packages through the native provider path,
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

## Codex native marketplace packages

Codex package generation is the default native deployment path. By default, this command writes a local Codex marketplace root, registers it with the selected Codex CLI/app-server, and installs generated plugins. Use `--no-codex-package` to skip package generation, or `--no-codex-install` to generate packages without installing them.

- Package toggle: `--codex-package` / `--no-codex-package`
- Install toggle: `--codex-install` / `--no-codex-install`
- Codex binary override: `--codex-bin <path>` (default: `RAWR_CODEX_BIN`, then `~/.local/bin/codex`, then `codex` on `PATH`)
- Install scope: `--install-scope user` (default; currently the only supported scope)
- Marketplace root (default): `dist/codex/`
- Package output: `dist/codex/plugins/<pluginName>/`
- Override: `--codex-out <dir>`

Generated packages include:
- `.codex-plugin/plugin.json`
- `skills/`
- `hooks/hooks.json` when hook lifecycle config is modeled, plus hook scripts as support material
- MCP config/files when modeled
- shipped scripts, custom agents, settings/config material, and assets as provider package support material

Codex plugin hooks require a provider with the `plugin_hooks` feature. Current `codex-rawr` may lag upstream; for hook verification use `--codex-bin <latest-codex>` when needed, for example `/Users/mateicanavra/.volta/bin/codex`.

Direct Codex filesystem projection is not the sanctioned deployment path. Use `rawr plugins export` or `rawr plugins export all` for generic projection/repair destinations.

## Claude marketplace refresh (install + enable)

Sync writes into a Claude local marketplace directory (default `~/.claude/plugins/local`). Claude Code may also maintain a cached installed copy under `~/.claude/plugins/cache/...`.

By default, after syncing to Claude targets, this command also refreshes the plugin via Claude Code:

- Marketplace registration: `claude plugin marketplace add --scope user <claude-local-home>`
- Install/refresh: `claude plugin install <plugin>@<marketplace>`
- Enable: `claude plugin enable <plugin>@<marketplace>`

Disable with:
- `--no-claude-install` and/or `--no-claude-enable`

`--install-scope user` is accepted on both `rawr plugins sync` and `rawr plugins sync all` so the default user-local install scope is explicit in CLI help, JSON output, and install adapter results. Other scopes are reserved for a future provider-scope decision and are rejected today.

## Generic destination projection (advanced)

Use these commands when you intentionally need RAWR-modeled content copied to explicit filesystem destinations without native provider install:

```bash
rawr plugins export <plugin-ref> --agent codex|claude|all --codex-home <path> --claude-home <path>
rawr plugins export all --agent codex|claude|all --codex-home <path> --claude-home <path>
```

Projection commands require explicit destination homes for the selected agent
shape. They do not fall back to `CODEX_HOME`, `RAWR_AGENT_SYNC_*`, configured
provider homes, or provider default homes.

`rawr plugins sync` also has `--destination-projection` when a workstream needs native deployment plus auxiliary filesystem projection in one run. This is for fixtures, migration, repair, ad-hoc packaging, and non-CLI systems. It is not a fallback for Codex or Claude plugin deployment.

By default, successful native provider sync also runs cleanup behind the
provider install through the generic `cleanupBehind` result surface. The first
implemented policy is Codex native install superseding RAWR-managed direct
projection residue. Cleanup removes only registry-owned residue that the same
Codex home's provider install has verified, reports retained residue in JSON,
and is suppressed by `--destination-projection`, `--no-codex-install`, or
`--no-cleanup-behind`.

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
- `agents/` (provider-specific; Claude and Codex on by default unless explicitly disabled)
- `hooks/`
- `mcp/` and root `.mcp.json`
- `settings/`
- `assets/`

Anything outside those directories is ignored.

## Generic Projection Mapping

- Codex:
  - `workflows/*.md -> <codex-home>/prompts/*.md`
  - `skills/<name>/** -> <runtime-user-skill-root>/<name>/**` (`$HOME/.agents/skills` for real `.codex*` homes)
  - `scripts/<file> -> <codex-home>/scripts/<pluginName>--<file>`
  - `agents/*.md -> <codex-home>/agents/*.toml`; Claude-only frontmatter is dropped and reported as adapter-required projection metadata.
  - `hooks/`, `mcp/`, `.mcp.json`, and `settings/` merge into managed Codex config/runtime support paths.
- Claude:
  - `workflows/*.md -> <claude-home>/plugins/<pluginName>/commands/*.md`
  - `skills/<name>/** -> <claude-home>/plugins/<pluginName>/skills/<name>/**`
  - `scripts/<file> -> <claude-home>/plugins/<pluginName>/scripts/<file>`
  - `agents/*.md -> <claude-home>/plugins/<pluginName>/agents/*.md`

These mappings describe `rawr plugins export` and `--destination-projection`, not the default native provider deployment lane.

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

Default Codex target selection:
- `RAWR_AGENT_SYNC_CODEX_HOMES` wins when set and may include multiple homes.
- Otherwise `CODEX_HOME` is used as the primary active Codex home.
- Otherwise the default is `~/.codex-rawr`.

Native Codex package install currently uses the first selected Codex home for
the provider app-server session. Additional Codex homes are explicit generic
projection destinations only when `rawr plugins export` or
`--destination-projection` is used.

Cleanup behind native install is scoped to the same Codex home that provider
install verified. Shared runtime skill roots are checked against sibling Codex
homes before a physical runtime skill directory is removed.

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
