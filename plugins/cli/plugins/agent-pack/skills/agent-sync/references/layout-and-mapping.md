# Agent Sync: Layout + Mapping

## Canonical source layout (in RAWR HQ plugin)

Only these directories are eligible for sync:
- `skills/`
- `workflows/`
- `scripts/`
- `agents/`
- `hooks/`
- `mcp/` and root `.mcp.json`
- `settings/`
- `assets/`

## Target mapping

### Codex

- `workflows/*.md` -> `<codex-home>/prompts/*.md`
- `skills/<name>/**` -> `<runtime-user-skill-root>/<name>/**`
- `scripts/<file>` -> `<codex-home>/scripts/<pluginName>--<file>`
- `agents/*.md` -> `<codex-home>/agents/*.toml`
- `hooks/**` -> `<codex-home>/hooks/rawr/<pluginName>/**` plus managed `hooks.json`
- `mcp/**` -> `<codex-home>/mcp/rawr/<pluginName>/**` plus managed `config.toml`
- `settings/**` -> managed `config.toml`

Codex registry metadata is updated at:
- `<codex-home>/plugins/registry.json`

Codex skill sync uses the runtime user skill root. The legacy root
`<codex-home>/skills` path is cleanup-only for previously managed mirrors, not
an active destination.

Codex agent TOML contains only `name`, `description`, and
`developer_instructions`. Claude-only agent frontmatter and Claude-style
`Skill(...)`, `Task(...)`, and `TodoWrite` orchestration are reported as
semantic support residuals; they do not make materially converged sync drift.

### Claude

- `workflows/*.md` -> `<claude-home>/plugins/<pluginName>/commands/*.md`
- `skills/<name>/**` -> `<claude-home>/plugins/<pluginName>/skills/<name>/**`
- `scripts/<file>` -> `<claude-home>/plugins/<pluginName>/scripts/<file>`
- `agents/*.md` -> `<claude-home>/plugins/<pluginName>/agents/*.md`

Claude metadata files managed/updated:
- `<claude-home>/plugins/<pluginName>/.claude-plugin/plugin.json`
- `<claude-home>/.claude-plugin/marketplace.json`
- `<claude-home>/plugins/<pluginName>/.rawr-sync-manifest.json`

## Cowork `.zip` artifacts

Cowork expects plugin ZIP files (drag-and-drop). The sync command can generate these from the RAWR HQ source plugin using the same Claude mapping rules, writing by default to:

- `dist/cowork/plugins/<pluginName>.zip`
