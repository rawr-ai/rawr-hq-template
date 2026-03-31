# M1: Collapse Authority onto the Canonical HQ Lane

**Position in Migration:** Phase 1 of 3 in the final architecture migration.
**Goal:** Re-establish one coherent semantic story in the repo so Phase 2 can build runtime substrate on canonical seams instead of transitional ones.
**Status:** Planned
**Target Date:** TBD
**Owner:** TBD

<!-- Path roots -->
$PROJECT = docs/projects/rawr-final-architecture-migration
$MILESTONE = $PROJECT/milestones/M1-authority-collapse.md
$ISSUES = $PROJECT/issues
$CLI = apps/cli
$SERVER = apps/server
$HQ_APP = apps/hq
$PLUGIN_CLI = plugins/cli/plugins
$AGENT_SYNC = packages/agent-sync

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

## Issue Inventory

```yaml
issues:
  - id: M1-U00
    title: "Guardrails and Phase 1 ledger"
    status: planned
    blocked_by: []
  - id: M1-U01
    title: "Archive false futures"
    status: planned
    blocked_by: [M1-U00]
  - id: M1-U02
    title: "Reserve the canonical HQ Ops seam"
    status: planned
    blocked_by: [M1-U01]
  - id: M1-U03
    title: "Move HQ operational truth into HQ Ops and rewire consumers"
    status: planned
    blocked_by: [M1-U02]
  - id: M1-U04
    title: "Dissolve packages/hq and land purpose-named tooling boundaries"
    status: planned
    blocked_by: [M1-U03]
  - id: M1-U05
    title: "Cut the canonical plugin topology"
    status: planned
    blocked_by: [M1-U04]
  - id: M1-U06
    title: "Install the canonical HQ app shell"
    status: planned
    blocked_by: [M1-U05]
  - id: M1-U07
    title: "Neutralize old executable composition authority"
    status: planned
    blocked_by: [M1-U06]
  - id: M1-U08
    title: "Ratchet proofs, land durable docs, freeze the plateau, and review the rest of the migration"
    status: planned
    blocked_by: [M1-U07]
```

These IDs are the stable local anchors for the next workflow steps. The breakout step should preserve them rather than inventing a new issue tree.

## Milestone Slices

### M1-U00: Slice 0 — Guardrails and Phase 1 Ledger

**Complexity × Parallelism:** Medium complexity, low parallelism.

**Outcome:** The repo has a checked-in Phase 1 ledger, the migration lane is frozen, and early proof rails exist before semantic moves begin.

**Why now:** Without guardrails, every later slice competes with architectural drift and accidental reintroduction of old authority paths.

**In scope**

- create the Phase 1 ledger
- classify the live lane, archived lane, parked lane, and reclassified surfaces
- establish the initial structural checks that make forbidden directions visible
- freeze the migration lane so new work cannot land in the wrong places during Phase 1

**Out of scope**

- moving semantic logic
- changing runtime behavior
- deferring slice-local cleanup under the assumption that Slice 8 will catch it

**Implementation guidance**

The point of this slice is not file motion. It is to make the repo tell the truth about what is live, what is archived, and what must stop changing during the migration.

```yaml
files:
  - path: docs/migration/phase-1-ledger.md
    notes: New checked-in ledger; becomes the authoritative slice classifier for the live lane.
  - path: scripts/phase-1/verify-phase1-ledger.mjs
    notes: Ledger truth and inventory alignment.
  - path: scripts/phase-1/verify-no-live-coordination.mjs
    notes: Prevent coordination from reappearing in the live lane.
  - path: scripts/phase-1/verify-no-live-support-example.mjs
    notes: Prevent support-example from reappearing in the live lane.
  - path: scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs
    notes: Prevent non-runtime agent content from staying under canonical plugin roots.
  - path: scripts/phase-1/verify-no-old-operational-packages.mjs
    notes: Reserve the later hard cut against old operational owners.
  - path: scripts/phase-1/verify-no-legacy-hq-imports.mjs
    notes: Reserve the later hard cut against @rawr/hq facades.
```

Use the current repo inventory as the starting evidence base:

- `bunx nx show projects`
- `find services -maxdepth 2 -type d | sort`
- `find packages -maxdepth 2 -type d | sort`
- `find plugins -maxdepth 3 -type d | sort`
- `find apps -maxdepth 3 -type d | sort`

**Acceptance criteria**

- [ ] The ledger forbids new work in `plugins/api/*`, `plugins/workflows/*`, `coordination`, `support-example`, and old HQ package imports.
- [ ] The ledger explicitly limits parked-lane edits to deletions, rewires, compile fixes, and explicit unblockers.
- [ ] The ledger classifies the minimum concrete Phase 1 surface set and that classification is proven against repo inventory.
- [ ] The initial Phase 1 structural checks exist and are wired into the repo as runnable commands/scripts.

**Testing / Verification**

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun scripts/phase-1/verify-phase1-ledger.mjs`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `bunx nx show projects`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

## Prework Prompt (Agent Brief)
**Purpose:** Determine the exact ledger section structure, the minimum canonical surface set to classify, and how the new phase-1 verification scripts should hook into the existing repo verification flow.
**Expected Output:** A short implementation note naming the ledger headings, the concrete surface inventory to classify, the current structural runner integration points, and the exact package/root scripts that should invoke the new phase-1 checks.
**Sources to Check:**
- `package.json`
- `scripts/phase-03/`
- `docs/projects/rawr-final-architecture-migration/resources/RAWR_P1_Architecture_Migration_Plan.md`
- current workspace inventory commands listed above

### M1-U01: Slice 1 — Archive False Futures

**Complexity × Parallelism:** Medium complexity, medium parallelism after the ledger lands.

**Outcome:** `coordination`, `support-example`, and runtime-misplaced agent content stop exerting pressure on the live architecture.

**Why now:** False futures must leave the live lane before canonical seams are installed, or they will keep acting like plausible architectural authorities.

**In scope**

- archive and remove live `coordination` surfaces
- archive and remove live `support-example` surfaces
- preserve the useful evidence from those archived lanes
- move runtime-misplaced agent content out of `plugins/`
- update live project/workspace inventories so archived surfaces stop participating in build, typecheck, test, and runtime

**Out of scope**

- normalizing `coordination`
- keeping `support-example` alive as live Phase 1 architecture
- creating the later async replacement slice

**Implementation guidance**

This slice is about subtraction with evidence retention. The archive artifacts matter because they are the only sanctioned memory of the removed lanes after this slice lands.

```yaml
files:
  - path: services/coordination
    notes: Archive and remove from the live lane.
  - path: plugins/api/coordination
    notes: Remove from live plugin projection.
  - path: plugins/workflows/coordination
    notes: Remove from live async projection.
  - path: services/support-example
    notes: Archive and remove from the live lane.
  - path: plugins/workflows/support-example
    notes: Remove from live async projection.
  - path: plugins/agents/hq
    notes: Reclassify out of runtime plugin roots.
  - path: docs/archive/coordination/lessons.md
    notes: Preserve durable-run lessons only.
  - path: docs/archive/support-example/lessons.md
    notes: Preserve fixtures/lessons only.
```

**Acceptance criteria**

- [ ] `coordination` is absent from live build, test, runtime, and inventory surfaces.
- [ ] `support-example` is absent from live build, test, runtime, manifest/host registration, and live test inventory.
- [ ] The preserved support-example evidence includes lifecycle fixtures, a representative trigger payload, and translation of the best tests into later async acceptance language.
- [ ] Non-runtime agent content has moved out of runtime plugin roots.
- [ ] Static scans prove there are no live imports or registrations pointing at archived coordination/support-example surfaces.

**Testing / Verification**

- `bun run sync:check`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs`
- `rg -n 'coordination|support-example' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test ! -d plugins/agents/hq`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

### M1-U02: Slice 2 — Reserve the Canonical HQ Ops Seam

**Complexity × Parallelism:** Low-to-medium complexity, low parallelism.

**Outcome:** `services/hq-ops` exists as the one canonical Phase 1 service home, with reserved module seams for `config`, `repo-state`, `journal`, and `security`.

**Why now:** Canonical space has to exist before truth can move into it. This slice should make later migration easier without prematurely moving logic.

**In scope**

- create `services/hq-ops`
- establish the canonical shell and reserved module layout
- lock the rule that Phase 1 HQ Ops authority lives here
- reserve the places where the four operational modules will land

**Out of scope**

- moving production logic
- rewiring consumers
- letting seam reservation quietly become the actual migration slice

**Implementation guidance**

Use the current `services/state` package shape as the nearest structural prior art, but do not inherit its naming or authority model uncritically.

```yaml
files:
  - path: services/hq-ops/package.json
    notes: New Phase 1 service package shell.
  - path: services/hq-ops/src/service/base.ts
    notes: Service boundary shell.
  - path: services/hq-ops/src/service/contract.ts
    notes: Reserved transport-neutral service contract seam.
  - path: services/hq-ops/src/service/impl.ts
    notes: Reserved implementation seam.
  - path: services/hq-ops/src/service/router.ts
    notes: Reserved routing seam.
  - path: services/hq-ops/src/modules/config/
    notes: Reserved config module seam.
  - path: services/hq-ops/src/modules/repo-state/
    notes: Reserved repo-state module seam.
  - path: services/hq-ops/src/modules/journal/
    notes: Reserved journal module seam.
  - path: services/hq-ops/src/modules/security/
    notes: Reserved security module seam.
  - path: services/state/src
    notes: Structural prior art only; do not preserve authority there.
```

**Acceptance criteria**

- [ ] `services/hq-ops` exists with the canonical Phase 1 service shell.
- [ ] Placeholder seams exist for `config`, `repo-state`, `journal`, and `security`.
- [ ] The seam-reservation slice does not move logic or rewire consumers.
- [ ] Service-shape proof exists for the reserved seam.

**Testing / Verification**

- `bun run sync:check`
- `bun --cwd services/hq-ops run typecheck`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)

### M1-U03: Slice 3 — Move HQ Operational Truth into HQ Ops and Rewire Consumers

**Complexity × Parallelism:** High complexity, medium parallelism after the HQ Ops seam lands.

**Outcome:** The repo has one authoritative home for HQ operational truth, and active consumers have been cut directly to it.

**Why now:** This is the semantic heart of Phase 1. Runtime projection and app authority should only move after semantic truth is no longer split across packages, services, CLI code, and facades.

**In scope**

- move config truth into HQ Ops
- move repo-state truth into HQ Ops
- move journal truth into HQ Ops
- move security truth into HQ Ops
- rewire active consumers directly to HQ Ops
- remove the old owning packages/services from the live lane

**Out of scope**

- changing plugin topology
- changing app-shell authority
- introducing new transitional package facades

**Implementation guidance**

The live consumer inventory is already visible in the repo and should be treated as the minimum direct-rewire set, not as optional cleanup.

```yaml
files:
  - path: packages/control-plane/src
    notes: Config ownership source to fold into HQ Ops.
  - path: services/state/src
    notes: Repo-state ownership source to fold into HQ Ops.
  - path: packages/journal/src
    notes: Journal ownership source to fold into HQ Ops.
  - path: packages/security/src
    notes: Security ownership source to fold into HQ Ops.
  - path: apps/server/src/bootstrap.ts
    notes: Current config + repo-state consumer.
  - path: apps/cli/src/commands/config/show.ts
    notes: Current config consumer.
  - path: apps/cli/src/commands/config/validate.ts
    notes: Current config consumer.
  - path: apps/cli/src/index.ts
    notes: Current journal consumer.
  - path: apps/cli/src/commands/journal/*
    notes: Current journal surface.
  - path: apps/cli/src/commands/security/*
    notes: Current security surface.
  - path: plugins/cli/plugins/src/lib/security.ts
    notes: Current security helper.
  - path: plugins/cli/plugins/src/commands/plugins/sync/sources/*
    notes: Current config consumer.
  - path: packages/agent-sync/src/lib/layered-config.ts
    notes: Current config consumer.
```

Follow the direct-consumer-cut rule:

- cut to `@rawr/hq-ops` or approved thin module subpaths
- do not add a new facade package
- port or preserve the behavioral tests before deleting old owners

**Acceptance criteria**

- [ ] No live imports remain from `@rawr/control-plane`, `@rawr/state`, `@rawr/journal`, or `@rawr/security`.
- [ ] Active CLI/server/tooling consumers cut directly to `@rawr/hq-ops` or approved thin module subpaths.
- [ ] Config merge/validation, repo-state locking/mutation, journal behavior, and security scan/gate/report behavior all retain continuity through targeted tests.
- [ ] Old-owner inventory/import cleanup lands in this slice rather than being deferred.

**Testing / Verification**

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd packages/agent-sync run typecheck`
- `bun --cwd apps/server run test`
- `bun --cwd apps/cli run test`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `rg -n '@rawr/(control-plane|state|journal|security)\\b' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

## Prework Prompt (Agent Brief)
**Purpose:** Build the complete live consumer inventory for `@rawr/control-plane`, `@rawr/state`, `@rawr/journal`, and `@rawr/security`, including which imports are direct, which flow through `@rawr/hq`, and which tests need to move or be ported before owner deletion.
**Expected Output:** A migration note grouped by owner (`config`, `repo-state`, `journal`, `security`) with consumer paths, replacement target paths in HQ Ops, and the exact tests/proofs that must move with each owner.
**Sources to Check:**
- `rg -n '@rawr/control-plane|@rawr/state|@rawr/journal|@rawr/security|@rawr/hq/' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `packages/control-plane/src`
- `services/state/src`
- `packages/journal/src`
- `packages/security/src`
- `packages/hq/src`

### M1-U04: Slice 4 — Dissolve `packages/hq` and Land Purpose-Named Tooling Boundaries

**Complexity × Parallelism:** Medium complexity, low-to-medium parallelism.

**Outcome:** The ambiguous HQ package is gone, and only the support/tooling boundaries that actually earn existence survive.

**Why now:** `packages/hq` cannot be deleted safely until Phase 1 has already established a real home for semantic HQ truth.

**In scope**

- move genuine shared workspace/plugin-discovery support into `packages/plugin-workspace`
- keep plugin-CLI-only helpers with plugin CLI ownership
- remove semantic HQ facades that became invalid once HQ Ops became authoritative
- delete `packages/hq`

**Out of scope**

- moving work into the HQ SDK unless it truly belongs there
- preserving `packages/hq` as a generic compatibility bucket

**Implementation guidance**

`packages/hq` is not one problem. It is several unrelated tool/support surfaces plus semantic facades that should die. Split by earned ownership, not by directory nostalgia.

```yaml
files:
  - path: packages/hq/src/workspace/index.ts
    notes: Shared workspace/plugin discovery candidate.
  - path: packages/hq/src/workspace/plugin-manifest-contract.ts
    notes: Shared plugin contract parsing candidate.
  - path: packages/hq/src/install/*
    notes: Plugin CLI ownership candidate.
  - path: packages/hq/src/lifecycle/*
    notes: Plugin CLI ownership candidate.
  - path: packages/hq/src/scaffold/*
    notes: Plugin CLI ownership candidate; compare against existing scaffold code under plugins/cli/plugins.
  - path: packages/hq/src/journal/*
    notes: Semantic facade to delete after HQ Ops cut.
  - path: packages/hq/src/security/*
    notes: Semantic facade to delete after HQ Ops cut.
  - path: plugins/cli/plugins/src/lib/*
    notes: Target home for plugin-CLI-owned helpers.
  - path: packages/plugin-workspace
    notes: New shared support package; must stay support-only.
```

**Acceptance criteria**

- [ ] `packages/hq` is gone.
- [ ] No live `@rawr/hq/*` imports remain in apps, packages, plugins, or services.
- [ ] `packages/plugin-workspace` owns only real shared support, not semantic HQ truth.
- [ ] Plugin-CLI-only helpers live with plugin CLI ownership.
- [ ] Tests and typechecks previously carried by `packages/hq` pass in their new owners.

**Testing / Verification**

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun --cwd apps/cli run typecheck`
- `bun --cwd plugins/cli/plugins run typecheck`
- `bun --cwd plugins/cli/plugins run test`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `rg -n '@rawr/hq(/|\\b)' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

## Prework Prompt (Agent Brief)
**Purpose:** Partition `packages/hq` into three buckets: support/tooling to preserve, plugin-CLI-owned helpers to move, and semantic facades to delete.
**Expected Output:** A file-by-file disposition table for `packages/hq/src` naming the target owner (`packages/plugin-workspace`, `plugins/cli/plugins`, delete) and the reasoning for each group.
**Sources to Check:**
- `packages/hq/src`
- `plugins/cli/plugins/src`
- current `@rawr/hq/*` imports discovered via ripgrep

### M1-U05: Slice 5 — Cut the Canonical Plugin Topology

**Complexity × Parallelism:** Medium complexity, medium parallelism after slice 4 closes.

**Outcome:** There is only one live runtime-projection tree, and it is the canonical role-first topology.

**Why now:** Plugin topology should only move once semantic owners are stable and ambiguous support layers are already gone.

**In scope**

- install the canonical plugin roots:
  - `plugins/server/api/*`
  - `plugins/async/workflows/*`
  - `plugins/async/schedules/*`
- move live server projections to the canonical server root
- update root workspaces, project inventory, tags, and imports so the new topology is authoritative

**Out of scope**

- building new plugin builders or later-phase substrate
- creating extra plugin-root categories unless Phase 1 truly needs them
- treating empty async roots as a failure if the live async lane is intentionally empty after archiving

**Implementation guidance**

This slice is not just filesystem motion. It is inventory, tags, and import truth moving together so that the old topology stops being a viable path.

```yaml
files:
  - path: plugins/api/example-todo
    notes: Live server projection to move under plugins/server/api.
  - path: plugins/api/state
    notes: Live server projection to move under plugins/server/api.
  - path: plugins/api/coordination
    notes: Should already be gone after Slice 1; use as proof target.
  - path: plugins/workflows/coordination
    notes: Should already be gone after Slice 1; use as proof target.
  - path: plugins/workflows/support-example
    notes: Should already be gone after Slice 1; use as proof target.
  - path: package.json
    notes: Workspace lists and root scripts.
  - path: apps/server/test/rawr.test.ts
    notes: Existing proof surface around plugin families and host composition.
  - path: apps/server/test/phase-a-gates.test.ts
    notes: Existing proof surface around canonical family routing.
```

**Acceptance criteria**

- [ ] Old plugin roots are gone from the live lane.
- [ ] Canonical plugin topology proof passes.
- [ ] Workspace/project inventory, tags, and imports align with the new topology.
- [ ] There is no second live plugin tree left for implementers to treat as authoritative.

**Testing / Verification**

- `bun run sync:check`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/server run test`
- `bun scripts/phase-1/verify-canonical-plugin-topology.mjs`
- `rg -n 'plugins/(api|workflows)/' apps packages plugins services -g '!**/dist/**' -g '!**/node_modules/**'`
- `test ! -d plugins/api && test ! -d plugins/workflows`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)

## Prework Prompt (Agent Brief)
**Purpose:** Determine the exact workspace, Nx inventory, tag, and import updates required when `plugins/api/*` becomes `plugins/server/api/*` and async roots become `plugins/async/*`.
**Expected Output:** A short migration checklist naming every workspace/project/tag/config file that must change, plus the existing proof tests that need updates.
**Sources to Check:**
- `package.json`
- `bunx nx show projects`
- `plugins/`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`

### M1-U06: Slice 6 — Install the Canonical HQ App Shell

**Complexity × Parallelism:** Medium complexity, low parallelism.

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

**Out of scope**

- implementing bootgraph
- implementing runtime compiler or harnesses
- making `web`, `cli`, or `agent` part of the live Phase 1 shell
- neutralizing old executable authority before the new front door is proven

**Implementation guidance**

The new app shell has to become real authority here, not a decorative wrapper around the current `apps/server` path.

```yaml
files:
  - path: apps/hq/src/manifest.ts
    notes: Current manifest authority to retire from the live lane.
  - path: apps/hq/package.json
    notes: Current package exports and project scripts.
  - path: apps/server/src/host-composition.ts
    notes: Current consumer of HQ manifest composition.
  - path: apps/server/src/rawr.ts
    notes: Current executable front-door path.
  - path: apps/hq/test/runtime-router.test.ts
    notes: Existing test surface around rawr.hq.ts and bridge discipline.
  - path: apps/server/test/rawr.test.ts
    notes: Existing proof surface around manifest coldness and host path.
```

**Acceptance criteria**

- [ ] The canonical HQ app shell files exist and are authoritative.
- [ ] Manifest-purity and entrypoint-thinness proof passes.
- [ ] The Phase 1 app shell only needs `server`, `async`, and `dev`.
- [ ] App-shell smoke tests prove the new front door is real before old host authority is dismantled.

**Testing / Verification**

- `bun run sync:check`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/hq run test`
- `bun scripts/phase-1/verify-manifest-purity.mjs`
- `bun scripts/phase-1/verify-entrypoint-thinness.mjs`
- `rg -n 'manifest\\.ts|rawr\\.hq\\.ts|server\\.ts|async\\.ts|dev\\.ts' apps/hq apps/server -g '!**/dist/**' -g '!**/node_modules/**'`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Canonical architecture spec](../resources/RAWR_Canonical_Architecture_Spec.md)

### M1-U07: Slice 7 — Neutralize Old Executable Composition Authority

**Complexity × Parallelism:** High complexity, low parallelism.

**Outcome:** The old host-composition path stops being authoritative, and execution flows through the new app shell instead.

**Why now:** Legacy executable authority should be removed only after the new front door already exists and points at canonical service/plugin seams.

**In scope**

- stop the old host-composition files from being live authority surfaces
- route execution through the new app shell
- use the one allowed bridge only if necessary

**Out of scope**

- keeping two manifests, two registries, or two executable composition paths alive
- letting the bridge own manifest membership, plugin discovery rules, service truth, or runtime topology

**Implementation guidance**

The legacy authority is currently concentrated in `apps/server/src/host-composition.ts`, `host-seam.ts`, and `host-realization.ts`, plus the places that boot through them. This slice must prove that those files are no longer the live authority path.

```yaml
files:
  - path: apps/server/src/host-composition.ts
    notes: Primary legacy executable authority surface.
  - path: apps/server/src/host-seam.ts
    notes: Legacy host planning seam.
  - path: apps/server/src/host-realization.ts
    notes: Legacy realization seam.
  - path: apps/server/src/rawr.ts
    notes: Current boot path through host-composition.
  - path: apps/server/src/testing-host.ts
    notes: Current testing path through host-composition.
  - path: apps/server/test/rawr.test.ts
    notes: Existing host-composition proof surface.
  - path: apps/server/test/phase-a-gates.test.ts
    notes: Existing gate surface around manifest and host authority.
```

**Acceptance criteria**

- [ ] Old host files are deleted or fully quarantined from live authority.
- [ ] `apps/hq/server.ts` is a smoke-tested boot path.
- [ ] `apps/hq/async.ts` is a smoke-tested boot path if the async role is reserved/live in Phase 1.
- [ ] If `apps/hq/legacy-cutover.ts` exists, it is the only surviving transitional seam and is explicitly recorded as a Phase 2 Slice 0 deletion.

**Testing / Verification**

- `bun run sync:check`
- `bun --cwd apps/server run typecheck`
- `bun --cwd apps/hq run typecheck`
- `bun --cwd apps/server run test`
- `bun scripts/phase-1/verify-no-legacy-composition-authority.mjs`
- `rg -n 'host-composition|host-seam|host-realization' apps/server/src apps/hq -g '!**/dist/**' -g '!**/node_modules/**'`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)

## Prework Prompt (Agent Brief)
**Purpose:** Audit every remaining live boot and testing path that still depends on `host-composition`, `host-seam`, or `host-realization`, and determine the exact proof conditions for declaring legacy executable authority neutralized.
**Expected Output:** A path inventory naming every remaining caller, whether it must be deleted, rerouted, or quarantined, and the exact smoke/proof commands needed to show the new app shell is authoritative.
**Sources to Check:**
- `apps/server/src/rawr.ts`
- `apps/server/src/testing-host.ts`
- `apps/server/src/orpc.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/phase-a-gates.test.ts`
- `rg -n 'host-composition|host-seam|host-realization' apps/hq apps/server -g '!**/dist/**' -g '!**/node_modules/**'`

### M1-U08: Slice 8 — Ratchet Proofs, Land Durable Docs, Freeze the Plateau, and Review the Rest of the Migration

**Complexity × Parallelism:** Medium complexity, low parallelism.

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

**Out of scope**

- treating Slice 8 as the first time legacy cleanup happens
- churning docs for runtime substrate, harnesses, generators, or later-phase surfaces that are still unsettled
- reopening Phase 1 structural decisions during the review

**Implementation guidance**

This slice is where the repo stops being “in motion” and becomes a stable plateau. The docs that land here need to be truthfully durable, not speculative.

```yaml
files:
  - path: docs/migration/phase-1-ledger.md
    notes: Durable current migration ledger.
  - path: docs/archive/coordination/lessons.md
    notes: Archive evidence only.
  - path: docs/archive/support-example/lessons.md
    notes: Archive evidence only.
  - path: docs/migration/phase-1-current-state.md
    notes: Stable post-Phase-1 state only.
  - path: docs/migration/phase-2-entry-conditions.md
    notes: Explicit handoff contract into Phase 2.
  - path: scripts/phase-1/
    notes: Ratcheted proof suite.
```

**Acceptance criteria**

- [ ] All Phase 1 structural checks pass together.
- [ ] Parked-lane freeze rules are verifiable.
- [ ] Docs describe only settled post-Phase-1 reality and archived evidence.
- [ ] The end-of-milestone review explicitly confirms Phase 2 entry conditions and records any Phase 2/3 readjustments without changing the Phase 1 plateau.

**Testing / Verification**

- `bun run sync:check`
- `bun run lint:boundaries`
- `bun scripts/phase-1/verify-phase1-ledger.mjs`
- `bun scripts/phase-1/verify-no-live-coordination.mjs`
- `bun scripts/phase-1/verify-no-live-support-example.mjs`
- `bun scripts/phase-1/verify-no-runtime-agent-content-under-plugins.mjs`
- `bun scripts/phase-1/verify-hq-ops-service-shape.mjs`
- `bun scripts/phase-1/verify-no-old-operational-packages.mjs`
- `bun scripts/phase-1/verify-no-legacy-hq-imports.mjs`
- `bun scripts/phase-1/verify-canonical-plugin-topology.mjs`
- `bun scripts/phase-1/verify-manifest-purity.mjs`
- `bun scripts/phase-1/verify-entrypoint-thinness.mjs`
- `bun scripts/phase-1/verify-no-legacy-composition-authority.mjs`
- `bun scripts/phase-1/verify-parked-lane-frozen.mjs`

**Paper trail**

- [Dedicated Phase 1 migration plan](../resources/RAWR_P1_Architecture_Migration_Plan.md)
- [Phase 1 grounding note](../.context/grounding.md)
- [Workflow scaffold](../.context/workflow.md)

## Prework Prompt (Agent Brief)
**Purpose:** Define the exact Phase 1 close-out review checklist and identify which existing docs outside the migration project would become stale or misleading once the plateau lands.
**Expected Output:** A short review checklist covering proof ratchet, durable docs, parked-lane freeze, and stale-doc audit, plus a list of docs that should be left untouched because they describe later phases.
**Sources to Check:**
- `docs/projects/rawr-final-architecture-migration/.context/grounding.md`
- `docs/projects/rawr-final-architecture-migration/.context/workflow.md`
- `docs/DOCS.md`
- `docs/projects/DOCS.md`
- `docs/projects/rawr-final-architecture-migration/resources/*.md`

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

In addition, the slice-specific proof obligations from the Phase 1 plan must remain explicit during issue hardening:

- behavior continuity for config, repo-state, journal, and security during HQ Ops migration
- app-shell smoke proof before legacy executable authority is removed
- smoke boot paths through the new `server` and `async` entrypoints when legacy authority is neutralized

## Sequencing and Parallelization Guidance

The default posture is sequential. This milestone is primarily dependency collapse, not throughput maximization.

Safe parallelism is limited to narrow sub-slices after their prerequisite stop-gates exist:

- after M1-U00 lands, archive work inside M1-U01 may parallelize if each archive path still closes its own loops
- after M1-U02 lands, the four operational module migrations inside M1-U03 may parallelize if consumer rewires and old-owner removal close coherently
- after M1-U04 lands, limited plugin-topology prep inside M1-U05 may parallelize if it does not recreate `packages/hq` or other ambiguous temporary homes
- M1-U06 and M1-U07 should remain mostly sequential because app authority and legacy-authority neutralization are tightly coupled

If later issue hardening wants to change the issue count, it should preserve the slice order and the stop-gates above.

## Open Questions

No cross-cutting design questions should be reopened in this milestone. Remaining uncertainty should be handled as prework prompts attached to the specific slice that needs discovery.

## End-of-Milestone Review / Readjustment Point

When M1-U08 completes, perform one structured review before starting Phase 2:

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
- [Workflow scaffold](../.context/workflow.md)
