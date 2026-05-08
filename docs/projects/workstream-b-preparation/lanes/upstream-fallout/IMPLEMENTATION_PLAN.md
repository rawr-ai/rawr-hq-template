# Upstream Fallout Implementation Plan

Status: `implemented-reviewed`.
DRA: `Codex`.
Branch: `agent-upstream-fallout-workstream-b-baseline-cleanup`.
Record: `docs/projects/workstream-b-preparation/lanes/upstream-fallout/WORKSTREAM_RECORD.md`.

## Objective

Clean the upstream baseline by removing the retired MFE demo and stale
coordination canvas guidance while preserving Inngest/runtime hooks and useful
test coverage.

## Authority And Boundary

Authority order:

1. Current user decisions in this workstream.
2. Current upstream `RAWR HQ-Template` code.
3. Current downstream `RAWR HQ` code only as evidence when needed.
4. Accepted `REVIEW_LEDGER.md` findings, only where grounded in current files.
5. Prior session findings only when revalidated against current files.
6. Old docs only as stale/evidence inputs unless explicitly accepted again.

`AUTHORITY_MAP.md` defines the locked target decisions and this ordering.

In scope:

- Upstream package/docs/test cleanup for `mfe-demo`.
- Active docs cleanup for coordination canvas operations.
- Test fixture replacement.
- Lockfile/project-list updates.
- Preservation checks for Inngest/runtime hooks.

Out of scope:

- Downstream `RAWR HQ` mutation.
- Downstream sunset.
- Global plugin sync/link repair.
- Future coordination redesign.
- Inngest/runtime removal.

## Solution Shape

This is a cleanup-and-preservation plan, not a new platform design.

The plan removes stale upstream authority in three coordinated slices:

1. Delete the package and project references that make `mfe-demo` active.
2. Replace test reliance on `mfe-demo` with neutral fixtures that prove the same
   platform behaviors.
3. Remove or retire active coordination canvas guidance while separately
   verifying Inngest/runtime hooks remain.

## Implementation Slices

### Slice 1: Remove active MFE project authority

Expected changes:

- Delete `plugins/web/mfe-demo/**`.
- Add `plugins/web/.gitkeep`.
- Remove `@rawr/plugin-mfe-demo` from root build/typecheck/pretest project
  lists in `package.json`.
- Remove the `plugins/web/mfe-demo` Vitest project from `vitest.config.ts`.
- Update `bun.lock` after workspace removal.

Acceptance evidence:

- `bunx nx show projects` no longer lists `@rawr/plugin-mfe-demo`.
- `rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json vitest.config.ts bun.lock plugins/web`
  has no active matches except intentional lane artifacts.
- `plugins/web/.gitkeep` exists.

### Slice 2: Replace test and UI fixture references

Expected changes:

- In `apps/server/test/rawr.test.ts`, rename the temporary web plugin fixture
  away from `mfe-demo`; keep disabled/enabled web module serving coverage.
- In `apps/cli/test/stubs.test.ts`, use a retained neutral web plugin fixture
  for `plugins web list`, `enable`, `disable`, and `status` behavior.
- In `services/hq-ops/test/ports-backed-service.test.ts`, replace
  `@rawr/plugin-mfe-demo` with a neutral test plugin id; keep security gate
  coverage.
- In `apps/web/src/ui/pages/MountsPage.tsx`, remove the `mfe-demo` enable hint
  and replace it with non-demo guidance.

Fixture strategy:

- Use test-local temp fixtures for server tests where the test already supports
  them.
- For CLI tests, stop depending on the real repo `plugins/web` inventory. Run
  the CLI against a temporary workspace containing a minimal web plugin fixture
  plus the toolkit fixture needed for kind-mismatch coverage.
- Do not preserve or recreate `mfe-demo` as the replacement fixture.

Lesson preservation:

- Preserve the lesson that hq-ops security/resource-backed tests are
  plugin-id-agnostic.
- Preserve server temp web fixture coverage.
- Preserve CLI web plugin kind/state behavior.
- Decide whether route-hint/mount-lifecycle coverage carries a reusable lesson;
  if not preserved elsewhere, record a lane-local lesson before deletion or
  preserve minimal coverage in a neutral fixture.

Acceptance evidence:

- Targeted server/CLI/hq-ops tests pass.
- Active test files no longer reference `mfe-demo`.
- Any lost package-level coverage is either intentionally retired with lesson
  capture or preserved via neutral fixture coverage.

### Slice 3: Clean active coordination canvas guidance

Expected changes:

- Remove active routing to `COORDINATION_CANVAS_OPERATIONS.md` from
  `docs/process/RUNBOOKS.md`, `HQ_USAGE.md`, and runtime runbooks.
- Delete, archive, or replace `COORDINATION_CANVAS_OPERATIONS.md` with a short
  retired-surface note, depending on which option preserves useful lessons
  without leaving it as active guidance.
- Rewrite `HQ_RUNTIME_OPERATIONS.md` so supported app opening modes and runtime
  routes do not advertise `/coordination`.
- Clean or retire `DESIGN_INTEGRATION_GOALS.md` and
  `DESIGN_DATA_INTEGRATION_PLAN.md` if they still present coordination canvas as
  an active future.
- Update `scripts/runtime/verify-hq-lifecycle.mjs` so the lifecycle gate no
  longer requires the retired coordination runbook and instead validates current
  runtime/Inngest guidance.
- Add a lane-owned active fallout verifier so closure does not rely on stale
  proxy gates.

Acceptance evidence:

- Active docs no longer route users to `/coordination`,
  `/rpc/coordination/*`, or `rawr workflow coord ...`.
- Active scripts no longer require or advertise the retired coordination canvas
  runbook.
- Archive/provenance matches, if any, are explicitly allowed.
- Lane-owned active fallout gate passes.

### Slice 4: Preserve Inngest/runtime hooks

Expected checks:

- `package.json` keeps `dev:workflows` and `dev:inngest`.
- `apps/server/package.json` keeps server `dev:inngest`.
- `apps/server/src/rawr.ts` keeps `/api/inngest` and `/api/workflows/*`.
- Inngest ingress and route boundary tests continue to pass.

Acceptance evidence:

- Separate `rg` preservation check for `api/inngest`, `dev:workflows`,
  `dev:inngest`, and `/api/workflows`.
- Targeted server tests around Inngest still pass:
  `rawr.test.ts`, `phase-a-gates.test.ts`,
  `route-boundary-matrix.test.ts`, and
  `ingress-signature-observability.test.ts`.

## Graphite Handling

- Commit only this branch's scoped diff.
- Avoid `gt submit --stack`, broad restacks, and parent changes unless the DRA
  explicitly decides this lane should move sibling Workstream B branches.
- Record final `gt ls` and `git status --short --branch`.

## Review Plan

Plan review lanes:

- MFE/fixture review: active references, replacement strategy, test coverage,
  and lesson obligations.
- Coordination/Inngest review: stale docs classification, preservation boundary,
  and acceptance gates.
- Red-team review: look for hidden scope creep, downstream mutation, accidental
  Inngest removal, or false proof claims.

Implementation review lanes:

- Stale-reference audit.
- Test/coverage audit.
- Docs authority audit.
- Proof-ledger/closure audit.

The DRA owns all dispositions. Accepted P1/P2 findings block closure until
repaired or consciously waived.

## Required Gates

Pre/post state:

```bash
git status --short --branch
gt ls
bunx nx show projects
```

MFE stale-reference checks:

```bash
rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json apps plugins/web docs/process -g '!**/dist/**' -g '!**/.turbo/**'
rg -n "@rawr/plugin-mfe-demo|mfe-demo" vitest.config.ts services/hq-ops/test bun.lock
```

Coordination cleanup check:

```bash
rg -n "/coordination|/rpc/coordination|rawr workflow coord|COORDINATION_CANVAS_OPERATIONS|coordination canvas|\\.rawr/coordination" docs/process scripts/runtime -g '!**/quarantine/**'
```

Scope note:

- The active cleanup boundary for retired coordination canvas guidance is
  `docs/process/**` plus `scripts/runtime/**`.
- Old phase/structural verification scripts may still contain coordination
  strings as historical or migration-check residue. They are out of this lane's
  active guidance boundary and are recorded in `WORKSTREAM_RECORD.md` as
  deferred inventory.

Runtime preservation check:

```bash
rg -n "api/inngest|dev:workflows|dev:inngest|/api/workflows" package.json apps/server docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md
```

Functional gates:

```bash
bun run upstream-fallout:gate
bun run runtime:gate:hq-lifecycle
bunx nx run-many -t typecheck --projects=@rawr/server,@rawr/cli,@rawr/web,@rawr/hq-ops
bunx nx run @rawr/server:test
bunx nx run @rawr/cli:test
bunx nx run @rawr/web:test
bunx nx run @rawr/hq-ops:test
```

If time or environment prevents a full gate, record skipped-check rationale and
run the narrowest covering target available. Do not claim closure from proxy
checks alone. In particular, `phase-1:gate:no-live-coordination` is historical
proxy evidence only for this lane because it currently fails before checking
this lane when the old Phase 1 ledger is absent, and it does not scan the active
docs/runtime-script surfaces cleaned here. The old `runtime:gate:hq-lifecycle`
was also not sufficient until repaired; only post-repair lifecycle results
count.

## Stop Conditions

Pause before continuing if:

- A proposed change removes Inngest/runtime hooks.
- A test cannot remain meaningful without keeping `mfe-demo`.
- Docs cleanup requires deciding future coordination architecture.
- Downstream mutation appears necessary.
- Deleting material would lose a concrete lesson that has not been preserved.

## Done Condition

The lane is done when:

- `mfe-demo` is not an active package, project, fixture, UI hint, or lockfile
  entry.
- Active coordination canvas guidance is removed or retired from active docs.
- Inngest/runtime hooks remain and are verified separately.
- Replacement fixtures preserve the platform behaviors the old demo references
  were proving.
- Review findings are dispositioned and repaired/waived/deferred.
- Repo and Graphite state are recorded cleanly.
