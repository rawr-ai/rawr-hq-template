# Plugins (`plugins/*`)

- Each `plugins/<dir>` is a workspace package (see root `package.json#workspaces`).
- Plugin id is `package.json#name` (preferred) or the directory name (fallback); CLI accepts either.
- Enablement is a gated activation boundary: `rawr plugins enable <id>` (writes `.rawr/state/state.json`).

## Next
- `hello/AGENTS.md` — minimal oclif plugin example
- `mfe-demo/AGENTS.md` — micro-frontend demo (server + web exports)
- `../apps/cli/src/commands/plugins/AGENTS.md` — enable/disable UX + id resolution rules
- `../apps/server/AGENTS.md` — server plugin loader + `/rawr/plugins/web/:dirName`
- `../docs/SECURITY_MODEL.md` — gate policy + reports
- `../vitest.config.ts` — per-plugin test project wiring
