# Upstream Fallout Discovery

## Frame

This lane prepares implementation planning for upstream mismatches left after
Workstream A cleaned downstream.

Upstream will become sole authority and must stop advertising removed
coordination surfaces. Coordination canvas is removed; upstream docs should
change accordingly.

Inngest stays. Do not remove `/api/inngest`, `dev:inngest`, `dev:workflows`, or
future async/runtime architecture hooks just because old coordination docs
referenced them.

`plugins/web/mfe-demo` can be removed upstream. `plugins/web/.gitkeep` must
remain or be created when the directory would otherwise be empty.

## Current Upstream State

MFE demo is active upstream:

- `plugins/web/mfe-demo/package.json:2` names `@rawr/plugin-mfe-demo`.
- `plugins/web/mfe-demo/package.json:37-40` defines build, typecheck, and test
  scripts.
- `plugins/web/mfe-demo/package.json:42-45` marks `rawr.kind = web` and
  `rawr.capability = mfe-demo`.
- `plugins/web/mfe-demo/src/server.ts:1-23` registers `/mfe-demo/health` and
  `/mfe-demo/status`.
- `plugins/web/mfe-demo/test/mfe-demo.test.ts:5-30` tests the demo routes.
- `package.json:25`, `package.json:45`, and `package.json:47` include
  `@rawr/plugin-mfe-demo` in root build/typecheck/pretest project lists.
- `vitest.config.ts` includes the MFE demo project in the Vitest project list
  and must be updated when the package is removed.
- `services/hq-ops/test/ports-backed-service.test.ts` references the MFE demo
  web plugin as a fixture and must move to a test-local web plugin fixture.
- `bun.lock` contains `@rawr/plugin-mfe-demo` package/dependency state and must
  be updated by the future implementation after package removal.
- `apps/server/test/rawr.test.ts:55-69` uses `mfe-demo` as the web plugin
  fixture for route serving tests.
- `apps/cli/test/stubs.test.ts:69-97` enables/disables `mfe-demo` in web plugin
  command tests.
- `apps/web/src/ui/pages/MountsPage.tsx:140` tells users to try
  `rawr plugins web enable mfe-demo --risk off`.

`plugins/web/.gitkeep` is not currently present. Future removal must create or
keep it so `plugins/web` remains tracked after `mfe-demo` removal.

Active docs still advertise removed coordination canvas surfaces:

- `docs/process/RUNBOOKS.md:20` links to
  `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`.
- `docs/process/HQ_USAGE.md:10` routes users to coordination-only workflow
  checks.
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md:1-81` advertises
  `/coordination`, `/rpc/coordination/*`, `rawr workflow coord ...`, workflow
  round trips, and coordination storage.
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md:68` includes
  `--open coordination`.
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md:110-123` describes the
  coordination route inside the shell.
- `docs/process/DESIGN_INTEGRATION_GOALS.md:1-21` frames a long-term
  coordination canvas design integration model.
- `docs/process/DESIGN_DATA_INTEGRATION_PLAN.md` contains active coordination
  design wording and should be cleaned or retired as stale coordination
  planning material.
- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md` also needs a mode check:
  `--open coordination` is stale because current app opening modes are
  `none`, `app`, `app+inngest`, and `all`.

Upstream already has a no-live-coordination gate:

- `scripts/phase-1/verify-no-live-coordination.mjs:5-17` asserts historical
  coordination roots are archived and not live.
- `scripts/phase-1/verify-no-live-coordination.mjs:19-27` preserves archived
  lessons only.

Inngest is active and must be preserved:

- `package.json:23-24` defines `dev:workflows` and `dev:inngest`.
- `apps/server/package.json:31` defines server `dev:inngest` against
  `http://localhost:3000/api/inngest`.
- `apps/server/src/rawr.ts:25` names mount order including `/api/inngest`.
- `apps/server/src/rawr.ts:197-206` creates Inngest functions and handler.
- `apps/server/src/rawr.ts:274-301` mounts `/api/inngest` with ingress
  signature checks.
- `apps/server/test/phase-a-gates.test.ts:38-47` expects `/api/inngest` and
  asserts old coordination workflow plugin import is absent.
- `apps/server/test/rawr.test.ts:72-90` tests Inngest ingress rejection behavior.

## Current Downstream State

Downstream Workstream A removed abandoned/superseded surfaces and preserved
migration-sensitive surfaces. Downstream commit evidence:

- `408f9d69 chore(cleanup): remove retired downstream surfaces (#150)`

The upstream fallout lane exists because upstream can reintroduce stale MFE demo
and coordination guidance unless upstream is cleaned or accepted as deliberate
divergence. The user clarified that upstream should become sole authority, so
this should be cleaned upstream.

## Evidence

Commands used:

```bash
rg -n "mfe-demo|coordination|/coordination|/rpc/coordination|workflow coord|api/inngest|dev:workflows|dev:inngest|inngest" package.json apps/server docs plugins/web -g '!**/dist/**'
find plugins/web -maxdepth 3 -type f | sort
find plugins/web -maxdepth 1 -type f -name '.gitkeep' -print
rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json apps plugins/web docs/process -g '!**/dist/**' -g '!**/.turbo/**'
rg -n "@rawr/plugin-mfe-demo|mfe-demo" vitest.config.ts services/hq-ops/test bun.lock
```

## Mismatches

1. Downstream cleanup removed abandoned surfaces, while upstream still has an
   active MFE demo project and references.
2. Active upstream docs still advertise coordination canvas surfaces even though
   coordination has been removed.
3. Active upstream runtime/Inngest surfaces are valid and must not be removed
   just because some stale coordination docs mention Inngest.
4. `plugins/web/.gitkeep` is currently absent, so removing `plugins/web/mfe-demo`
   without creating it would leave the directory untracked.

## Risks

- A future cleanup agent may over-delete Inngest while removing stale
  coordination docs.
- MFE demo removal will require replacing tests/fixtures that currently use
  `mfe-demo` as the only web plugin example.
- Root scripts will fail if `@rawr/plugin-mfe-demo` remains listed after the
  project is removed.
- Vitest project config, service fixtures, and lockfile state can keep the
  removed plugin effectively alive even after the directory is deleted.
- Web/CLI user-facing hints may still recommend a deleted plugin unless updated.

## Unknowns

- The future web plugin test fixture replacement should be chosen during
  implementation. It can be a temp fixture in tests or another retained web
  fixture, but it should not preserve or recreate `mfe-demo`.
- The exact docs replacement for coordination runbooks should be minimal:
  remove or redirect stale coordination guidance; do not design the future
  workflow coordination system.

## DRA Disposition

Accepted after review repair. The lane is prepared for lane-specific planning
with a clear remove/preserve split: remove MFE demo and stale coordination
claims; preserve Inngest/runtime architecture hooks.

## Review Repair Addendum

- `F-05-01` accepted: MFE removal evidence includes `vitest.config.ts`,
  `services/hq-ops/test/ports-backed-service.test.ts`, and `bun.lock`.
- `F-05-02` accepted: coordination cleanup checks must be split from
  Inngest/runtime preservation checks.
- Future implementation must use a test-local web plugin fixture, not preserve
  `mfe-demo` as fixture architecture.
