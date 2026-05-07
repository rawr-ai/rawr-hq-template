# Downstream Port Notes

Downstream target:

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
- `hooks/hooks.json` -> downstream `hooks/hooks.json` as provider-specific
  hook config.

Bridge status:

- Downstream `plugins/agents/habitat` is now the distributable Workstream
  plugin source.
- Upstream `tools/workstream-plugin-pack/` is a deprecated bridge/recovery copy.
- `scripts/install-local-codex-pack.ts --target downstream` is retained only
  for recovery while the template-side migration still carries this directory.
- Remove this projection bridge once no template migration step depends on it.

Do not port local generated activation outputs as source:

- `.agents/skills/workstream-*` are Codex skill activation outputs.
- `.codex/agents/*.toml` are Codex project-scoped role activation outputs.
- `.codex/hooks/*.ts` and `.codex/hooks.json` are local hook activation
  outputs.

Known posture:

- Native provider sync now packages and installs Habitat skills, agents, and
  hooks through downstream `rawr-hq/plugins/agents/habitat`.
- Remaining Codex prompt mirrors are legacy/auxiliary compatibility output and
  should be migrated into skills over time.
