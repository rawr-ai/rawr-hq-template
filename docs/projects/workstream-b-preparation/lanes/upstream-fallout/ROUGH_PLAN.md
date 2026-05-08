# Upstream Fallout Rough Plan

## Implementation Slices

1. MFE demo package removal:
   - Remove `plugins/web/mfe-demo/**`.
   - Create or keep `plugins/web/.gitkeep`.
   - Remove `@rawr/plugin-mfe-demo` from root project lists and package
     references.
   - Remove `@rawr/plugin-mfe-demo` from `vitest.config.ts`.
   - Update `bun.lock` after package removal.

2. Test fixture replacement:
   - Replace `mfe-demo` usage in server route tests.
   - Replace `mfe-demo` usage in CLI web plugin tests.
   - Replace `mfe-demo` usage in `services/hq-ops` tests.
   - Replace web UI empty-state hint.
   - Keep runtime web plugin behavior tested with a test-local web plugin
     fixture, not by retaining the demo package.

3. Coordination docs cleanup:
   - Remove active runbook routing to `COORDINATION_CANVAS_OPERATIONS.md`.
   - Delete, archive, or replace the coordination canvas operations runbook with
     a retired-surface note.
   - Update `HQ_USAGE.md`, `HQ_RUNTIME_OPERATIONS.md`, and design-integration
     docs that still advertise `/coordination`, `/rpc/coordination/*`, or
     `rawr workflow coord ...`.
   - Clean `docs/process/DESIGN_DATA_INTEGRATION_PLAN.md` if it still carries
     active coordination planning claims.
   - Remove or rewrite stale `--open coordination` guidance; current modes are
     `none`, `app`, `app+inngest`, and `all`.

4. Inngest preservation pass:
   - Verify `dev:workflows`, `dev:inngest`, `/api/inngest`, and related tests
     remain.
   - Separate any Inngest mention that is valid runtime ingress from stale
     coordination canvas guidance.

5. Stale-reference checks:
   - Run targeted `rg` checks for MFE demo and coordination surfaces.
   - Record any intentional archive/provenance matches.
   - Run Inngest/runtime preservation checks separately from coordination
     cleanup checks.

## Likely Touch Surfaces

- `plugins/web/mfe-demo/**`
- `plugins/web/.gitkeep`
- `package.json`
- `vitest.config.ts`
- `bun.lock`
- `apps/server/test/rawr.test.ts`
- `apps/cli/test/stubs.test.ts`
- `apps/web/src/ui/pages/MountsPage.tsx`
- `services/hq-ops/test/ports-backed-service.test.ts`
- `docs/process/RUNBOOKS.md`
- `docs/process/HQ_USAGE.md`
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`
- `docs/process/DESIGN_INTEGRATION_GOALS.md`
- `docs/process/DESIGN_DATA_INTEGRATION_PLAN.md`

## Validation

```bash
git status --short --branch
gt ls
bunx nx show projects
rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json apps plugins/web docs/process -g '!**/dist/**' -g '!**/.turbo/**'
rg -n "@rawr/plugin-mfe-demo|mfe-demo" vitest.config.ts services/hq-ops/test bun.lock
rg -n "/coordination|/rpc/coordination|workflow coord|COORDINATION_CANVAS_OPERATIONS|coordination canvas" docs apps packages plugins -g '!**/quarantine/**' -g '!docs/_archive/**' -g '!docs/projects/_archive/**'
rg -n "api/inngest|dev:workflows|dev:inngest|/api/workflows" package.json apps/server docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md
bun run phase-1:gate:no-live-coordination
bunx nx run @rawr/server:test
bunx nx run @rawr/cli:test
bunx nx run @rawr/web:test
```

## Sequencing Notes

Run this first. It removes upstream demo/coordination noise that would otherwise
raise package, lockfile, test, and docs conflicts for later lanes.

Remove MFE demo and update package lists, Vitest config, and lockfile before
running tests. Replace tests in the same branch so runtime web plugin behavior
remains covered.

Clean active coordination docs separately from Inngest preservation. A simple
rule is enough: coordination canvas references go away; Inngest runtime ingress
stays.

This lane is upstream-only. Do not mutate downstream `RAWR HQ`; downstream
sunset remains a final end-phase.

## Stop Conditions

- Test fixture replacement would require inventing a new example plugin package
  as large as `mfe-demo`.
- Active docs cannot be cleaned without deciding future coordination
  architecture.
- A proposed cleanup touches `/api/inngest`, `dev:inngest`, or `dev:workflows`
  as deletion targets.

## DRA Disposition

Accepted after review repair. The rough plan is prepared for future
implementation work and separates MFE removal, fixture replacement,
coordination cleanup, and Inngest preservation.
