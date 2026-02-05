# Agent F scratchpad (testing harness / Vitest)

## Slice goals

- Fix redundant build invocation in `bun run test` (build should happen exactly once per test run).
- Make Vitest multi-project config robust (roots + includes), keep `apps/web` on `jsdom`.
- Add 1–2 higher-value integration tests around CLI invocation + exit code behavior.

## Decisions / changes (owned paths)

### Root scripts: eliminate double build

- Problem: root `test` was `bun run pretest:vitest && bun run test:vitest`.
  - Bun/npm lifecycle already runs `pretest:vitest` automatically before `test:vitest`,
    so the explicit `bun run pretest:vitest` caused `turbo run build` to run twice.
- Fix: root `test` now runs only `bun run test:vitest`.
  - Keep `pretest:vitest` as the single build hook for tests.

### Vitest multi-project: explicit `include` patterns per project

- Added an explicit `include` set to each project (`test/**/*.test.{ts,tsx}`, `test/**/*.spec.{ts,tsx}`).
- Rationale: with per-project `root`, avoid relying on Vitest defaults that can vary with `root`/cwd.
- Kept `apps/web` environment as `jsdom`.
- Added a new project entry for `packages/test-utils` (integration tests).

### Integration tests + shared runner util

- Added `packages/test-utils` workspace with `runCommand()` helper:
  - Uses `Bun.spawn` when available, falls back to `node:child_process.spawn`.
  - Captures `stdout`/`stderr` and returns an `exitCode`.
- Added integration tests that spawn the CLI:
  - `bun run rawr -- --help` returns 0 and includes `USAGE` + `doctor`.
  - `bun run rawr -- not-a-command` returns non-zero and mentions the command.

## Potential collisions / coordination notes

- Root `package.json` scripts section is touched:
  - If Agent A modifies root scripts, ensure `test` does *not* explicitly call `pretest:vitest`.
  - If the org decides to rename scripts (e.g. `pretest` instead of `pretest:vitest`), preserve the “build exactly once” invariant.
- `vitest.config.ts` project list touched:
  - If others edit project definitions, ensure `apps/web` stays `jsdom` and each project still has deterministic `include` patterns.
- `packages/test-utils/**` added:
  - If monorepo conventions require adding `build` scripts everywhere, **don’t** add one here unless needed; it’s only used by tests right now.

## Integration checklist

- [x] `bun run test` triggers `turbo run build` exactly once (via `pretest:vitest` lifecycle).
- [x] `vitest run` runs all projects and finds tests under each `root`.
- [x] `apps/web` uses `jsdom`.
- [x] Integration tests pass locally:
  - [x] CLI help smoke test
  - [x] Unknown command exit code is non-zero
- [ ] Commit(s) are clean and scoped to harness/scripts/tests only.
- [ ] Push branch `agent-F-rawr-testing`.

