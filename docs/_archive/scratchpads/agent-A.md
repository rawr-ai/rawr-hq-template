# Agent A Scratchpad (Monorepo + Turbo scaffolding)

Owner: Agent A  
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-A-rawr-monorepo`  
Branch: `agent-A-rawr-monorepo`  

## Summary
Primary goal for this slice: align Turbo+Bun+TS build/dev behavior so Turbo caching and outputs work cleanly (and avoid running short-lived tasks as persistent `dev`).

## Decisions
- **TS emit for `build`:** removed `noEmit` from root `tsconfig.base.json` so package `build` scripts using `tsc -p tsconfig.json` actually produce `dist/**`.
- **Typecheck remains `--noEmit`:** all package `typecheck` scripts already use `--noEmit`; kept that contract.
- **Web `build` should not write `dist/**` via `tsc`:** changed `apps/web` `build` to `tsc --noEmit && vite build` so only Vite writes `dist/**` (prevents confusing Turbo output tracking).
- **Turbo `dev` should run only long-running apps:** removed `apps/cli` `dev` script (renamed to `dev:cli`) so `turbo run dev` targets server/web only.
- **Vitest should not run built outputs:** configured root `vitest.config.ts` to exclude `**/dist/**` so tests don’t run twice (TS sources + compiled JS).

## Open questions
- None at the moment. (If another slice expects `apps/cli` to have a `dev` script, use `dev:cli` going forward.)

## Commands run (high signal)
- `bun install`
- `bun run build`
- `bunx turbo run build --force` (after deleting `dist` to reproduce Turbo output warnings)
- `bun run test`

## Integration notes for orchestrator
- Touch files are limited to tooling/config only:
  - `tsconfig.base.json`
  - `apps/web/package.json`
  - `apps/cli/package.json`
  - `vitest.config.ts`
  - `docs/PLAN.md`
  - `docs/scratchpads/agent-A.md`
- Behavior changes:
  - `turbo run build` now produces `dist/**` for TS packages (no Turbo warnings).
  - `turbo run dev` no longer includes CLI; run CLI directly via `bun run --cwd apps/cli dev:cli` (or `bun run rawr`).
  - `bun run test` no longer executes `dist/test/*.js` files.

