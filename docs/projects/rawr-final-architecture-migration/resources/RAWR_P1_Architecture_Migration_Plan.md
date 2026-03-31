# RAWR HQ Phase 1 mini migration plan

## Executive call

Phase 1 is the authority-collapse phase.

It is not the bootgraph phase.
It is not the runtime-compiler phase.
It is not the generator phase.

Phase 1 exists to make the repo tell one coherent truth again.

The repo is currently blocked because it carries more than one answer to all of the following at the same time:

- what counts as a service
- what counts as runtime projection
- what counts as app composition authority
- which plugin topology is canonical
- which prototypes are still allowed to steer the architecture

Phase 1 fixes that by making four hard cuts:

1. HQ operational truth becomes one real service: `services/hq-ops`
2. false futures are archived instead of carried forward
3. the canonical plugin and app shells become the only sanctioned migration lane
4. old executable composition authority stops being authoritative

At the end of Phase 1, the repo is back on track for the migration because the state space is small again, the semantic model is unambiguous again, and every later runtime decision lands on canonical seams instead of transitional ones.

---

## Problem statement, scoped to Phase 1

The immediate problem is not that the final architecture is unknown.

The immediate problem is that the current repo is still semantically mixed.

Right now the codebase contains all of these at once:

- HQ composition authority is split between `apps/hq` and `apps/server`
- plugin topology is split between old roots and target roots
- HQ operational truth is split across packages, services, CLI code, and facades
- coordination is still present as if it were a live architectural noun
- `support-example` is still present as if it were the async proof slice, even though it is authored in the old grammar
- `plugins/agents/*` sits under a runtime root even though it is not runtime projection
- `packages/hq` acts as a semantic smuggling layer instead of a clear support boundary

That means the repo still rewards the wrong behavior:

- adding logic in ambiguous places
- preserving old topology while adding new topology
- treating runtime projection and semantic truth as if they were interchangeable
- letting examples and prototypes become architecture by inertia

Phase 1 does not try to solve the whole platform.

Phase 1 solves the thing that is actually blocking the platform:

**the repo must stop lying about authority.**

---

## Phase 1 scope

### In scope

Phase 1 includes all work required to make semantic authority stable and canonical.

That includes:

- classifying the live repo and freezing the migration lane
- archiving `coordination` out of the live architecture
- archiving `support-example` out of the live architecture
- freezing the current `plugins/agents/hq` marketplace compatibility lane in place and deferring its redesign
- creating the canonical `services/hq-ops` service shell
- consolidating HQ operational truth into `services/hq-ops` modules
- rewiring active consumers to the new HQ Ops service boundary
- dissolving `packages/hq`
- installing the canonical plugin topology
- installing the canonical HQ app shell
- removing old executable composition authority as a live authority model
- replacing tranche-shaped proof rules with invariant-shaped proof rules
- freezing parked lanes so they stop steering the migration
- documenting the new phase boundary and archiving the removed prototypes

### Out of scope

Phase 1 does not include the runtime substrate build.

That means Phase 1 does **not** build:

- the real bootgraph implementation
- the real runtime compiler
- the real process runtime
- canonical Elysia and Inngest harnesses
- generator or codemod infrastructure
- web, CLI, or agent runtime rebuilds
- steward activation runtime
- OpenShell integration
- rich topology/catalog behavior
- the replacement async proof slice (`example-async`)

Phase 1 may reserve these seams.
It may not implement them as if Phase 2 had already started.

### What Phase 1 accomplishes by the end

By the end of Phase 1, the repo is “back on track” in a concrete and checkable way:

- there is exactly one canonical semantic migration lane
- HQ operational truth lives in one service package: `services/hq-ops`
- no semantic HQ truth remains under `packages/`
- no live code depends on `coordination` or `support-example`
- `plugins/agents/hq` remains only as a frozen compatibility lane for current Cloud Code/Codex sync-install behavior
- the active runtime plugin tree is canonical
- the active app shell is canonical
- old executable composition is no longer authoritative
- every changed seam is covered by structural proof, module-boundary proof, typecheck, and targeted tests

That is the condition required before Phase 2 can build substrate safely.

---

## Fixed Phase 1 decisions

These decisions are made here and do not reopen during implementation.

### 1. HQ Ops is one service with modules, not a family of leaf services

The target is one top-level service package:

```text
services/
  hq-ops/
    src/
      service/
        base.ts
        contract.ts
        impl.ts
        router.ts
        shared/        # earned only if needed
      modules/
        config/
        repo-state/
        journal/
        security/
      client.ts
      router.ts
      index.ts
```

This is one service.

It is not a `services/hq/...` family.
It is not `services/hq-ops/config`, `services/hq-ops/journal`, and so on as separate service packages.
It is not a hidden parent service with leaf services beneath it.

The service boundary is `hq-ops`.
The four module areas are service-internal modules.

Module-level exports are allowed when they remain module views of one service package, for example:

- `@rawr/hq-ops/config`
- `@rawr/hq-ops/repo-state`
- `@rawr/hq-ops/journal`
- `@rawr/hq-ops/security`

Those are module subpaths, not separate services.

### 2. `support-example` does not survive as live architecture in Phase 1

Decision:

- `support-example` is removed from the live runtime lane in Phase 1
- it is archived as evidence, not normalized and not carried forward
- Phase 2 introduces a smaller canonical replacement called `example-async`

What is preserved:

- one archive tag or branch holding the original code
- `docs/archive/support-example/lessons.md`
- fixture snapshots for run lifecycle states (`queued`, `running`, `completed`, `failed`)
- one representative trigger payload fixture
- the most valuable test cases translated into Phase 2 async acceptance criteria

What is not preserved as live architecture:

- `services/support-example`
- `plugins/workflows/support-example`
- any manifest membership or runtime registration for support-example

Rationale:

`support-example` did useful boundary-stressing work, but it is authored in the old grammar and it is no longer worth keeping alive during authority collapse. The clean move is to keep the lessons and replace the live proof slice later with a smaller canonical async example.

### 3. `packages/hq` does not survive as a shared package

Decision:

- `packages/hq` is dissolved in Phase 1
- nothing from `packages/hq` gets promoted into the HQ SDK unless it truly belongs in the SDK
- service-local logic moves into `services/hq-ops`
- tooling used by one owner moves to that owner
- genuinely shared non-SDK workspace/plugin-discovery support moves into a purpose-named support package: `packages/plugin-workspace`

What moves where:

- `packages/hq/src/journal/*` -> deleted after HQ Ops service cut
- `packages/hq/src/security/*` -> deleted after HQ Ops service cut
- `packages/hq/src/workspace/*` -> `packages/plugin-workspace`
- `packages/hq/src/install/*` -> owning plugin CLI tooling package
- `packages/hq/src/lifecycle/*` -> owning plugin CLI tooling package
- `packages/hq/src/scaffold/*` -> owning plugin CLI tooling package, where duplicate code already exists

At Phase 1 exit, there are no `@rawr/hq/*` imports left anywhere in the live lane.

### 4. One executable bridge is allowed, and only one

Phase 1 designates exactly one permissible executable bridge path between the new app shell and the old runtime implementation:

- `apps/hq/legacy-cutover.ts`

Phase 1 exit must land in one of two states only:

1. The bridge file does not exist.
2. The bridge file exists and obeys all of these rules:
   - it is a single file: `apps/hq/legacy-cutover.ts`
   - it is called only by `apps/hq/server.ts` and/or `apps/hq/async.ts`
   - it contains no semantic authority, only cutover wiring
   - it is the only surviving transitional executable seam at the end of Phase 1
   - Phase 2 Slice 0 deletes it explicitly

Separate from that executable bridge, `plugins/agents/hq` may remain as the one explicitly recorded Phase 1 compatibility carryover for current Cloud Code/Codex sync-install continuity.

No other shim, fallback registry, compatibility path, or alias bridge is allowed.

### 5. No design checkpoints remain inside Phase 1

Phase 1 is decision-complete.

The team on the ground may decide only:

- exact helper filenames inside approved seams
- exact test file placement
- exact implementation details inside already-approved boundaries
- small internal helper names

The team may **not** reopen:

- HQ Ops service shape
- support-example disposition
- `packages/hq` disposition
- coordination disposition
- plugin topology direction
- app shell authority direction
- whether bootgraph belongs in Phase 1

---

## Surfaces that will change

| Surface | Current problem | Phase 1 target |
| --- | --- | --- |
| `packages/control-plane` | semantic HQ truth disguised as package | folded into `services/hq-ops/modules/config` |
| `services/state` | correct shell, vague noun, wrong package boundary for final HQ ops shape | absorbed into `services/hq-ops/modules/repo-state` |
| `packages/journal` | semantic HQ truth disguised as package | folded into `services/hq-ops/modules/journal` |
| `packages/security` | semantic HQ truth disguised as package | folded into `services/hq-ops/modules/security` |
| `packages/hq` | junk-drawer + semantic smuggling layer | dissolved |
| `apps/cli` and `plugins/cli/plugins` imports | direct imports from old packages/facades | direct imports from HQ Ops or purpose-named tooling packages |
| `plugins/api/*` | old runtime topology | replaced by `plugins/server/api/*` |
| `plugins/workflows/*` | old runtime topology | replaced by `plugins/async/workflows/*` and `plugins/async/schedules/*` |
| `plugins/agents/*` | Cloud Code / Codex marketplace content inside a runtime-named root, with path-coupled sync/install semantics | keep `plugins/agents/hq` frozen in place for Phase 1; defer redesign and future home |
| `coordination` surfaces | false future still live | archived |
| `support-example` surfaces | old-grammar async proof slice still live | archived |
| `apps/hq/src/manifest.ts` and `apps/server/src/host-*` | split composition authority | replaced by canonical `apps/hq` app shell with old authority neutralized |
| root workspace and Nx inventory | encodes old roots and old projects | aligned to canonical roots and new project inventory |
| architecture proof scripts | tranche-shaped and prototype-shaped | invariant-shaped and phase-1 specific |

---

## What good looks like during Phase 1

Good Phase 1 execution feels like this:

- each slice removes a category of ambiguity instead of adding an adapter around it
- each slice leaves the repo simpler than before it started
- the team never has to ask “which version of this is the real one?” twice
- service truth moves first, runtime projection moves second, composition authority moves third
- verification is introduced before or with the change that depends on it
- parked lanes stop exerting architectural pressure
- docs describe only what is now stable, or explicitly archive what was removed

That is the operating feel.

---

## What done looks like

Phase 1 is done only when all of the following are true at the same time:

1. `services/hq-ops` exists as one canonical service package
2. `config`, `repo-state`, `journal`, and `security` live as modules inside `services/hq-ops`
3. `packages/control-plane`, `packages/journal`, `packages/security`, and `services/state` are gone from the live lane
4. `packages/hq` is gone
5. `packages/plugin-workspace` exists and owns only workspace/plugin-discovery support
6. no live imports remain from:
   - `@rawr/control-plane`
   - `@rawr/journal`
   - `@rawr/security`
   - `@rawr/hq`
   - `@rawr/state`
   - `@rawr/support-example`
   - `@rawr/coordination`
7. `coordination` is archived and absent from build, test, and runtime
8. `support-example` is archived and absent from build, test, and runtime
9. `plugins/agents/hq` remains only as a frozen compatibility lane for current Cloud Code/Codex sync-install behavior
10. no new `plugins/agents/*` roots or topology churn land during Phase 1
11. the live runtime plugin tree is canonical:
    - `plugins/server/api/*`
    - `plugins/async/workflows/*`
    - `plugins/async/schedules/*`
12. the live app shell is canonical:
    - `apps/hq/rawr.hq.ts`
    - `apps/hq/server.ts`
    - `apps/hq/async.ts`
    - `apps/hq/dev.ts`
13. old host composition is not authoritative anymore
14. Phase 1 exits with either no executable bridge or exactly one explicitly recorded executable bridge at `apps/hq/legacy-cutover.ts`
15. all phase-1 structural checks pass
16. all targeted typechecks pass
17. all targeted tests pass
18. parked lanes are explicitly frozen
19. phase-1 docs and archive docs are landed and coherent

That is the Phase 1 exit gate.

---

## Common verification band for every slice

Every slice must be fully verifiable before the next slice begins.

Every slice ends with all of these:

- root inventory check (`bun run sync:check`)
- module-boundary check (`bun run lint:boundaries`)
- targeted typecheck for every changed project
- targeted test run for every changed project
- targeted structural check(s) introduced for that slice
- targeted ripgrep or static ban checks for the authority being removed

If a needed structural check does not exist yet, it is created in the slice **before or with** the first code move that depends on it.

The Phase 1 structural suite must include, at minimum:

- `verify-phase1-ledger`
- `verify-no-live-coordination`
- `verify-no-live-support-example`
- `verify-agent-marketplace-lane-frozen`
- `verify-hq-ops-service-shape`
- `verify-no-old-operational-packages`
- `verify-no-legacy-hq-imports`
- `verify-canonical-plugin-topology`
- `verify-manifest-purity`
- `verify-entrypoint-thinness`
- `verify-no-legacy-composition-authority`
- `verify-parked-lane-frozen`

The Phase 1 Nx tag axes must be reduced to what this phase actually needs:

- `type:package`
- `type:service`
- `type:plugin`
- `type:app`
- `type:tool`
- `role:server`
- `role:async`
- `surface:api`
- `surface:workflows`
- `surface:schedules`
- `capability:*`

There is no `family:hq` or `family:hq-ops` tag in Phase 1 because HQ Ops is one service, not a family.

---

## Domino sequence overview

Phase 1 is sequenced so each slice makes the next slice easier.

```text
Slice 0  guardrails and ledger
  ->
Slice 1  archive false futures
  ->
Slice 2  reserve canonical HQ Ops service seam
  ->
Slice 3  move HQ operational truth into HQ Ops and rewire consumers
  ->
Slice 4  dissolve packages/hq and land purpose-named tooling support
  ->
Slice 5  cut canonical plugin topology
  ->
Slice 6  install canonical HQ app shell
  ->
Slice 7  neutralize old composition authority
  ->
Slice 8  ratchet proofs, close docs, freeze plateau
```

This order is deliberate.

Semantic truth is fixed before runtime projection.
Runtime projection is fixed before app composition authority.
App composition authority is fixed before old host authority is removed.
Proof ratchets are installed before the plateau is frozen.

---

## Slice 0 — Guardrails and Phase 1 ledger

### Goal and scope

Install the non-negotiable guardrails before code motion begins.

This slice:

- creates the one checked-in Phase 1 ledger
- defines what is live, archived, parked, or reclassified
- installs the first boundary-driven checks
- freezes the migration lane so new changes cannot land in the wrong places during the migration

This slice does **not** move semantic logic yet.
It does **not** change runtime behavior.

### What changes

Create and land:

- `docs/migration/phase-1-ledger.md`
- `scripts/phase-1/verify-phase1-ledger.mjs`
- `scripts/phase-1/verify-no-live-coordination.mjs`
- `scripts/phase-1/verify-no-live-support-example.mjs`
- `scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs`
- `scripts/phase-1/verify-no-old-operational-packages.mjs`
- `scripts/phase-1/verify-no-legacy-hq-imports.mjs`

Add explicit prohibitions to the ledger:

- no new code in `plugins/api/*`
- no new code in `plugins/workflows/*`
- no new `coordination` code
- no new `support-example` code
- no move or rename of `plugins/agents/hq` during Phase 1
- no new `plugins/agents/*` roots
- no new `@rawr/hq/*` imports
- no new imports from `@rawr/control-plane`, `@rawr/journal`, `@rawr/security`, or `@rawr/state`
- parked lanes may receive only compile fixes, rewires, deletions, and explicit unblockers

The ledger classifies at least these groups:

- `apps/hq`
- `apps/server`
- `apps/cli`
- `services/state`
- `services/example-todo`
- `services/support-example`
- `services/coordination`
- `packages/control-plane`
- `packages/journal`
- `packages/security`
- `packages/hq`
- `plugins/api/*`
- `plugins/workflows/*`
- `plugins/agents/*`
- `plugins/web/*`
- `plugins/cli/*`

### Verification

This slice is done when all of these pass:

- `bun run sync:check`
- `bun run lint:boundaries`
- the new phase-1 verification scripts
- a static scan proving the ledger classifications match the repo inventory

There is no runtime smoke requirement here because no behavior changed yet.

---

## Slice 1 — Archive false futures

### Goal and scope

Remove the prototypes and misplaced content that would keep pulling the repo back toward the wrong architecture.

This slice archives two things from the live lane and freezes one compatibility lane:

- `coordination`
- `support-example`
- the current Cloud Code / Codex marketplace plugin lane rooted at `plugins/agents/hq`

This slice does **not** build replacements.
It only removes false futures from the live authority model and preserves their useful lessons.

### What changes

#### Coordination

Archive and remove from the live lane:

- `services/coordination`
- `plugins/api/coordination`
- `plugins/workflows/coordination`
- coordination CLI surfaces
- coordination web/editor/test surfaces
- `.rawr/coordination`
- coordination-specific structural gates
- coordination project references from root scripts and live inventories

Preserve:

- archive tag or branch
- `docs/archive/coordination/lessons.md`
- explicit notes on durable-run patterns worth reusing later

#### Support-example

Archive and remove from the live lane:

- `services/support-example`
- `plugins/workflows/support-example`
- any manifest or host registration for support-example
- support-example-specific test targets from the live suite

Preserve:

- archive tag or branch
- `docs/archive/support-example/lessons.md`
- `docs/archive/support-example/fixtures/queued.json`
- `docs/archive/support-example/fixtures/running.json`
- `docs/archive/support-example/fixtures/completed.json`
- `docs/archive/support-example/fixtures/failed.json`
- `docs/archive/support-example/fixtures/trigger-event.json`
- a short section in the lessons doc translating the best service/workflow tests into Phase 2 `example-async` acceptance checks

Also update the live project inventory in this same slice so archived projects stop appearing in root build, typecheck, pretest, and structural target lists.

Reserve the future replacement name in documentation only:

- `example-async`

Do **not** create `example-async` yet.

#### Current Cloud Code / Codex marketplace compatibility lane

Keep in place during Phase 1:

- `plugins/agents/hq`

Do not:

- move it into `packages/`
- rename the `plugins/agents` root
- add new plugin directories under `plugins/agents/*`
- let this lane steer the canonical runtime plugin topology cut

Record the redesign as an explicit next-stage question during the end-of-milestone readjustment review.

### Verification

This slice is done when all of these pass:

- `verify-no-live-coordination`
- `verify-no-live-support-example`
- `verify-agent-marketplace-lane-frozen`
- root `sync:check`
- targeted typecheck for changed project inventory
- `bun run rawr plugins sync @rawr/plugin-hq --dry-run`
- static scans proving there are no live imports or registrations referencing archived coordination or support-example surfaces

The live lane is allowed to have no async proof slice at the end of this slice.
That is intentional.

---

## Slice 2 — Reserve the canonical HQ Ops service seam

### Goal and scope

Create the one canonical service home for HQ operational truth before any operational truth is moved.

This slice:

- creates `services/hq-ops`
- establishes the canonical service shell and module layout
- uses the current `services/state` shell as the structural starting point
- reserves the places where `config`, `repo-state`, `journal`, and `security` will land

This slice does **not** move production logic yet.
It does **not** rewire consumers yet.

### What changes

Create:

```text
services/hq-ops/
  package.json
  src/
    service/
      base.ts
      contract.ts
      impl.ts
      router.ts
      shared/
    modules/
      config/
      repo-state/
      journal/
      security/
    client.ts
    router.ts
    index.ts
  test/
```

Rules locked here:

- `hq-ops` is the one service boundary
- modules are service-internal
- `service/shared` is allowed only when clearly earned
- module-local code is the default
- subpath exports may expose thin module views, but authority stays inside the single package

Create placeholder module-level seams for all four modules so later moves have reserved homes.

### Verification

This slice is done when all of these pass:

- `verify-hq-ops-service-shape`
- targeted typecheck for `@rawr/hq-ops`
- targeted service-shell test or structural test proving the new service package matches the canonical shell
- root `sync:check`

There are still no consumer changes in this slice.
That is intentional.

---

## Slice 3 — Move HQ operational truth into `services/hq-ops` and rewire active consumers

### Goal and scope

Move the four owning HQ operational boundaries into the HQ Ops service and cut consumers directly to the new service boundary.

This slice is the semantic heart of Phase 1.

It does:

- move config truth
- move repo-state truth
- move journal truth
- move security truth
- rewire active CLI/server/tooling consumers directly to the new service package
- remove the old owning packages from the live lane

It does **not** change plugin topology yet.
It does **not** change app shell authority yet.

### What changes

#### 3A. `config` module

Move the logic from `packages/control-plane` into:

```text
services/hq-ops/src/modules/config/
```

This module becomes the canonical owner of:

- config schema
- config normalization
- layered merge semantics
- validation
- workspace/global config resolution

Update active consumers:

- `apps/server/src/bootstrap.ts`
- `apps/cli/src/commands/config/show.ts`
- `apps/cli/src/commands/config/validate.ts`
- `plugins/cli/plugins` sync/config commands
- `packages/agent-sync` layered config usage

#### 3B. `repo-state` module

Move the current `services/state` logic into:

```text
services/hq-ops/src/modules/repo-state/
```

This module becomes the canonical owner of:

- `.rawr/state/state.json`
- authority-root resolution
- locking
- plugin enabled/disabled state

Delete `services/state` from the live lane once consumers are rewired.

#### 3C. `journal` module

Move the logic from `packages/journal` into:

```text
services/hq-ops/src/modules/journal/
```

This module becomes the canonical owner of:

- journal events/snippets
- search/index behavior
- semantic search settings that affect journal behavior
- repo-local journal storage

Update active consumers:

- `apps/cli/src/index.ts`
- journal commands
- reflect command
- any workflow/tooling commands that write snippets directly

#### 3D. `security` module

Move the logic from `packages/security` into:

```text
services/hq-ops/src/modules/security/
```

This module becomes the canonical owner of:

- scan/gate/report behavior
- security findings model
- repo/staged scan mode handling
- report persistence

Update active consumers:

- CLI security commands
- plugin CLI security helpers

#### 3E. Consumer cut rules

Every rewritten consumer must follow one rule:

- cut directly to `@rawr/hq-ops` or one of its thin module subpaths

Do **not** introduce any new transitional package facade.

#### 3F. Old owners removed

Remove these from the live lane at the end of the slice:

- `packages/control-plane`
- `services/state`
- `packages/journal`
- `packages/security`

### Verification

This slice is done when all of these pass:

- `verify-no-old-operational-packages`
- static scan proving there are no live imports from the removed package names
- targeted typecheck for:
  - `@rawr/hq-ops`
  - `@rawr/server`
  - `@rawr/cli`
  - `@rawr/plugin-plugins`
  - `@rawr/agent-sync`
- targeted tests covering:
  - config merge and validation determinism
  - repo-state locking and atomic mutation
  - journal write, tail, and search behavior
  - security scan, gate, and report persistence behavior
- root `sync:check`
- root `lint:boundaries`

Behavior continuity must be proven here.
No later slice is allowed to “fix it up later.”

---

## Slice 4 — Dissolve `packages/hq` and land purpose-named tooling boundaries

### Goal and scope

Finish the package/service cleanup by deleting the ambiguous shared HQ package.

This slice:

- moves the remaining non-service, non-SDK utilities into explicit homes
- introduces exactly one shared purpose-named tooling package where sharing is real
- deletes `packages/hq`

This slice does **not** move anything into the HQ SDK unless it belongs to the SDK’s public authoring/runtime shell.

### What changes

#### 4A. Shared workspace/plugin-discovery support

Create:

```text
packages/plugin-workspace/
```

Move into it:

- workspace root discovery
- workspace plugin discovery
- workspace plugin manifest contract parsing
- plugin ID resolution helpers

This package exists because those helpers are genuinely shared across:

- `apps/cli`
- `plugins/cli/plugins`
- internal tooling that manipulates workspace plugin inventory

It is a purpose-named support package.
It is not a generic HQ package.

#### 4B. Tooling that belongs to plugin CLI stays with plugin CLI

Move or keep in `plugins/cli/plugins/src/lib`:

- install state helpers
- lifecycle/scratch-policy helpers
- scaffold helpers
- plugin-install reconcile helpers

If code is used only by plugin CLI tooling, it stays with plugin CLI tooling.

#### 4C. Delete semantic facades

Delete:

- `packages/hq/src/journal/*`
- `packages/hq/src/security/*`

They are invalid after Slice 3.

#### 4D. Delete the package

Delete `packages/hq` entirely after imports are gone and replacement homes exist.

### Verification

This slice is done when all of these pass:

- `verify-no-legacy-hq-imports`
- static scan proving there are no `@rawr/hq/*` imports left
- targeted tests moved from `packages/hq` now pass in their new owners
- targeted typecheck for:
  - `@rawr/plugin-workspace`
  - `@rawr/cli`
  - `@rawr/plugin-plugins`
- root `sync:check`
- root `lint:boundaries`

At the end of this slice, `packages/hq` is gone.

---

## Slice 5 — Cut the canonical plugin topology

### Goal and scope

Move the live runtime projection tree to the canonical role-first topology.

This slice:

- installs canonical plugin roots
- moves the remaining live plugin packages into those roots
- updates workspaces, project inventory, tags, and imports
- removes the old roots from the live lane

This slice does **not** implement new plugin builders.
It does **not** build Phase 2 runtime substrate.

### What changes

Create and use these roots:

```text
plugins/
  server/
    api/
  async/
    workflows/
    schedules/
```

Rules:

- `internal`, `consumers`, `web/app`, `cli/commands`, and `agent/*` are not created unless Phase 1 actually needs them
- if the live async lane is empty after archiving coordination and support-example, `plugins/async/workflows` and `plugins/async/schedules` may exist as reserved empty roots

Move live server projections from:

- `plugins/api/*` -> `plugins/server/api/*`

Remove old roots from the live lane:

- `plugins/api/*`
- `plugins/workflows/*`

Update:

- root `package.json` workspaces
- build/typecheck/test project lists
- Nx tags and project inventory
- any import paths and contract drift tests that still point at old roots

### Verification

This slice is done when all of these pass:

- `verify-canonical-plugin-topology`
- static scan proving there are no live imports from old plugin roots
- path/tag coherence checks for moved plugins
- root `sync:check`
- targeted typecheck for moved plugins, `@rawr/hq-app`, and `@rawr/server`

At the end of this slice, there is only one canonical runtime plugin topology for the live server/async lane. The frozen `plugins/agents/hq` compatibility lane remains in place and is explicitly out of scope for this topology cut.

---

## Slice 6 — Install the canonical HQ app shell

### Goal and scope

Install the new app front door and make it the one canonical composition home.

This slice:

- creates the canonical `apps/hq` shell
- makes the manifest own role/surface membership
- makes entrypoints own process shape
- reserves the surfaces that Phase 2 will realize

This slice does **not** implement bootgraph, runtime compiler, or harnesses.

### What changes

Create:

- `apps/hq/rawr.hq.ts`
- `apps/hq/server.ts`
- `apps/hq/async.ts`
- `apps/hq/dev.ts`

Rules locked here:

- the manifest is the only composition authority
- the entrypoints are thin and own only process shape
- Phase 1 only needs `server`, `async`, and `dev`
- `web`, `cli`, and `agent` remain out of scope and may be absent or reserved only

The manifest must author explicit role/surface membership.
Even if the async surfaces are empty in Phase 1, the role seam is reserved here.

Retire the old `apps/hq/src/manifest.ts` model from live authority.

### Verification

This slice is done when all of these pass:

- `verify-manifest-purity`
- `verify-entrypoint-thinness`
- targeted typecheck for `@rawr/hq-app`
- app-shell smoke tests proving the new files are the authoritative front door
- root `sync:check`

At the end of this slice, the new app shell exists and is authoritative.

---

## Slice 7 — Neutralize old executable composition authority

### Goal and scope

Remove the old host composition path as a live authority model.

This slice:

- stops `apps/server/src/host-composition.ts`, `host-seam.ts`, and `host-realization.ts` from being authoritative
- routes execution through the new app shell
- uses only the designated executable bridge path when a bridge is required at all

This slice does **not** build the real runtime substrate.
It only removes authority from the old path.

### What changes

Allowed end states for this slice:

### Preferred end state

Delete or fully quarantine the old host composition files from the live lane.

### Acceptable end state

Keep one bridge only:

- `apps/hq/legacy-cutover.ts`

Rules for that file:

- it can only translate the new entrypoint call into the old server/bootstrap runtime
- it cannot own manifest membership
- it cannot own plugin discovery rules
- it cannot own service truth or runtime topology
- it is the only transitional seam left at the Phase 1 boundary

Forbidden outcomes:

- two manifests
- two registries
- two executable composition paths
- old host files still imported directly by multiple surfaces
- old host files treated as the real runtime and the new app shell treated as decoration

### Verification

This slice is done when all of these pass:

- `verify-no-legacy-composition-authority`
- static scan proving the old host files are no longer direct authority surfaces
- one smoke boot path through `apps/hq/server.ts`
- one smoke boot path through `apps/hq/async.ts` if the async role is reserved/live in this phase
- targeted typecheck for `@rawr/server` and `@rawr/hq-app`
- root `sync:check`

If `apps/hq/legacy-cutover.ts` exists at the end of the slice, it must be listed explicitly in the docs as the sole phase-boundary executable bridge and scheduled for deletion in Phase 2 Slice 0. Otherwise, no executable bridge survives the slice.

---

## Slice 8 — Ratchet proofs, close docs, freeze the plateau

### Goal and scope

Turn the migration state into a stable plateau instead of a loose collection of file moves.

This slice:

- replaces tranche-shaped proof names with invariant-shaped proof names
- freezes parked lanes
- lands archive docs and current-state docs
- closes any temporary loops left open by earlier slices
- marks the single phase boundary bridge if it still exists

This slice does **not** reopen any structural decision.

### What changes

#### Proof ratchet

Promote the Phase 1 checks into the normal migration gate set.

Remove or retire tranche-specific checks that no longer describe the repo accurately.

#### Parked-lane freeze

Mark these as parked and frozen:

- `apps/web`
- `apps/cli` architecture work (consumer rewires already allowed; new architecture work is not)
- `plugins/web/*`
- `plugins/cli/*` except direct rewires required by the slices above

#### Documentation

Land only docs that are now coherent:

- `docs/migration/phase-1-ledger.md`
- `docs/archive/coordination/lessons.md`
- `docs/archive/support-example/lessons.md`
- `docs/migration/phase-1-current-state.md`
- `docs/migration/phase-2-entry-conditions.md`

Do **not** update Phase 2 or final architecture docs as if runtime substrate were already built.

#### Phase boundary note

Record the executable bridge outcome explicitly:

- if `apps/hq/legacy-cutover.ts` exists, record exactly one executable-bridge cleanup item: `Phase 2 Slice 0: delete apps/hq/legacy-cutover.ts`
- if `apps/hq/legacy-cutover.ts` does not exist, record that no executable bridge crosses the Phase 1 -> Phase 2 boundary

Also record exactly one compatibility note:

- `plugins/agents/hq` remains frozen in place for marketplace sync-install continuity and is the only allowed non-executable carryover into the next stage

No other cleanup debt is allowed to leak across the boundary.

### Verification

This slice is done when all of these pass:

- all Phase 1 structural checks
- root `sync:check`
- root `lint:boundaries`
- targeted typecheck for every changed live project
- targeted tests for every changed live project
- static scan proving parked-lane freeze rules are in place
- doc review proving no transitional state is described as final

At the end of this slice, the plateau is frozen.

---

## Transitional state policy inside Phase 1

Phase 1 allows transitional states only between slices.

The only transitional executable state allowed across the Phase 1 -> Phase 2 boundary is the single designated bridge path:

- `apps/hq/legacy-cutover.ts`

The only non-executable compatibility carryover allowed across the boundary is the explicitly frozen marketplace lane:

- `plugins/agents/hq`

Everything else must be cleaned up before the Phase 1 plateau is declared done.

That means Phase 1 may not end with any of these still live:

- old package facades
- old plugin roots
- live coordination
- live support-example
- live `packages/hq`
- multiple composition authorities
- multiple manifests
- multiple registries

---

## Documentation and loop-closure rules

Each slice closes its own loops.

That means:

- if code is archived, archive docs land in the same slice
- if a proof rule becomes stale, it is renamed or removed in the same slice that invalidates it
- if a package is removed, import rewires and inventory changes happen in the same slice
- if a new seam is reserved, the ownership doc for that seam lands when the seam becomes real enough to be truthful

Documentation rules:

- archive docs may describe removed prototypes as archived evidence
- current-state docs may describe the stable Phase 1 plateau
- no doc may describe bootgraph/runtime/compiler/harness as implemented in Phase 1
- no doc may describe support-example as live after Slice 1
- no doc may describe `packages/hq` as live after Slice 4

---

## Explicit Phase 2 handoff from this plan

Phase 1 hands Phase 2 a clean starting surface.

When Phase 1 is complete, Phase 2 starts from this exact condition:

- one canonical app shell exists
- one canonical runtime plugin tree exists
- HQ Ops truth exists as one real service with modules
- there are no false futures left in the live lane
- the executable bridge outcome is explicit: either no executable bridge survives, or the only surviving executable bridge is `apps/hq/legacy-cutover.ts`
- the only allowed non-executable compatibility carryover is the frozen `plugins/agents/hq` marketplace lane
- `example-async` is the reserved next async proof slice name

Phase 2 then begins by deleting the bridge when present and replacing it with the real runtime substrate.

---

## Final Phase 1 outcome

When this mini plan is executed successfully, the repo should feel like this:

- there is one answer to what a service is
- there is one answer to where HQ operational truth lives
- there is one answer to what counts as runtime projection
- there is one answer to what the app front door is
- examples and prototypes no longer steer the architecture
- the repo can start Phase 2 without first untangling more semantics

That is the only purpose of Phase 1.

And that is enough.
