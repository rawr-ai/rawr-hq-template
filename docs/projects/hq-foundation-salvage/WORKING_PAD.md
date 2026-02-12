# Working Pad

- Created from template main on branch `codex/hq-foundation-salvage-template`.
- Source branch for salvage: `codex/agent-codex-rawr-hq-plugin-foundation` (`dd78e32`).
- Salvage destination package: `plugins/agents/hq`.
- Salvaged content:
  - `skills/rawr-hq-orientation/**`
  - `skills/rawr-hq-plugin-creation/**`
- Added package scaffold:
  - `plugins/agents/hq/package.json`
  - `plugins/agents/hq/README.md`
- Discarded during salvage:
  - `agent-plugins/rawr-hq/.claude-plugin/plugin.json`
  - `docs/projects/rawr-hq-agent-plugin/*` scratch/project artifacts
- Normalization applied:
  - Replaced legacy runtime command wording with `rawr plugins web ...`.
  - Updated channel-specific package paths to `plugins/cli/<dir>` and `plugins/web/<dir>`.
