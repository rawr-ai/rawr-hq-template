# RAWR HQ (`rawr-hq`)

- Bun + TypeScript + Turborepo monorepo; primary UX is the `rawr` oclif CLI.
- Run: `bun run rawr -- <command...>` · Dev stack: `bun run dev` · Tests: `bun run test` · Types: `bun run typecheck`.
- Workspaces: `apps/*` (runtime surfaces), `packages/*` (shared libs), `plugins/*` (extensibility).
- Local runtime/state lives in `.rawr/` (gitignored): journal, security reports, plugin enablement state.

## Next
- `apps/AGENTS.md` — CLI/server/web entrypoints
- `packages/AGENTS.md` — shared library map
- `plugins/AGENTS.md` — workspace plugins + contracts
- `docs/AGENTS.md` — canonical docs + runbook
- `scripts/AGENTS.md` — git hooks and repo scripts
- `package.json` / `turbo.json` / `vitest.config.ts` / `bunfig.toml` — tooling glue

