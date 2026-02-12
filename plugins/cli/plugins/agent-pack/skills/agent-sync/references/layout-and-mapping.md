# Agent Sync: Layout + Mapping

## Canonical source layout (in RAWR HQ plugin)

Only these directories are eligible for sync:
- `skills/`
- `workflows/`
- `scripts/`

## Target mapping

### Codex

- `workflows/*.md` -> `<codex-home>/prompts/*.md`
- `skills/<name>/**` -> `<codex-home>/skills/<name>/**`
- `scripts/<file>` -> `<codex-home>/scripts/<pluginName>--<file>`

Codex registry metadata is updated at:
- `<codex-home>/plugins/registry.json`

### Claude

- `workflows/*.md` -> `<claude-home>/plugins/<pluginName>/commands/*.md`
- `skills/<name>/**` -> `<claude-home>/plugins/<pluginName>/skills/<name>/**`
- `scripts/<file>` -> `<claude-home>/plugins/<pluginName>/scripts/<file>`

Claude metadata files managed/updated:
- `<claude-home>/plugins/<pluginName>/.claude-plugin/plugin.json`
- `<claude-home>/.claude-plugin/marketplace.json`
- `<claude-home>/plugins/<pluginName>/.rawr-sync-manifest.json`

## Cowork `.zip` artifacts

Cowork expects plugin ZIP files (drag-and-drop). The sync command can generate these from the RAWR HQ source plugin using the same Claude mapping rules, writing by default to:

- `dist/cowork/plugins/<pluginName>.zip`
