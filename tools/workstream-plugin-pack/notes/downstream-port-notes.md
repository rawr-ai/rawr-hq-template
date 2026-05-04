# Downstream Port Notes

Temporary downstream target:

```text
plugins/agents/habitat/
  package.json
  skills/
  agents/
  hooks/
```

Mapping:

- `skills/workstream-runner/**` -> downstream `skills/workstream-runner/**`.
- `skills/workstream-review-loops/**` -> downstream
  `skills/workstream-review-loops/**`.
- `agents/*.md` -> downstream `agents/*.md`.
- `hooks/*.ts` -> downstream `hooks/*.ts` as provider-specific source
  material.
- `hooks/hooks.json` -> downstream `hooks/hooks.json` as example activation
  config. It is not synced or installed automatically yet.

Temporary bridge:

- Upstream `tools/workstream-plugin-pack/` remains canonical for now.
- `scripts/install-local-codex-pack.ts --target downstream` projects a working
  copy into downstream `plugins/agents/habitat`.
- Remove this projection bridge after `agent-config-sync` supports hook
  projection and the Workstream plugin has been used successfully a few times
  without issues.

Do not port local generated activation outputs as source:

- `.agents/skills/workstream-*` are Codex skill activation outputs.
- `.codex/agents/*.toml` are Codex project-scoped role activation outputs.
- `.codex/hooks/*.ts` and `.codex/hooks.json` are local hook activation
  outputs.

Known gaps:

- Hook activation may still require provider-local config even when reusable
  hook scripts live in a plugin.
- Provider-neutral agent briefs can move cleanly, but Codex `.toml` projection
  may require separate sync support.

Do not sync or install the downstream Habitat plugin until activation is
explicitly requested.
