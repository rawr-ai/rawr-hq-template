# Upstream Fallout Implementation Workstream Record

Status: `implemented-pending-final-commit`.
Branch: `agent-upstream-fallout-workstream-b-baseline-cleanup`.
PR: `none`.
Commit: `see git history`.
DRA: `Codex`.
Dates: `2026-05-08 -> active`.

This record preserves state and handoff context for the bounded upstream-fallout
lane. It is not architecture authority, sequence authority for other lanes, or
a replacement for the lane packet.

## Workstream State

Workstream record path:

- `docs/projects/workstream-b-preparation/lanes/upstream-fallout/WORKSTREAM_RECORD.md`

Status:

- Active.

DRA:

- Codex in this lane worktree.

Branch/stack:

- Branch: `agent-upstream-fallout-workstream-b-baseline-cleanup`.
- Parent: `codex/workstream-b-preparation`.
- Trunk: `main`.
- Stack note: other Workstream B lane branches may be metadata siblings at the
  same starting commit. This lane must avoid broad `gt submit --stack`, global
  restack, or parent changes unless explicitly approved.

Current phase:

- Implementation complete; final verification and commit pending.

Selected skills:

- `solution-design`
- `team-design`
- `workstream-runner`
- `workstream-review-loops`

Selected agents:

- `Peirce`: read-only MFE demo removal and fixture replacement mapper.
- `Wegener`: read-only coordination docs and Inngest preservation mapper.
- `Hubble`: read-only plan review.
- `Tesla`: read-only plan red-team.
- `Anscombe`: docs/runtime implementation worker.
- `Boole`: read-only implementation review.
- `Carson`: read-only proof/acceptance audit.

Selected hooks:

- None.

## Frame

Objective:

- Remove upstream `mfe-demo` and stale coordination canvas guidance while
  preserving Inngest/runtime hooks and useful test/lesson coverage.

Containment boundary:

- Upstream `RAWR HQ-Template` only.
- Lane-local workstream artifacts plus code/docs/tests required by
  upstream-fallout.

Primitive boundary:

- This is one implementation workstream for one Workstream B lane. It is not
  the full Workstream B program, not downstream sunset, and not future
  coordination architecture.

Non-goals:

- Do not mutate downstream `RAWR HQ`.
- Do not run global plugin sync or link repair.
- Do not redesign future coordination.
- Do not remove Inngest, `/api/inngest`, `/api/workflows/*`,
  `dev:inngest`, or `dev:workflows`.
- Do not preserve `mfe-demo` as a package or fixture.

Done means:

- Upstream no longer exposes or advertises `plugins/web/mfe-demo`,
  `@rawr/plugin-mfe-demo`, `mfe-demo` user-facing hints, or active
  coordination canvas operations.
- Inngest/runtime hooks remain present and tested.
- `plugins/web/.gitkeep` exists.
- Replacement tests preserve web plugin serving, CLI web plugin kind/state
  behavior, and hq-ops resource-backed security gate coverage.
- Accepted review findings are repaired or consciously waived.
- Required gates and final stale-reference checks are recorded.

## Opening Packet

Opening input:

- User request to run this lane end-to-end as DRA using a long-running
  workstream with artifacts, agents, review, red-team, development, iteration,
  and completion audit.

Authority inputs:

- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/lanes/upstream-fallout/*`
- Current upstream code in this worktree.

Authority order:

1. Current user decisions in this workstream.
2. Current upstream `RAWR HQ-Template` code.
3. Current downstream `RAWR HQ` code only as evidence when needed.
4. Accepted findings in `REVIEW_LEDGER.md`, only where grounded in current
   files.
5. Prior session findings only when revalidated against current files.
6. Old docs only as stale/evidence inputs unless explicitly accepted again.

Lane-local note:

- `AUTHORITY_MAP.md` defines this order and the locked target decisions; it is
  the routing map, not a substitute for checking current code.

Coordination inputs:

- Graphite stack state.
- DRA/team-design constraint that agents produce evidence and DRA owns
  synthesis, disposition, proof claims, repo state, and closure.

Evidence inputs:

- Active `mfe-demo` references in root scripts, Nx/Vitest config, tests,
  web UI hint, plugin package, and lockfile.
- Active coordination canvas guidance in `docs/process/**`.
- Inngest/runtime references in root/server scripts, server routes, and tests.

Excluded or stale inputs:

- Active coordination canvas docs are stale unless rewritten as retired-surface
  provenance.
- Quarantined and archived docs are provenance only.
- Downstream duplicate removal is excluded until downstream sunset.

Control inputs:

- Graphite required; trunk `main`.
- Keep worktree clean at handoff.
- Preserve concrete deletion-derived lessons before removal.

Stop/escalation conditions:

- A cleanup would remove Inngest/runtime hooks.
- Replacing tests would require keeping `mfe-demo` as a package or fixture.
- Active docs cannot be cleaned without deciding future coordination
  architecture.
- Downstream mutation becomes necessary.
- Deletion would lose a concrete reusable lesson not yet recorded.

## Output Contract

Required outputs:

- `IMPLEMENTATION_PLAN.md` plan artifact.
- Reviewed/red-teamed plan findings and DRA dispositions.
- Code/docs/test changes for upstream-fallout.
- Review findings/dispositions after implementation.
- Verification evidence and completion audit.

Optional outputs:

- Lane-local lesson addendum if deleted material carries reusable lessons not
  already captured in `LESSONS.md`.

Claim strength / evidence class:

- Implementation claims require current file state plus targeted tests/gates.
- Stale-reference absence requires `rg` gates, not visual inspection.

Surfaces touched:

- Lane-specific files listed in `READINESS.md` and `ROUGH_PLAN.md`.

Expected gates:

- Targeted MFE stale-reference checks.
- Targeted coordination stale-reference checks.
- Inngest/runtime preservation checks.
- `bun run upstream-fallout:gate`.
- `bun run phase-1:gate:no-live-coordination` is historical proxy evidence
  only for this lane; it is not closure evidence because it currently fails
  before checking this lane when the historical Phase 1 ledger path is absent.
- Touched server/CLI/web/hq-ops tests.
- `git status --short --branch`.
- `gt ls`.

## Workflow

Preflight:

- Branch/worktree/status inspected.
- `bun install` completed in the lane worktree; no tracked changes resulted.
- `bunx nx show projects` completed before implementation and listed
  `@rawr/plugin-mfe-demo`.

Investigation lanes:

- MFE demo removal and fixture replacement mapper.
- Coordination docs cleanup and Inngest preservation mapper.

Phase teams:

- Discovery mappers first.
- Plan review/red-team second.
- Implementation third.
- Post-implementation review/red-team fourth.

Design lock:

- Delete `mfe-demo` as an upstream package.
- Replace package-dependent tests with neutral test-local fixtures.
- Remove active coordination canvas guidance.
- Preserve Inngest/runtime hooks.

Agent packets:

- See selected agents above and subagent final reports in chat transcript.

Wave packets:

- N/A so far.

Scratch policy:

- Durable artifacts live in this lane directory.
- Do not rely on transcript-only decisions for closure.

## Findings

### Discovery Finding D-01: CLI web tests need a temp workspace fixture

Finding:

- `plugins/web/mfe-demo` is currently the only real workspace web plugin, and
  `apps/cli/test/stubs.test.ts` depends on real workspace discovery for web
  plugin list/enable/status behavior.

Evidence:

- `Peirce` read-only report.
- `apps/cli/test/stubs.test.ts`.
- `find plugins/web -maxdepth 3 -type f`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand:

- Replace CLI test dependence on the real repo web plugin with a neutral temp
  workspace fixture or another retained intentional web fixture. Do not keep
  `mfe-demo` for CLI test coverage.

Next Packet consequence:

- Future agents should not treat absence of `plugins/web/*` packages as loss of
  CLI web behavior coverage if temp fixture tests exist.

### Discovery Finding D-02: Lifecycle gate references stale coordination runbook

Finding:

- `scripts/runtime/verify-hq-lifecycle.mjs` currently expects the retired
  coordination runbook/delegation text, so deleting or archiving the runbook
  without updating the gate would leave runtime lifecycle verification stale.

Evidence:

- `Wegener` read-only report.
- `scripts/runtime/verify-hq-lifecycle.mjs`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.86`

Repair demand:

- Update the lifecycle verifier together with docs cleanup so it validates the
  current runtime/Inngest guidance rather than the retired coordination canvas
  runbook.

Next Packet consequence:

- Runtime lifecycle gate must be included in validation for this lane.

### Review Finding R-01: Existing runtime lifecycle gate is false proof for coordination cleanup

Finding:

- `runtime:gate:hq-lifecycle` currently requires the stale coordination canvas
  runbook and asserts delegation text, so passing it before repair is not proof
  that active coordination guidance is gone.

Evidence:

- Red-team review.
- `scripts/runtime/verify-hq-lifecycle.mjs`.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.93`

Repair demand:

- Invert the gate: remove the coordination runbook existence/read requirement
  and add negative assertions for active coordination canvas routes, commands,
  and runbook routing in active runtime docs.

Next Packet consequence:

- Treat pre-repair lifecycle gate results as non-evidence for coordination
  cleanup.

### Review Finding R-02: Phase-1 no-live-coordination gate does not cover this lane

Finding:

- `phase-1:gate:no-live-coordination` is not sufficient acceptance proof for
  this lane because it primarily checks archived service/plugin roots and
  archive lessons, not active docs/scripts that advertise coordination canvas
  operations.

Evidence:

- Red-team review.
- `scripts/phase-1/verify-no-live-coordination.mjs`.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.88`

Repair demand:

- Add a lane-owned active fallout gate that scans active docs/scripts for stale
  `mfe-demo` and coordination canvas surfaces while separately requiring
  Inngest/runtime preservation strings.

Next Packet consequence:

- Closure should rely on the lane-owned active fallout gate plus targeted tests,
  not on `phase-1:gate:no-live-coordination` alone.

### Review Finding R-03: Plan needed stronger typecheck/project-list proof

Finding:

- Targeted tests alone do not prove edits to root project lists,
  `vitest.config.ts`, and lockfile state.

Evidence:

- Plan review.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.83`

Repair demand:

- Add touched-project typecheck and project-list/Nx checks to validation.

Next Packet consequence:

- Future validation should include typecheck coverage or explicit skipped-check
  rationale.

### Review Finding R-04: Route-hint and mount-lifecycle coverage needs explicit disposition

Finding:

- Deleting `plugins/web/mfe-demo/test/mfe-demo.test.ts` could remove the only
  route-hint and `MountContext` lifecycle assertions.

Evidence:

- Red-team review.
- `LESSONS.md` upstream-fallout section.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.8`

Repair demand:

- Before deletion, either move minimal route-hint/mount-lifecycle coverage into
  a neutral fixture or record why those behaviors are no longer platform
  requirements.

Next Packet consequence:

- Closure must state the route-hint/mount-lifecycle disposition.

Disposition detail:

- Mount lifecycle coverage moved to a neutral web contract test at
  `apps/web/test/mount-contract.test.ts`.
- Demo route hints are retired as plugin-specific guidance because there is no
  longer an active demo-owned status endpoint. The retained platform behavior is
  web plugin module serving plus mount/unmount contract coverage.

### Implementation Review Finding I-01: Workstream record must match implemented state

Finding:

- Both implementation review and proof audit found the record stale after code
  changes because it still said implementation had not started.

Evidence:

- `Boole` read-only implementation review.
- `Carson` read-only proof/acceptance audit.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand:

- Update the outcome, evidence, verification, and review sections before
  commit.

Next Packet consequence:

- Do not use transcript-only status for this lane; use this record plus git
  history.

### Implementation Review Finding I-02: Phase-1 no-live-coordination gate is non-covering legacy evidence

Finding:

- `bun run phase-1:gate:no-live-coordination` is listed in early lane
  readiness, but currently fails before checking this lane because a historical
  Phase 1 ledger file is absent. The script also checks archived service/plugin
  roots rather than the active docs/runtime-script surfaces this lane cleaned.

Evidence:

- `Tesla` red-team review.
- `Carson` proof/acceptance audit.
- Failed local gate run: missing
  `docs/projects/rawr-final-architecture-migration/.context/M1-execution/phase-1-ledger.md`.

Severity: `P1`

Disposition: `accepted-with-superseding-gate`

Confidence: `0.9`

Repair demand:

- Treat this gate as non-covering historical proxy evidence for this lane.
  Closure relies on `upstream-fallout:gate`, active stale-reference checks,
  lifecycle gate repair, and touched-project tests.

Next Packet consequence:

- Future agents should not block this lane on that historical Phase 1 gate
  unless they also repair its missing ledger dependency and expand its active
  docs coverage.

### Implementation Review Finding I-03: Broad coordination grep over all scripts is overinclusive

Finding:

- A broad grep across all `scripts apps packages plugins` still finds old
  phase/structural verification scripts. Those scripts are not active process
  guidance or runtime lifecycle guidance, but the original broad command made
  that distinction unclear.

Evidence:

- `Carson` proof/acceptance audit.
- Local grep found phase verification scripts such as
  `scripts/phase-03/verify-coordination-structural.mjs`.

Severity: `P2`

Disposition: `accepted-with-scope-classification`

Confidence: `0.86`

Repair demand:

- Define the active coordination cleanup acceptance boundary as
  `docs/process/**` plus `scripts/runtime/**`; classify phase/structural
  verification scripts as out-of-scope historical or migration verification
  residue for this lane.

Next Packet consequence:

- Later lanes may decide whether old phase verification scripts should be
  retired globally. This lane should not mutate them while cleaning active
  process/runtime guidance.

## Outcome Record

Objective outcome: `achieved pending commit`.

Residual objective gaps:

- No code/runtime blockers remain.
- Final verification must be rerun after record/plan edits.
- Commit must be created on the lane branch.

Implementation summary:

- Deleted `plugins/web/mfe-demo/**` and removed `@rawr/plugin-mfe-demo` from
  root project lists, Vitest config, and `bun.lock`.
- Added `plugins/web/.gitkeep`.
- Replaced package-dependent tests with neutral fixtures:
  - server web module disabled/enabled serving uses `fixture-web`;
  - CLI web list/enable/disable/status uses a temp workspace fixture;
  - hq-ops security gate uses `@rawr/plugin-test-web`;
  - web mount lifecycle/base-path cleanup moved to
    `apps/web/test/mount-contract.test.ts`.
- Removed user-facing `mfe-demo` guidance from the web UI.
- Retired active coordination canvas operations guidance in `docs/process/**`
  and repaired `scripts/runtime/verify-hq-lifecycle.mjs` so the lifecycle gate
  validates current runtime/Inngest guidance rather than the retired runbook.
- Added `scripts/workstream-b/verify-upstream-fallout.mjs` and root script
  `upstream-fallout:gate`.
- Adjusted web test script wiring so `nx run @rawr/web:test` uses the root
  Vitest config, matching the repo's project config model.
- Added explicit timeouts to CLI tests that exceeded Vitest's default timeout
  under full-suite execution.

Decisions:

- Do not preserve `mfe-demo` as a fixture, package, project, UI hint, or
  lockfile entry.
- Preserve mount lifecycle coverage in a neutral web contract test.
- Retire demo route hints as plugin-specific guidance; the retained platform
  behavior is web module serving plus mount/unmount contract coverage.
- Treat `phase-1:gate:no-live-coordination` as non-covering historical proxy
  evidence for this lane until its missing ledger dependency and active-docs
  coverage are repaired.
- Treat old phase/structural coordination scripts as out of this lane's active
  guidance boundary.

Evidence:

- `bunx nx show projects` no longer lists `@rawr/plugin-mfe-demo`.
- `rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json apps plugins/web docs/process vitest.config.ts services/hq-ops/test bun.lock`
  returns no matches.
- `rg -n "/coordination|/rpc/coordination|rawr workflow coord|COORDINATION_CANVAS_OPERATIONS|coordination canvas|\\.rawr/coordination" docs/process scripts/runtime`
  returns no matches.
- `rg -n "api/inngest|dev:workflows|dev:inngest|/api/workflows" package.json apps/server docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`
  finds expected runtime/Inngest hooks.

Verification:

- `bun run upstream-fallout:gate`: passed.
- `bun run runtime:gate:hq-lifecycle`: passed.
- `bunx nx run-many -t typecheck --projects=@rawr/server,@rawr/cli,@rawr/web,@rawr/hq-ops`: passed.
- `bunx nx run @rawr/server:test`: passed.
- `bunx nx run @rawr/cli:test`: passed after adding timeouts to pre-existing
  slow CLI tests.
- `bunx nx run @rawr/web:test`: passed after using the root Vitest config.
- `bunx nx run @rawr/hq-ops:test`: passed.
- Targeted server/CLI/web/hq-ops tests passed during implementation.
- `git diff --check`: passed.
- `bun run phase-1:gate:no-live-coordination`: failed before checking this
  lane because the historical Phase 1 ledger file is missing; not used as
  closure evidence.

## Deferred Inventory

- Old phase/structural coordination verification scripts remain untouched and
  may deserve a future global cleanup lane. They are not active process docs or
  runtime lifecycle scripts.

## Review Result

Leaf loops:

- Discovery mappers completed and findings D-01/D-02 accepted.
- Plan review/red-team completed and findings R-01/R-04 accepted.
- Docs/runtime implementation worker completed scoped changes.
- Implementation review found no code/runtime blockers.
- Proof audit found artifact/gate-definition blockers; findings I-01/I-03
  accepted and repaired by this record/plan update.

Composed loops:

- MFE deletion, fixture replacement, coordination docs cleanup, and Inngest
  preservation are composed into one branch-local diff.

Waivers:

- `phase-1:gate:no-live-coordination` is consciously not used as closure
  evidence for this lane because it is a broken/non-covering historical proxy.

Invalidations:

- Pre-repair `runtime:gate:hq-lifecycle` passing result is invalid for
  coordination cleanup proof. Only post-repair gate results count.

Repair demands:

- None open after final verification rerun.

Closure steward result:

- Final verification rerun complete. Commit and clean Graphite state audit
  remain as the last operational step.

## Final Output

Artifacts:

- `WORKSTREAM_RECORD.md`
- `IMPLEMENTATION_PLAN.md`
- `scripts/workstream-b/verify-upstream-fallout.mjs`

Verification run:

- Final rerun complete after artifact edits:
  - `bun run upstream-fallout:gate`
  - `bun run runtime:gate:hq-lifecycle`
  - `bunx nx show projects`
  - `bunx nx run-many -t typecheck --projects=@rawr/server,@rawr/cli,@rawr/web,@rawr/hq-ops`
  - `bunx nx run @rawr/server:test`
  - `bunx nx run @rawr/cli:test`
  - `bunx nx run @rawr/web:test`
  - `bunx nx run @rawr/hq-ops:test`
  - stale `mfe-demo` grep
  - active coordination docs/runtime grep
  - Inngest/runtime preservation grep
  - `git diff --check`

Repo/Graphite state:

- Pending final audit after commit.

## Next Packet

After commit, this lane should hand off as upstream baseline cleanup complete.
Downstream sunset and sibling Workstream B lanes remain separate.
