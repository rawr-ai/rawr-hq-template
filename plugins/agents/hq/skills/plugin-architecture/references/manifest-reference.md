# Manifest and Layout Reference

## Package manifest (`package.json`)

Plugin packages use `package.json` with a `rawr` field to declare kind and behavior. Example fields (not exhaustive):

- `rawr.kind`: `toolkit` | `agent` | `web`
- `rawr.channel`: `A` | `B` (command surface boundary)
- `rawr.pluginContent`: canonical content layout/overlays for sync

## Canonical content layout

For synced content, the canonical roots are:

- `skills/`
- `workflows/`
- `scripts/`
- `agents/` (agent plugins only; synced to Claude by default)

## Claude plugin manifest (`.claude-plugin/plugin.json`)

Claude expects a plugin manifest under `.claude-plugin/plugin.json` and discovers component directories (skills, commands/workflows, agents, scripts) at plugin root.

Key rule: keep plugins self-contained (installed plugins run from a cached copy).

