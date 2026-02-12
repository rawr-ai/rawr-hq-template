# HQ Foundation Salvage Plan

## Scope
- Salvage only relevant, non-legacy content from superseded `codex/agent-codex-rawr-hq-plugin-foundation`.
- Land content in canonical template-owned locations under `plugins/agents/hq/**`.
- Ensure command-surface references match current policy (`rawr plugins ...` and `rawr plugins web ...`).
- Keep contribution minimal: content and docs only, no runtime behavior changes.

## Implementation Decisions
- Keep and relocate:
  - `rawr-hq-orientation` skill plus references.
  - `rawr-hq-plugin-creation` skill plus references/assets.
- Discard:
  - legacy `agent-plugins/rawr-hq/.claude-plugin/plugin.json` packaging artifact.
  - old project scratch notebooks under `docs/projects/rawr-hq-agent-plugin/*` (historical implementation notes, no canonical contract value).
- Normalize while salvaging:
  - Channel B commands now use `rawr plugins web ...`.
  - Channel-specific package skeleton paths now use `plugins/cli/<dir>` and `plugins/web/<dir>`.
  - Runtime plugin location language is scoped to `plugins/web/*`.

## Validation
- Confirm no legacy runtime command spelling in new/changed salvage files.
- Confirm all salvaged content is under `plugins/agents/hq/**` plus required scratch docs.
