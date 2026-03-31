# M1: Collapse Authority onto the Canonical HQ Lane

**Position in Migration:** Phase 1 of 3 in the final architecture migration.
**Goal:** Re-establish one coherent semantic story in the repo so Phase 2 can build runtime substrate on canonical seams instead of transitional ones.
**Status:** Planned
**Target Date:** TBD
**Owner:** TBD

## Why This Milestone Exists

The migration is not blocked by uncertainty about the target architecture. It is blocked because the current repo still carries multiple competing answers to:

- what counts as a service
- what counts as runtime projection
- what owns app composition authority
- which plugin topology is canonical
- which prototypes and examples are still allowed to steer architecture

This milestone is the authority-collapse plateau in the larger three-phase migration:

1. Phase 1: authority collapse / semantic recovery
2. Phase 2: minimal canonical runtime shell
3. Phase 3: generator-ready capability foundry

Phase 1 exists to make the repo tell one story again. It should reduce the state space, remove false futures, and install canonical seams without smuggling in later substrate work.

## What Good Looks Like When This Milestone Is Done

At milestone exit, all of the following are true at the same time:

- HQ operational truth lives in one canonical home for Phase 1 execution: `services/hq-ops`.
- `config`, `repo-state`, `journal`, and `security` live inside that home as the Phase 1 execution modules.
- HQ operational truth no longer lives under semantic-smuggling packages.
- `coordination` is archived and removed from the live lane.
- `support-example` is archived and removed from the live lane.
- non-runtime agent content no longer lives under `plugins/`.
- `packages/hq` is dissolved.
- the only live plugin topology is canonical:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- the only live HQ app shell is canonical:
  - `apps/hq/rawr.hq.ts`
  - `apps/hq/server.ts`
  - `apps/hq/async.ts`
  - `apps/hq/dev.ts`
- old executable composition is no longer authoritative.
- at most one bridge remains across the Phase 1 -> Phase 2 boundary, and if it exists it is only `apps/hq/legacy-cutover.ts`.
- Phase 1 structural checks, targeted typechecks, and targeted tests all pass.
- parked lanes are explicitly frozen.
- the end-of-milestone review leaves Phase 2 with a clean, explicit entry condition.

## Source-of-Truth Rule for This Milestone

This milestone is governed by three documents, in this order:

1. [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md): architecture and invariant truth.
2. [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md): operational truth for Phase 1 scope, sequencing, fixed decisions, and exit gate.
3. [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md): overall migration framing and downstream handoff.

For this milestone, the dedicated Phase 1 plan is the forward-locked decision set for Phase 1 execution. The larger migration plan provides overall framing and downstream handoff context, but it does not reopen or override Phase 1 decisions that P1 already fixed.

That means this milestone should execute, not renegotiate, the following Phase 1 decisions:

- treat `services/hq-ops` as the Phase 1 execution service package with internal modules, not as four separate services for milestone shaping
- treat `support-example` as archived in Phase 1, with later async proof work reserved for a later slice
- treat `packages/plugin-workspace` and `packages/agent-pack-hq` as Phase 1 execution outcomes, not as reopened design questions

## Global Guardrails and Semantic Guidance

Implementation agents should continuously anchor on these rules:

- recover authority first; do not build runtime substrate early
- prefer hard cuts over compatibility layers
- remove ambiguity instead of preserving it behind adapters
- semantic truth moves before runtime projection
- runtime projection moves before app-shell authority
- app-shell authority moves before legacy composition authority is neutralized
- each slice closes its own loops; cleanup is not a final catch-all bucket
- the only allowed cross-phase bridge is `apps/hq/legacy-cutover.ts`, and only if absolutely necessary
- no dual authority survives:
  - no dual manifests
  - no dual plugin registries
  - no dual executable composition paths
  - no long-lived fallback registries or shim trees
- parked lanes may receive only deletions, rewires, compile fixes, or explicit unblockers
- documentation updates must describe only settled outcomes or archived evidence; avoid doc churn for surfaces that are not done migrating
- do not leak Phase 2 or Phase 3 work into this milestone:
  - no bootgraph implementation
  - no runtime compiler
  - no process runtime
  - no canonical harness buildout
  - no generator/codemod infrastructure
  - no web/cli/agent runtime rebuilds
  - no rich topology/catalog work

## Domino Order

This milestone is deliberately sequenced to make each next move safer than the previous one:

1. install guardrails before code motion
2. archive false futures before creating new authority
3. reserve canonical HQ Ops space before moving semantic truth
4. move semantic truth before deleting ambiguous support layers
5. cut plugin topology only after semantic ownership is stable
6. install app-shell authority before neutralizing old executable authority
7. ratchet proofs, land durable docs, and review the migration only after the plateau is real

That order is load-bearing. If issue hardening later changes the issue count, it should still preserve this dependency structure.

## Milestone Slices

### Slice 0: Guardrails and Phase 1 Ledger

**Outcome:** The repo has a checked-in Phase 1 ledger, the migration lane is frozen, and early proof rails exist before semantic moves begin.

**Why now:** Without guardrails, every later slice competes with architectural drift and accidental reintroduction of old authority paths.

**In scope**

- create the Phase 1 ledger
- classify the live lane, archived lane, parked lane, and reclassified surfaces
- establish the initial structural checks that make forbidden directions visible
- freeze the migration lane so new work cannot land in the wrong places during Phase 1

**Must not happen here**

- no semantic logic moves yet
- no runtime behavior changes yet
- no later-slice cleanup debt is created under the assumption that Slice 8 will catch it

**Acceptance and proof**

- the ledger forbids new work in old plugin roots, `coordination`, `support-example`, and old HQ package imports
- the ledger explicitly limits parked-lane edits to deletions, rewires, compile fixes, and explicit unblockers
- the ledger classifies the minimum concrete Phase 1 surface set and that classification is proven against repo inventory
- Phase 1 structural checks exist for ledger truth, no live `coordination`, no live `support-example`, no runtime agent content under `plugins/`, and no drift back to old operational packages/HQ facades

### Slice 1: Archive False Futures

**Outcome:** `coordination`, `support-example`, and runtime-misplaced agent content stop exerting pressure on the live architecture.

**Why now:** False futures must leave the live lane before canonical seams are installed, or they will keep acting like plausible architectural authorities.

**In scope**

- archive and remove live `coordination` surfaces
- archive and remove live `support-example` surfaces
- preserve the useful evidence from those archived lanes
- move runtime-misplaced agent content out of `plugins/`
- update live project/workspace inventories so archived surfaces stop participating in build, typecheck, test, and runtime

**Must not happen here**

- do not normalize `coordination`
- do not keep `support-example` alive as live Phase 1 architecture
- do not create the later async replacement slice yet

**Acceptance and proof**

- `coordination` is absent from live build, test, runtime, and inventories, while archive lessons are preserved
- `support-example` is absent from live build, test, runtime, manifest/host registration, and live test inventory
- the preserved support-example evidence includes lifecycle fixtures, a representative trigger payload, and translation of the best tests into later async acceptance language
- non-runtime agent content has moved out of runtime plugin roots
- static scans prove there are no live imports or registrations pointing at archived coordination/support-example surfaces

### Slice 2: Reserve the Canonical HQ Ops Seam

**Outcome:** `services/hq-ops` exists as the one canonical Phase 1 service home, with reserved module seams for `config`, `repo-state`, `journal`, and `security`.

**Why now:** Canonical space has to exist before truth can move into it. This slice should make later migration easier without prematurely moving logic.

**In scope**

- create `services/hq-ops`
- establish the canonical shell and reserved module layout
- lock the rule that Phase 1 HQ Ops authority lives here
- reserve the places where the four operational modules will land

**Must not happen here**

- do not move production logic yet
- do not rewire consumers yet
- do not allow this seam-reservation slice to quietly become the migration slice

**Acceptance and proof**

- `services/hq-ops` exists with the canonical Phase 1 service shell
- placeholder seams exist for `config`, `repo-state`, `journal`, and `security`
- service-shape proof exists for the reserved seam
- targeted typecheck/structural proof confirms the seam is valid before any logic is moved into it

### Slice 3: Move HQ Operational Truth into HQ Ops and Rewire Consumers

**Outcome:** The repo has one authoritative home for HQ operational truth, and active consumers have been cut directly to it.

**Why now:** This is the semantic heart of Phase 1. Runtime projection and app authority should only move after semantic truth is no longer split across packages, services, CLI code, and facades.

**In scope**

- move config truth into HQ Ops
- move repo-state truth into HQ Ops
- move journal truth into HQ Ops
- move security truth into HQ Ops
- rewire active consumers directly to HQ Ops
- remove the old owning packages/services from the live lane

**Must not happen here**

- do not change plugin topology yet
- do not change app-shell authority yet
- do not introduce new transitional package facades

**Acceptance and proof**

- no live imports remain from the removed operational owners
- active CLI/server/tooling consumers cut directly to `@rawr/hq-ops` or approved thin module subpaths
- config merge/validation, repo-state locking/mutation, journal behavior, and security scan/gate/report behavior all retain continuity through targeted tests
- this slice closes its own import/inventory cleanup before the next slice starts

### Slice 4: Dissolve `packages/hq` and Land Purpose-Named Tooling Boundaries

**Outcome:** The ambiguous HQ package is gone, and only the support/tooling boundaries that actually earn existence survive.

**Why now:** `packages/hq` cannot be deleted safely until Phase 1 has already established a real home for semantic HQ truth.

**In scope**

- move genuine shared workspace/plugin-discovery support into `packages/plugin-workspace`
- keep plugin-CLI-only helpers with plugin CLI ownership
- remove semantic HQ facades that became invalid once HQ Ops became authoritative
- delete `packages/hq`

**Must not happen here**

- do not move work into the HQ SDK unless it truly belongs there
- do not preserve `packages/hq` as a generic compatibility bucket

**Acceptance and proof**

- `packages/hq` is gone
- no live `@rawr/hq/*` imports remain
- `packages/plugin-workspace` owns only real shared support, not semantic HQ truth
- tests and typechecks previously carried by `packages/hq` pass in their new owners

### Slice 5: Cut the Canonical Plugin Topology

**Outcome:** There is only one live runtime-projection tree, and it is the canonical role-first topology.

**Why now:** Plugin topology should only move once semantic owners are stable and ambiguous support layers are already gone.

**In scope**

- install the canonical plugin roots:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- move live server projections to the canonical server root
- update root workspaces, project inventory, tags, and imports so the new topology is authoritative

**Must not happen here**

- do not build new plugin builders or later-phase substrate
- do not create extra plugin-root categories unless Phase 1 truly needs them
- do not treat empty async roots as a problem if the live async lane is intentionally empty after archiving

**Acceptance and proof**

- old plugin roots are gone from the live lane
- canonical plugin topology proof passes
- path/tag coherence and live imports line up with the canonical topology
- there is no second live plugin tree left for implementers to treat as authoritative

### Slice 6: Install the Canonical HQ App Shell

**Outcome:** The canonical app front door exists and is authoritative for composition, even though later runtime substrate is still future work.

**Why now:** App-shell authority should move only after service truth and plugin topology are stable enough that the new front door can point at canonical seams rather than transition seams.

**In scope**

- create the canonical app shell files:
  - `apps/hq/rawr.hq.ts`
  - `apps/hq/server.ts`
  - `apps/hq/async.ts`
  - `apps/hq/dev.ts`
- make manifest membership the only composition authority
- keep entrypoints thin so they own process shape, not semantic truth
- reserve the later seams that Phase 2 will realize

**Must not happen here**

- do not implement bootgraph
- do not implement runtime compiler or harnesses
- do not make `web`, `cli`, or `agent` part of the live Phase 1 shell
- do not neutralize old executable authority yet; this slice is about installing the new front door cleanly first

**Acceptance and proof**

- the canonical HQ app shell files exist and are authoritative
- manifest-purity and entrypoint-thinness proof passes
- the Phase 1 app shell only needs `server`, `async`, and `dev`
- app-shell smoke tests prove the new front door is real before old host authority is dismantled

### Slice 7: Neutralize Old Executable Composition Authority

**Outcome:** The old host-composition path stops being authoritative, and execution flows through the new app shell instead.

**Why now:** Legacy executable authority should be removed only after the new front door already exists and points at canonical service/plugin seams.

**In scope**

- stop the old host-composition files from being live authority surfaces
- route execution through the new app shell
- use the one allowed bridge only if necessary

**Must not happen here**

- do not keep two manifests, two registries, or two executable composition paths alive
- do not let the bridge own manifest membership, plugin discovery rules, service truth, or runtime topology

**Acceptance and proof**

- old host files are deleted or fully quarantined from live authority
- `apps/hq/server.ts` is a smoke-tested boot path
- `apps/hq/async.ts` is a smoke-tested boot path if the async role is reserved/live in Phase 1
- if `apps/hq/legacy-cutover.ts` exists, it is the only surviving transitional seam and is explicitly recorded as a Phase 2 Slice 0 deletion

### Slice 8: Ratchet Proofs, Land Durable Docs, Freeze the Plateau, and Review the Rest of the Migration

**Outcome:** Phase 1 becomes a stable plateau rather than a loose collection of file moves, and the team stops to verify that the remaining migration plan still lines up with the plateau that actually landed.

**Why now:** Proof ratchets, docs, and migration readjustment only make sense once the Phase 1 plateau is real. This is the closure slice, not a license to defer cleanup from earlier slices.

**In scope**

- promote the Phase 1 checks into the normal migration gate set
- retire stale tranche/prototype-shaped checks
- freeze parked lanes
- land only the docs that are now settled:
  - `docs/migration/phase-1-ledger.md`
  - `docs/archive/coordination/lessons.md`
  - `docs/archive/support-example/lessons.md`
  - `docs/migration/phase-1-current-state.md`
  - `docs/migration/phase-2-entry-conditions.md`
- run the end-of-milestone migration review/readjustment

**Must not happen here**

- do not treat Slice 8 as the first time legacy cleanup happens; earlier slices must already have closed their own loops
- do not churn docs for runtime substrate, harnesses, generators, or later-phase surfaces that are still unsettled
- do not reopen Phase 1 structural decisions during the review

**Acceptance and proof**

- all Phase 1 structural checks pass together
- parked-lane freeze rules are verifiable
- docs describe only settled post-Phase-1 reality and archived evidence
- the end-of-milestone review explicitly confirms Phase 2 entry conditions and records any Phase 2/3 readjustments without changing the Phase 1 plateau

## Milestone-Wide Acceptance Criteria

- [ ] The milestone preserves the dedicated Phase 1 plan’s slice order and fixed decisions.
- [ ] Every slice lands as a forward-only slice with its own proof band before the next dependent slice begins.
- [ ] Every slice closes its own cleanup loops; only `apps/hq/legacy-cutover.ts` may survive across the Phase 1 -> Phase 2 boundary, and only if explicitly recorded.
- [ ] No dual authority survives for service truth, runtime projection, plugin topology, or app composition.
- [ ] No Phase 2 or Phase 3 substrate work is smuggled into this milestone.
- [ ] Legacy behavior, paths, imports, registrations, roots, and mentions that were supposed to die in Phase 1 are actually gone or archived by milestone end.
- [ ] Documentation work is limited to settled outcomes and archive evidence.
- [ ] The end-of-milestone review produces a concrete Phase 2 entry condition and a disciplined readjustment point for the rest of the migration.

## Common Verification Band

Each slice should end with the verification band appropriate to the surfaces it changed:

- `bun run sync:check`
- `bun run lint:boundaries`
- targeted typecheck for every changed live project
- targeted tests for every changed live project
- the structural verification introduced in or before that slice
- targeted static scans proving removed authorities actually disappeared

At milestone level, the structural suite must include at minimum:

- `verify-phase1-ledger`
- `verify-no-live-coordination`
- `verify-no-live-support-example`
- `verify-no-runtime-agent-content-under-plugins`
- `verify-hq-ops-service-shape`
- `verify-no-old-operational-packages`
- `verify-no-legacy-hq-imports`
- `verify-canonical-plugin-topology`
- `verify-manifest-purity`
- `verify-entrypoint-thinness`
- `verify-no-legacy-composition-authority`
- `verify-parked-lane-frozen`

In addition, the slice-specific proof obligations from the Phase 1 plan must remain explicit during issue hardening:

- behavior continuity for config, repo-state, journal, and security during HQ Ops migration
- app-shell smoke proof before legacy executable authority is removed
- smoke boot paths through the new `server` and `async` entrypoints when legacy authority is neutralized

## Sequencing and Parallelization Guidance

The default posture is sequential. This milestone is primarily dependency collapse, not throughput maximization.

Safe parallelism is limited to narrow sub-slices after their prerequisite stop-gates exist:

- after Slice 0 lands, archive work inside Slice 1 may parallelize if each archive path still closes its own loops
- after Slice 2 lands, the four operational module migrations inside Slice 3 may parallelize if consumer rewires and old-owner removal close coherently
- after Slice 4 lands, limited plugin-topology prep inside Slice 5 may parallelize if it does not recreate `packages/hq` or other ambiguous temporary homes
- Slices 6 and 7 should remain mostly sequential because app authority and legacy-authority neutralization are tightly coupled

If later issue hardening wants to change the issue count, it should preserve the slice order and the stop-gates above.

## End-of-Milestone Review / Readjustment Point

When Slice 8 completes, perform one structured review before starting Phase 2:

- confirm the Phase 1 plateau that actually landed matches the intended authority-collapse outcome
- confirm the only surviving cross-phase debt, if any, is `apps/hq/legacy-cutover.ts`
- confirm the larger migration plan still lines up with the frozen plateau
- record any needed Phase 2 or Phase 3 readjustments as downstream planning updates, not as reopened Phase 1 scope

This review is the formal handoff point from semantic recovery into runtime-substrate work.

## References

- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)
- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Larger migration plan](../resources/RAWR_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)
