# CLI (`@rawr/cli`)

- Primary entrypoint for “agent-executable” functionality: `rawr <topic> <command>`.
- CLI runtime (`src/index.ts`) best-effort journals each run into `.rawr/journal/**` when executed inside a workspace root.
- Commands should extend `@rawr/core`’s `RawrCommand` to support `--json`, `--dry-run`, `--yes`.

## Next
- `src/index.ts` — oclif runtime + journal instrumentation
- `src/commands/AGENTS.md` — command map (topics + ids)
- `src/lib/AGENTS.md` — shared CLI helpers (workspace detection, subprocess, security loader, factory)
- `test/` — CLI Vitest suite (`vitest --project cli`)
- `../../packages/core/AGENTS.md` — `RawrCommand` contract
- `../../packages/journal/AGENTS.md` — journal storage + sqlite index
- `../../packages/security/AGENTS.md` — security checks + gate
- `../../packages/state/AGENTS.md` — enabled-plugin persistence (`.rawr/state/state.json`)

