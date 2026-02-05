# `@rawr/test-utils`

- Helpers for integration-style tests (currently: run a CLI command with Bun-or-Node fallback).
- Prefer using these helpers from app/package tests instead of re-rolling `spawnSync` wrappers.

## Next
- `src/run-command.ts` — `runCommand(command, args, { cwd, env, timeoutMs })`
- `src/index.ts` — public exports
- `test/` — Vitest integration test(s)

