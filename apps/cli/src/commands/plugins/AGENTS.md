# `rawr plugins …`

- Workspace plugin management (`plugins/*` workspace packages).
- `plugins enable` is a gated activation boundary (calls `@rawr/security.gateEnable`, then persists to `.rawr/state/state.json`).
- Plugin ids resolve as `package.json#name` (preferred) or `plugins/<dirName>` (fallback).

## Next
- `list.ts` — enumerate `plugins/*`
- `enable.ts` — gated enable + persist
- `disable.ts` — persist disable
- `status.ts` — show enabled/disabled status
- `../../lib/workspace-plugins.ts` — plugin discovery + id resolution
- `../../../../packages/state/AGENTS.md` — enablement persistence
- `../../../../packages/security/AGENTS.md` — gating inputs/outputs

