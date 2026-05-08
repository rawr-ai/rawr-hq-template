# Upstream Fallout Readiness

## Readiness Verdict

Prepared for lane-specific planning after review repair. The lane has a clear
remove/preserve split, current upstream references, and expanded test/docs
surfaces.

## Pair Packet

Mapper: Upstream Fallout Stale Surface Mapper.

Verifier: Retain/Delete Boundary Verifier.

Objective: remove upstream MFE demo and stale coordination canvas guidance while
preserving Inngest and future runtime hooks.

Allowed edit surfaces:

- `plugins/web/mfe-demo/**`
- `plugins/web/.gitkeep`
- `package.json`
- `vitest.config.ts`
- `bun.lock`
- `apps/server/test/**`
- `apps/cli/test/**`
- `apps/web/src/ui/pages/MountsPage.tsx`
- `services/hq-ops/test/ports-backed-service.test.ts`
- active docs under `docs/process/**` that advertise stale coordination
  surfaces.

Forbidden scope:

- deleting Inngest,
- deleting `/api/workflows/*`,
- redesigning future coordination,
- preserving `mfe-demo` as a package,
- mutating downstream `RAWR HQ`,
- global plugin sync/link repair.

Evidence paths:

- `package.json`
- `apps/server/package.json`
- `apps/server/src/rawr.ts`
- `apps/server/test/phase-a-gates.test.ts`
- `apps/server/test/rawr.test.ts`
- `apps/cli/test/stubs.test.ts`
- `apps/web/src/ui/pages/MountsPage.tsx`
- `plugins/web/mfe-demo/package.json`
- `plugins/web/mfe-demo/src/server.ts`
- `plugins/web/mfe-demo/test/mfe-demo.test.ts`
- `vitest.config.ts`
- `services/hq-ops/test/ports-backed-service.test.ts`
- `bun.lock`
- `docs/process/RUNBOOKS.md`
- `docs/process/HQ_USAGE.md`
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`
- `docs/process/DESIGN_INTEGRATION_GOALS.md`
- `scripts/phase-1/verify-no-live-coordination.mjs`

Required output: lane-specific implementation plan or code changes, depending
on future user instruction.

Required gates:

- targeted `rg` stale-reference checks,
- separate targeted MFE removal checks,
- separate coordination cleanup checks,
- separate Inngest/runtime preservation checks,
- `bun run phase-1:gate:no-live-coordination`,
- server/CLI/web tests touched by fixture replacement.

Lane done condition: upstream no longer exposes or advertises MFE demo or
coordination canvas operations; Inngest runtime surfaces remain; `plugins/web`
stays tracked with `.gitkeep`.

DRA decision point: approve a test-local web plugin fixture strategy before
removing tests that currently use `mfe-demo`; do not preserve `mfe-demo` as the
fixture.

## Execution Position

Run this first. It is the baseline cleanup lane that reduces later package,
test, and docs conflicts for DevOps and other upstream work.

This lane is upstream-only. Do not touch downstream `RAWR HQ`; downstream
cleanup/sunset remains a final end-phase after upstream authority is complete.

## First Reads

- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/lanes/upstream-fallout/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/upstream-fallout/SPEC.md`
- `docs/projects/workstream-b-preparation/lanes/upstream-fallout/ROUGH_PLAN.md`
- evidence paths listed above.

## First Commands

```bash
git status --short --branch
gt ls
bunx nx show projects
find plugins/web -maxdepth 3 -type f | sort
find plugins/web -maxdepth 1 -type f -name '.gitkeep' -print
rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json apps plugins/web docs/process -g '!**/dist/**' -g '!**/.turbo/**'
rg -n "/coordination|/rpc/coordination|workflow coord|COORDINATION_CANVAS_OPERATIONS|coordination canvas" docs apps packages plugins -g '!**/quarantine/**' -g '!docs/_archive/**' -g '!docs/projects/_archive/**'
rg -n "api/inngest|dev:workflows|dev:inngest|/api/workflows" package.json apps/server docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md
```

## Ready-To-Plan Checklist

- [x] MFE demo package and references captured.
- [x] Root project-list references captured.
- [x] Tests using `mfe-demo` captured.
- [x] Vitest config, hq-ops fixture test, and lockfile references captured.
- [x] Active coordination docs captured.
- [x] Inngest preservation surfaces captured.
- [x] Coordination cleanup checks split from Inngest preservation checks.
- [x] `.gitkeep` requirement captured.
- [x] No future coordination redesign required.

## Pause Conditions

Pause and ask the DRA before continuing if:

- a proposed cleanup would remove `/api/inngest`, `dev:inngest`,
  `dev:workflows`, or future runtime hooks,
- replacing `mfe-demo` tests would require preserving `mfe-demo` as the fixture,
- active docs cannot be cleaned without deciding future coordination
  architecture,
- the lane would mutate downstream `RAWR HQ`, or
- code/docs slated for deletion carry important lessons that have not been
  preserved in `LESSONS.md` or a lane-local lesson artifact.

## Deferred Risks

- Future implementation must choose a small replacement strategy for web plugin
  tests.
- Active docs may contain additional coordination wording outside the first
  discovered list; future `rg` checks must be treated as acceptance gates.

## DRA Acceptance

Accepted after review repair.

## Review Repair Addendum

- Accepted findings: `F-05-01`, `F-05-02`.
- Future implementation must preserve lessons from retired coordination/MFE
  material in `LESSONS.md` or a lane-local lesson artifact before deletion.
