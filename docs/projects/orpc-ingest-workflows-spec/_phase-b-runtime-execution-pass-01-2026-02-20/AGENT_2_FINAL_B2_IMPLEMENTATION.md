# Agent 2 Final Report - B2 Manifest/Host Seam Hardening

## Slice Outcome
B2 is implemented with package-owned runtime router composition seams in `@rawr/core`, host wiring updated to consume those seams, and manifest composition moved off app-internal router factories.

Route-family semantics remain unchanged:
- `/rpc`
- `/api/orpc/*`
- `/api/workflows/<capability>/*`
- `/api/inngest`

Manifest-first authority remains in `rawr.hq.ts`, and no legacy metadata keys were reintroduced.

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`

## Changes Implemented
1. Added package-owned runtime seam module:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/src/orpc/runtime-router.ts`

2. Exported seam through core ORPC entrypoint:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/src/orpc/index.ts`

3. Updated host/server ORPC wiring to consume package seam:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts`

4. Updated manifest composition to consume package seam (not app internals):
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/rawr.hq.ts`

5. Added seam-focused tests and coupling guard:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/test/runtime-router.test.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/rawr.test.ts`

6. Added required package deps for moved runtime composition logic:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/package.json`

## Minimum Impacted Validation
Commands executed:
1. `bunx vitest run --project server apps/server/test/orpc-openapi.test.ts apps/server/test/rawr.test.ts`
- Result: PASS
- Files: 2 passed
- Tests: 15 passed

2. `bunx vitest run --project core packages/core/test/runtime-router.test.ts`
- Result: PASS
- Files: 1 passed
- Tests: 2 passed

Additional command required after dependency graph change:
- `bun install`
- Result: PASS (`Saved lockfile`, dependency graph refreshed)

## Evidence Map
- New package-owned runtime seam exists and owns runtime router composition:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/src/orpc/runtime-router.ts:31`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/src/orpc/runtime-router.ts:265`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/src/orpc/runtime-router.ts:280`

- Core ORPC exports include runtime seam:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/src/orpc/index.ts:2`

- Host ORPC wiring now consumes package seam factories:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts:1`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts:23`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts:27`

- Manifest composition now imports package seam, not app-internal ORPC module:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/rawr.hq.ts:7`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/rawr.hq.ts:9`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/rawr.hq.ts:10`

- Runtime seam route-family behavior is locked by new tests:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/test/runtime-router.test.ts:29`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/test/runtime-router.test.ts:44`

- Explicit guard that manifest no longer couples to app-internal router composition:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/test/rawr.test.ts:109`

- Core package dependency additions supporting moved runtime seam:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/package.json:21`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/package.json:23`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/packages/core/package.json:24`

## Assumptions
- Keeping `/api/workflows/*` mount + capability resolution in `apps/server/src/rawr.ts` remains valid for B2, because B2 scope focuses on manifest/host seam ownership and composition coupling, not route-family redesign.
- Moving runtime router composition into `@rawr/core` without changing procedure behavior satisfies D-014 package-owned seam direction while preserving existing route semantics.
- `rawr.hq.ts` remains the single composition authority as long as it continues exporting composed manifest seams (`orpc`, `workflows`, `inngest`) and host consumes those exports.

## Risks
- `packages/core` now depends on additional runtime packages; future package-boundary tightening may require splitting runtime composition seam into a dedicated runtime package.
- Static coupling guard in `apps/server/test/rawr.test.ts` is source-string based; it is effective for current regression shape but weaker than AST/import-graph enforcement.
- Because route handlers moved across package boundaries, future refactors could accidentally drift context contract assumptions (`repoRoot`, `baseUrl`, `runtime`, `inngestClient`) unless explicitly type-guarded further.

## Unresolved Questions
- Should import-boundary verification for B3 be extended to assert `rawr.hq.ts` cannot import any `apps/server/*` module (structural gate), instead of relying on targeted test assertions?
- Should runtime-router seam stay in `@rawr/core` long-term, or be moved into a dedicated runtime package to reduce `@rawr/core` dependency surface?
