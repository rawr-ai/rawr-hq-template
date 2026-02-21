# Phase B Acceptance Gates

## Purpose
Define deterministic verification for Phase B slice progression and phase exit.

## Cadence Contract
1. Quick suite:
   - run on every commit in active slice,
   - run on every fix commit after review findings.
2. Full suite:
   - run when slice reaches candidate-complete,
   - run after blocking/high fix sets,
   - run before independent review,
   - run at phase exit.

## As-Landed Gate Posture (through B4A on 2026-02-21)
1. Runtime slices `B0..B4A` are landed; `B5` docs/cleanup is the active closure slice.
2. Canonical B3 anti-regression is structural gate enforcement in `phase-a:gates:exit`; dedicated adapter-shim ownership test files are not present in landed branch state.

## Slice Gate Matrix

### B0
Quick:
- `bunx vitest run --project server apps/server/test/rawr.test.ts`
- `bunx vitest run --project server apps/server/test/orpc-handlers.test.ts`
- `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts`

Full:
- `bun run phase-a:gates:completion`
- `bunx vitest run --project server apps/server/test/rpc-auth-source.test.ts`

Required outcomes:
1. External/unlabeled `/rpc` denied.
2. First-party/internal `/rpc` remains valid.
3. `/api/inngest` ingress semantics unchanged.

### B1
Quick:
- `bunx vitest run --project server apps/server/test/rawr.test.ts`
- `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts`
- `bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts`

Full:
- `bun run phase-a:gates:completion`
- `bun scripts/phase-a/manifest-smoke.mjs --mode=completion`

Required outcomes:
1. Workflow route family remains scoped and functional.
2. No `/rpc/workflows` path appears.
3. No non-workflow procedure leak in trigger router.

### B2
Quick:
- `bunx vitest run --project core packages/core/test/runtime-router.test.ts`
- `bunx vitest run --project server apps/server/test/orpc-openapi.test.ts`
- `bunx vitest run --project server apps/server/test/rawr.test.ts`

Full:
- `bun run phase-a:gates:completion`
- `bun scripts/phase-a/manifest-smoke.mjs --mode=completion`

Required outcomes:
1. Manifest-first authority preserved.
2. Host consumes package seams.
3. No coupling/import-direction regression.

### B3
Quick:
- `bun scripts/phase-a/verify-harness-matrix.mjs`
- `bun run phase-a:gate:route-negative-assertions`
- `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts`

Full:
- `bun run phase-a:gates:exit`

Required outcomes:
1. Structural assertions replace brittle string-only checks for ownership-critical seams.
2. D-015 suite IDs and negative assertions remain complete.
3. Workspace/install seam ownership anti-regression checks are green through `metadata-contract` + `import-boundary` in the canonical exit chain.

## Mandatory Review + Fix Gate (B4)
1. Independent TypeScript + ORPC review runs after B3 first full-green.
2. Blocking/high findings must be fixed before exit.
3. After fixes:
   - rerun impacted quick suites,
   - rerun impacted full suites,
   - complete re-review for touched scope.

## Mandatory Structural Assessment Gate (B4A)
1. Independent structural/taste assessment runs after B4 closure.
2. Assessment lens is TypeScript + solution-design quality of landed B0..B3 implementation.
3. Blocking/high structural findings must be fixed in-run.
4. Scope guardrail: no fundamental architecture/policy shifts while addressing structural findings.
5. After structural fixes:
   - rerun impacted quick suites,
   - rerun impacted full suites,
   - complete structural re-review for touched scope.

## Phase Exit Gate
Required before declaring Phase B complete:
1. `B0..B3` accepted in order with gates green.
2. `B4` review closure complete (no unresolved blocking/high).
3. `B4A` structural assessment closure complete.
4. `B5` docs/cleanup closure complete.
5. `B6` readiness output complete.
6. `bun run phase-a:gates:exit` green on final landed branch state.
