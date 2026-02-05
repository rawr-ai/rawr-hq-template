# `@rawr/core`

- Shared command/runtime primitives for the RAWR CLI (Oclif base command + output conventions).
- If you’re adding a new CLI command, prefer extending `RawrCommand` and using `outputResult()` for stable UX.
- Keep this package dependency-light (it sits on hot CLI paths).

## Next
- `src/index.ts` — public exports
- `src/cli/rawr-command.ts` — `RawrCommand`, result/error types, base flags
- `test/` — Vitest suite (if/when expanded)
- `../../apps/cli/AGENTS.md` — primary consumer

