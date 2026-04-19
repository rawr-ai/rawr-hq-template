# RAWR HQ final three-phase migration plan

## Executive call

This plan is built around one hard decision: the active migration lane is **server + async + services + runtime/tooling packages**. The repo only gets simpler if semantic truth is allowed to live in services and everything else is forced to become either runtime projection, app composition, or true support/tooling.

That means:

- `server` and `async` are the only required runtime roles for these three phases.
- `web`, `cli`, and agent-facing content do not get to steer the core runtime model.
- `coordination` does not survive as a live architectural noun.
- no dual authority model is allowed to persist.
- no long-lived fallback registry, shim tree, or compatibility layer is allowed to persist.
- HQ-only operational truth does **not** get a package exemption just because there are no external users.
- the repo must stop disguising service truth as packages.

The semantic correction is explicit:

```text
services/
  hq-ops/
    config/
    repo-state/
    journal/
    security/
```

`services/hq-ops` is the canonical HQ operational service package for this migration.

The three plateaus are:

1. **Recovery / authority collapse**
   - the repo stops being semantically mixed
   - one canonical app shell exists
   - one canonical plugin topology exists
   - HQ operational truth is no longer hidden inside packages
   - coordination is archived, not migrated
   - the repo has one authoritative migration lane

2. **Minimal canonical runtime shell**
   - the app boots canonically through `defineApp(...)`, entrypoints, runtime compiler, bootgraph, process runtime, and harnesses
   - `server` and `async` are real
   - new capabilities can be authored manually in the final architecture

3. **Generator-ready capability foundry**
   - new business capabilities can be scaffolded safely by humans or AI agents
   - the graph, structural checks, and templates force canonical output
   - review shifts from architecture invention to business logic

---

## Problem statement

The repo is not blocked because the target architecture is unknown.

The repo is blocked because it is simultaneously carrying:

- more than one composition authority model
- more than one plugin topology
- more than one runtime authoring grammar
- and more than one answer to the question “what counts as a service?”

That last problem matters more than it first appears.

The architecture itself is still correct:

- `packages/` are support matter
- `services/` are semantic capability truth
- `plugins/` are runtime projection
- `apps/` are app identity, manifest, and entrypoints

What is wrong is the current repo state.

Several HQ operational capabilities already behave like services today, but they are implemented as packages and then tunneled into CLI/server surfaces through direct imports or facades. That creates a false semantic picture. It makes the repo look flatter and simpler than it really is, while causing ownership drift and repeated logic burial.

The repo-grounded examples are clear:

- `packages/journal` owns `.rawr/journal/*`, writes events/snippets, manages the SQLite index, and supports retrieval/search semantics.
- `packages/security` owns security scan/gate/report logic and writes `.rawr/security/latest.json` plus timestamped reports.
- `packages/control-plane` owns the HQ config schema, layered resolution, merge semantics, and validation for `rawr.config.ts` and `~/.rawr/config.json`.
- `services/state` already owns `.rawr/state/state.json`, locking, and authoritative repo-state mutation.
- `packages/hq` re-exports journal/security facades and mixes them into workspace/install/lifecycle/scaffold support, which hides the real boundary instead of clarifying it.
- `apps/cli` and `plugins/cli/plugins` consume these capabilities directly, which proves they are not just dormant helper libraries.
- `apps/server` already depends on HQ config loading during startup, which proves at least one of these capabilities participates in app/runtime boot.

So the correct move is not to weaken the ontology.

The correct move is:

**fix the repo so it obeys the ontology.**

That means:

- semantic HQ truth moves into services
- support/tooling packages get narrowed to true support/tooling
- runtime projection gets rebuilt once under canonical seams
- foundry automation lands only after the shell is real

---

## Why this sequence is correct

The repo currently carries these simultaneous truths:

- `apps/hq/src/manifest.ts` is trying to act like app composition authority.
- `apps/server/src/host-composition.ts`, `host-seam.ts`, and `host-realization.ts` still own executable composition.
- `packages/bootgraph` exists only as a reservation.
- plugin taxonomy is still old (`plugins/api/*`, `plugins/workflows/*`, `plugins/web/*`, `plugins/cli/*`).
- `plugins/agents/*` is not runtime projection at all; it is content/tooling living inside a runtime root.
- `services/example-todo` is close to the target shell, `services/support-example` is not, and `services/coordination` is a live prototype that mixes incompatible concepts.
- HQ operational truths are split across `packages/control-plane`, `packages/journal`, `packages/security`, `services/state`, CLI command code, and `packages/hq` facades.
- current proof machinery still encodes tranche vocabulary and coordination-specific obligations instead of invariant-named architectural checks.

So the correct move is not “implement more of the future.”

The correct move is:

**collapse semantic ambiguity first, then build the runtime shell once, then automate it.**

That sequence gives four concrete benefits.

First, it reduces state space immediately. There is one answer to composition authority, one answer to plugin topology, and one answer to service truth.

Second, it prevents false futures. When HQ operational truth stays buried in packages, every later generator and every later plugin builder learns the wrong lesson.

Third, it keeps the runtime shell narrow. The compiler, bootgraph, and process runtime should only be built after the semantic picture is clean.

Fourth, it makes the foundry trustworthy. Generators can only be safe if the public targets they emit into are already canonical.

---

## What is fixed and load-bearing

These decisions are locked and should not be reopened.

### Canonical ontology

- `packages/` = support matter and tooling support
- `services/` = semantic capability truth
- `plugins/` = runtime projection
- `apps/` = app identities, manifests, entrypoints

### Stable architecture

- `app -> manifest -> role -> surface`

### Runtime realization

- `entrypoint -> runtime compiler -> bootgraph -> process runtime -> harness -> process -> machine`

### Ownership laws

- services own semantic truth
- plugins own runtime projection
- apps own composition authority
- bootgraph owns lifecycle only
- repositories are service-internal, not top-level
- service-family parents are namespaces only, not owners
- HQ-only semantic truth is still service truth

### Topology laws

- repo structure follows semantic architecture, not deployment shape
- plugin tree is role-first and surface-explicit
- harnesses do not define ontology
- shared infrastructure is not shared semantic ownership
- a family directory under `services/` may group leaf services, but it may not accumulate hidden ownership

### Control-plane law

There is no fake generic top-level control-plane layer.

That does **not** forbid HQ operational services.

It means the correct home for HQ configuration, state, journal, and security truth is still under `services/`, not under a new top-level noun and not under ambiguous support packages.

### Runtime subsystem stance

- `RAWR owns semantic meaning. Effect owns execution mechanics. Boundary frameworks keep their jobs.`
- the runtime subsystem is hidden beneath the public RAWR shell
- `packages/runtime/` is the canonical home for the runtime subsystem family
- the runtime subsystem is implemented on Effect; that is canonical inside the subsystem and hidden outside it
- one started process owns one root `ManagedRuntime`
- oRPC remains the canonical service boundary; Inngest remains the canonical durable async harness; Elysia remains the default server harness
- raw Effect vocabulary (`Layer`, `Context.Tag`, `ManagedRuntime`, `Effect.Service`, etc.) stays quarantined inside `packages/runtime/*`

### Enforcement direction

- `canon -> graph -> proof -> ratchet`

These are the bones of the migration.

---

## What is intentionally left open

These details are important, but they are not load-bearing and should not block the phases:

- exact npm package names
- whether `packages/hq` is renamed or split after semantic facades are removed
- exact helper filenames inside runtime packages
- whether generators are exposed through Nx, CLI, or both
- exact decomposition of runtime compiler internals
- exact internal structure of `packages/runtime/substrate` subdirectories
- exact internal shape of runtime-owned Effect services and low-level tags
- exact runtime harness wrapper shapes around Elysia and Inngest
- whether `web` and `cli` builders land during phase 3 or immediately after
- when parked lanes receive their canonical rebuilds
- exact internal subpath structure inside each HQ ops service
- exact schema module decomposition inside the runtime substrate
- exact Effect-level internal service dependency graph (the illustrative graph in the runtime subsystem spec is illustrative, not normative)

The team on the ground is allowed to fill these in.

They are **not** allowed to reopen ontology, ownership, family boundaries, or phase boundaries.

---

## Semantic correction: HQ-only does not mean package

The package/service split remains the right architectural split.

What changes here is the classification of current repo contents.

The rule is simple:

```text
internal-only does not mean support matter
HQ-only does not mean package
repo-local truth is still truth
```

If code owns durable semantic truth, canonical writes, or canonical validation/merge semantics for HQ, it belongs in `services/` even if:

- only HQ uses it
- only the CLI uses it right now
- it currently lives in a package
- it is still in-process only

The corrected HQ operational service package is:

```text
services/
  hq-ops/
    config/
    repo-state/
    journal/
    security/
```

This is one service package with reserved internal modules:

- `config` owns config schema, layered resolution, normalization, and validation
- `repo-state` owns repo-local plugin state and locking
- `journal` owns journal events/snippets/index/search semantics
- `security` owns scan/gate/report semantics

`services/hq-ops` owns the HQ operational boundary.

The internal module directories may contain local implementation seams and notes.

They may not independently own:

- repositories
- migrations
- business policies
- write authority
- service contracts

---

## Repo-grounded disposition of current projects

### Promote and keep as canonical HQ operational services

These are not support packages for this migration. They are semantic HQ capability truth.

| Current home | Target home | Why it is a service |
| --- | --- | --- |
| `packages/control-plane` | `services/hq-ops` (`config` module) | owns config schema, validation, layered load/merge semantics, and HQ runtime policy inputs |
| `services/state` | `services/hq-ops` (`repo-state` module) | already owns `.rawr/state/state.json`, locking, authority resolution, and canonical repo-state reads/writes |
| `packages/journal` | `services/hq-ops` (`journal` module) | owns `.rawr/journal/*`, event/snippet writes, indexing, and retrieval/search semantics |
| `packages/security` | `services/hq-ops` (`security` module) | owns security scan/gate/report truth and writes `.rawr/security/*` |

### Keep and build on

These are already close enough to the target to be active inputs:

- `services/example-todo` — keep as the golden service shell
- `packages/hq-sdk` — keep, but refactor its public API toward the canonical SDK family
- `packages/core` — keep as support matter
- `packages/bootgraph` — keep, but phase 2 moves it under `packages/runtime/bootgraph` and turns it from reservation into real lifecycle infrastructure backed by the Effect runtime substrate
- `packages/orpc-client` — keep as support matter
- `services/session-intelligence` — promoted canonical session domain service for session catalog, resolution, transcript extraction, and search semantics
- `services/agent-config-sync` — keep as the canonical sync service truth
- `packages/ui-sdk` — keep as support matter

### Archive and replace later

- `services/support-example`
  - it does not survive the live lane in Phase 1
  - archive it beside `coordination` instead of normalizing it forward
  - if later work needs an async exemplar, introduce a new canonical example after the cleanup plateau instead of carrying `support-example` forward

### Narrow or split because the current home is wrong

- `packages/hq`

`packages/hq` is currently a mixed tooling facade over:

- workspace helpers
- install state helpers
- lifecycle helpers
- scaffold helpers
- journal/security facades

That must stop.

By the end of phase 1:

- journal/security re-exports are gone
- `packages/hq` contains tooling only
- if the remaining surface is still confusing, it gets renamed or split

The key rule is:

**do not let `packages/hq` remain a junk drawer that blurs service truth, runtime support, and tooling.**

### Archive and remove from the live architecture

- `services/coordination`
- `plugins/api/coordination`
- `plugins/workflows/coordination`
- coordination-specific CLI surfaces
- coordination-specific visual/web tests
- coordination-specific structural gates and inventories
- `.rawr/coordination` as a live persistence model

The correct posture is:

**delete it as architecture, preserve it as evidence.**

The reusable lessons are durable-run lessons only:

- queued -> running -> completed/failed lifecycle
- caller-supplied idempotent `runId`
- timeline append points around durable steps
- trace/correlation plumbing
- non-critical finished-hook guardrails

The desk/workflow ontology does not survive.

### Reclassify because the current home is wrong

- `plugins/agents/*`
  - these are Cloud Code / Codex marketplace content packs and workflows, not canonical runtime projection packages
  - they do not belong under the long-term canonical runtime plugin tree
  - but the current sync/install/discovery system is path-coupled to `plugins/agents/*`
  - therefore Phase 1 keeps `plugins/agents/hq` in place as a frozen compatibility lane for operational continuity
  - the reclassification and future home are deferred to the next stage, once discovery, scope, install, and retirement semantics can change together

### Park so they stop steering the core migration

- `apps/web`
- `apps/cli`
- most of `plugins/web/*`
- most of `plugins/cli/*`

These may continue to exist, but they are parked lanes, not core architecture truth for phases 1–3.

They may receive only:

- deletion
- path updates required by canonical cuts
- compile fixes
- explicit work needed to unblock the active lane
- direct rewires from removed package facades to new service boundaries

They do **not** get to influence the foundational runtime model.

### Transitional support matter after service promotion

These remain support/tooling until they clearly earn a different home:

- `packages/hq` workspace/install/lifecycle/scaffold support after semantic stripping
- `apps/cli/src/lib/hq-status.ts`
- `scripts/dev/hq.sh`
- runtime compiler / bootgraph / harness packages

The reason is not “they are internal.”

The reason is that they do **not** currently own durable semantic HQ truth in the same way config, repo-state, journal, and security do.

They are support, tooling, process-manager mechanics, or external sync scaffolding.

---

## HQ operational service-family rules

The HQ operational service root is:

```text
services/hq-ops/
```

Its role is service ownership with internal module organization.

The service root may contain:

- `README.md`
- diagrams
- family-level docs
- optional tooling metadata

The internal modules must not be treated as independently owned services.

### `services/hq-ops` `config` module

This module owns:

- `rawr.config.ts` schema and normalization
- `~/.rawr/config.json` schema and normalization
- layered merge semantics
- validation errors and policy vocabulary
- the canonical resolved config model used by HQ runtime and tooling

This module does **not** become a separate service or a new top-level control plane.

### `services/hq-ops` `repo-state` module

This module owns:

- `.rawr/state/state.json`
- authority root resolution
- locking and atomic mutation
- plugin enabled/disabled state truth

The generic leaf name `state` is too vague for the future repo. The module should be named for what it actually owns.

### `services/hq-ops` `journal` module

This module owns:

- `.rawr/journal/events/*.json`
- `.rawr/journal/snippets/*.json`
- `.rawr/journal/index.sqlite`
- journal indexing and search semantics
- semantic search configuration inputs and behavior

The SQLite index is an implementation detail of the service package, not a reason to keep the capability in `packages/`.

### `services/hq-ops` `security` module

This module owns:

- `.rawr/security/latest.json`
- `.rawr/security/report-*.json`
- security scan/gate/report policy
- secret scan findings
- dependency audit findings
- untrusted script findings

The Bun and Git wrappers remain service-internal implementation details.

### Future candidates, explicitly deferred

The following are **not** promoted now, but may be reconsidered later if they become true multi-surface HQ capabilities with stable truth and invariants:

- install/link state
- richer HQ runtime admin state
- remote HQ observability/admin capabilities

That decision does not belong in phases 1–3.

---

## Service-classification rubric

Something belongs in `services/` when all or nearly all of the following are true:

1. it owns durable semantic truth
2. it owns canonical writes, locks, reports, or authoritative validation/merge semantics
3. it benefits from a transport-neutral boundary
4. it is likely to be consumed by more than one surface over time, even if only one surface exists today
5. calling it a service reduces ambiguity rather than increasing it

By that rubric:

- `hq-ops` qualifies as one service package
- its `config`, `repo-state`, `journal`, and `security` modules are internal seams, not separate services
- `example-todo` qualifies
- `coordination` fails because it mixes multiple truths
- `agent-config-sync` qualifies and is promoted in this migration
- `session-intelligence` qualifies and is promoted in this migration; the earlier `session-tools` support-package classification was superseded because the code owns session domain models, provider normalization, resolution, extraction, search ranking, and cache/index policy
- workspace/install/lifecycle/scaffold tooling do not qualify in this migration

A critical clarification:

```text
multiple runtime surfaces is a scale path, not a day-one requirement
```

A service does not need HTTP and async and CLI on day one to earn service status.

It only needs to be semantic truth first.

---

## The three plateaus

### Plateau 1 — semantic authority is stable

At the end of phase 1:

- there is one canonical app shell
- there is one canonical runtime plugin topology for the server/async live lane
- coordination is not live
- HQ operational truth is in `services/hq-ops`, not in packages
- new live-lane code can only land in canonical places, with `plugins/agents/hq` preserved only as a frozen compatibility lane
- the repo is no longer semantically mixed

The runtime may still use one temporary localized cutover seam internally, but there is no dual authority and no dual authoring model.

### Plateau 2 — runtime authority is stable

At the end of phase 2:

- `server` and `async` boot through the canonical runtime shell
- bootgraph is real
- runtime compiler is real
- process runtime is real
- harnesses are real
- new capabilities can be authored manually without bespoke host glue

### Plateau 3 — capability creation is stable

At the end of phase 3:

- generators target canonical service/plugin/app seams
- graph and proof gates reject non-canonical output
- service-family nesting is generator-aware
- AI agents can scaffold new capabilities safely
- review is about behavior, not repo architecture

---

## Phase 1 — Recovery / authority collapse

## Purpose

Phase 1 reduces the state space.

It is the phase that makes the rest of the work tractable.

It does **not** finish the runtime platform.

It finishes the semantic cutover, removes the most dangerous mixed-state artifacts, and establishes one clean migration lane.

## Non-negotiable phase rules

1. prefer hard cuts over bridge layers
2. if a temporary bridge is used, there may be only one, and it must sit strictly downstream of the new shell
3. HQ operational truth belongs under `services/`, not `packages/`
4. do not create a new fake top-level control-plane layer
5. do not migrate coordination forward
6. do not let parked lanes influence active-lane architecture
7. do not build agent/steward/OpenShell infrastructure here
8. do not keep both old and new plugin roots live at once
9. do not allow `packages/hq` to keep semantic facades once the owning services exist

## What phase 1 must accomplish

### 1. Freeze a single classification ledger

Create one checked-in ledger that classifies every active project as one of:

- keep
- normalize
- archive
- reclassify
- park

This ledger is not ceremony.

It is the anti-drift device that prevents agents from reviving dead structures or preserving semantic ambiguity by accident.

It must explicitly classify:

- active services
- HQ operational services
- active plugin packages
- support packages
- parked apps
- archived coordination artifacts
- non-runtime content that must leave `plugins/`

### 2. Remove coordination from the live architecture

This is a hard cut.

The repo should preserve coordination in exactly two ways:

- a snapshot/tag/archive branch for historical reference
- a short checked-in lessons document describing the reusable patterns and the traps

The repo should **not** preserve coordination as any of the following:

- a live service boundary
- a live API plugin
- a live workflow plugin
- a live `.rawr/coordination` persistence model
- a live CLI surface
- a live visual/editor surface
- a live structural proof dependency

The only coordination learnings worth carrying forward are generic durable-run patterns.

Those are archived as lessons first and extracted only when a future async capability explicitly earns them.

### 3. Create the HQ operational service package and move the four owning boundaries

This cut happens in phase 1, not later.

Create:

```text
services/
  hq-ops/
    config/
    repo-state/
    journal/
    security/
```

#### 3a. `config`

Move the current `packages/control-plane` truth into the service shell.

The service must own:

- config contract and normalized types
- layered load/merge semantics
- validation policy
- workspace/global config resolution

`rawr.config.ts` and `~/.rawr/config.json` remain external artifacts, but the semantic authority over reading, merging, and validating them lives in the service.

#### 3b. `repo-state`

Rename and normalize the current `services/state` boundary.

The service must continue to own:

- repo state model
- authority-root resolution
- locking and atomic mutation
- plugin enablement state

The rename is not cosmetic.

It removes one of the vaguest nouns in the repo and replaces it with the actual semantic owner.

#### 3c. `journal`

Move the current `packages/journal` truth into the service shell.

The service must own:

- event/snippet persistence
- indexing/search semantics
- semantic-search-related service behavior
- durable journal artifacts under `.rawr/journal/*`

CLI auto-journaling remains a projection concern. The service owns the truth behind it.

#### 3d. `security`

Move the current `packages/security` truth into the service shell.

The service must own:

- scan/gate/report policy
- findings model
- report persistence
- repo/staged scan behavior

The CLI security commands become projections over this service boundary rather than direct package logic.

### 4. Strip semantic facades out of `packages/hq`

Phase 1 must remove the two most confusing facades immediately:

- `@rawr/hq/journal`
- `@rawr/hq/security`

`packages/hq` is allowed to remain only for true tooling support such as:

- workspace discovery
- install/link helpers
- lifecycle checks
- scaffolding support

If the remaining surface is still semantically muddy, the package is renamed or split.

The important part is that it stops pretending to be a service home.

### 5. Rewire active consumers to the owning services

Direct consumers must stop importing the old package boundaries.

That includes at least:

- CLI journaling/search/reflect surfaces
- CLI security command surfaces
- CLI config surfaces
- server bootstrap config loading
- plugin toolkit commands that currently import these package paths

The rewrite target is the owning service package, not a new transitional facade.

### 6. Install the canonical repo roots and move the live lane

Cut the active plugin tree to the canonical shape:

- `plugins/server/api/<capability>`
- `plugins/async/workflows/<capability>`
- `plugins/async/schedules/<capability>`

If `internal`, `consumers`, `web/app`, or `cli/commands` are not needed yet, create them only as reserved targets or leave them absent until earned.

Move the active capabilities atomically.

Do **not** leave these old runtime roots live:

- `plugins/api/*`
- `plugins/workflows/*`

Update workspace globs, project metadata, and imports in the same cut.

### 7. Install the canonical HQ shell front door

Create the canonical app home and make it real:

- `apps/hq/rawr.hq.ts`
- `apps/hq/server.ts`
- `apps/hq/async.ts`
- `apps/hq/dev.ts`

`web`, `cli`, and `agent` may be reserved or empty in this phase.

The key law is:

- manifest owns membership
- entrypoints own process shape

No other package may compete with that.

### 8. Cut executable composition authority away from the old host model

Phase 1 does not need to finish the runtime shell, but it must remove **authority** from the old host files.

Allowed outcome:

- a single temporary cutover function behind the new HQ entrypoints

Forbidden outcome:

- old and new composition seams both being authoritative
- dual manifests
- dual plugin registries
- two different runtime assembly paths

### 9. Reset the enforcement stack to canonical ontology

Current proof machinery exists, but too much of it is tranche-labeled or coordination-specific.

Phase 1 must replace that with invariant-named checks.

Minimum proof stack for plateau 1:

- `sync:check` validating canonical project inventory
- Nx tag coherence for `type`, `app`, `family`, `role`, `surface`, `capability`
- path/tag coherence for plugins
- service/package/app dependency direction
- HQ ops service shape and internal-module rules
- manifest ownership purity
- entrypoint thinness
- no live coordination
- no live support-example
- agent marketplace compatibility lane is frozen and does not expand during plateau 1
- no old plugin root families remaining in live code
- no semantic HQ truth remaining under `packages/`
- no legacy `@rawr/hq/journal` or `@rawr/hq/security` facades

## Phase 1 sequence

1. check in the classification ledger
2. archive coordination and delete it from the live path
3. archive `support-example` and delete it from the live path
4. freeze the current `plugins/agents/hq` compatibility lane and defer its redesign
5. create `services/hq-ops` and move `config`, `repo-state`, `journal`, and `security` into its internal modules
6. strip journal/security facades from `packages/hq`
7. rewire CLI/server/tooling consumers to the owning service
8. cut workspace/package metadata to canonical plugin roots
9. create `apps/hq/rawr.hq.ts` and canonical entrypoints
10. move active plugins/services into the canonical live lane
11. replace tranche-specific proofs with invariant-based proofs
12. freeze parked lanes

## Phase 1 verification

### Structural proofs

- `verify-hq-ops-service-shape`
- `verify-no-disguised-service-packages`
- `verify-no-legacy-hq-facades`
- `verify-repo-local-authority-ownership`
- `verify-canonical-plugin-topology`
- `verify-manifest-purity`
- `verify-entrypoint-thinness`
- `verify-no-live-coordination`
- `verify-no-live-support-example`
- `verify-agent-marketplace-lane-frozen`
- `verify-service-package-direction`
- `verify-parked-lane-frozen`

### Service proofs

- config service validates and merges sample layered configs deterministically
- repo-state service preserves locking and atomic mutation behavior
- journal service writes events/snippets and supports tail/search behavior
- security service preserves scan/gate/report behavior and report persistence

### Runtime smoke proofs

Only enough to prove the active lane still runs:

- server role boots the kept server surfaces
- async role boots the kept workflow surfaces
- no runtime path depends on coordination
- no runtime path depends on support-example
- no active path imports `@rawr/control-plane`, `@rawr/journal`, or `@rawr/security`

## Plateau 1 done means

You are done with phase 1 when all of this is true:

- there is one canonical app shell
- there is one canonical runtime plugin topology for the server/async live lane
- all newly migrated live-lane runtime code lands only in canonical roots
- coordination is not part of build, test, or runtime
- `plugins/agents/hq` remains only as a frozen compatibility lane for Cloud Code/Codex sync-install continuity
- no new `plugins/agents/*` roots or topology churn land during phase 1
- parked lanes are explicit and frozen
- there is no dual authoring authority anywhere
- `config`, `repo-state`, `journal`, and `security` live inside `services/hq-ops`
- `packages/hq` no longer exports service facades
- no semantic HQ truth remains under `packages/`

At that point the repo is no longer stalled.

It is ready to build substrate under one shell.

---

## Phase 2 — Minimal canonical runtime shell

## Purpose

Phase 2 makes the architecture operational.

This is the phase that turns the shell from “correctly arranged” into “correctly booted.”

This phase ends with a platform that can run real capabilities through canonical seams.

## Canonical reference documents

Phase 2 is grounded on two canonical specs in addition to this plan:

- `RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md` — the integrated architecture and runtime specification
- `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md` — the dedicated runtime subsystem specification

Those specs are authoritative for the runtime subsystem design. This plan governs scope, sequence, and gates.

## Non-negotiable phase rules

1. build only what phases 2 and 3 need
2. `server` and `async` are mandatory; `web`, `cli`, and `agent` are optional/reserved
3. bootgraph remains narrow and process-local
4. the runtime subsystem remains a hidden realization seam, not a second business plane
5. harnesses remain downstream of semantics
6. delete the phase-1 cutover seam before claiming plateau 2
7. not every service needs a new runtime projection in phase 2; only earned/needed projections get built
8. Effect stays hidden beneath RAWR-shaped public seams; ordinary plugin and service authors do not write raw `Layer`, `Context.Tag`, `ManagedRuntime`, or `Effect.Service`
9. the runtime subsystem does not become a generic DI container or a second public architecture

## Phase 2 package topology

The runtime subsystem is one subsystem with multiple packages, consolidated under `packages/runtime/`:

```text
packages/
  runtime/
    bootgraph/              PUBLIC - RAWR-shaped lifecycle shell
    compiler/               HIDDEN - manifest -> compiled process plan
    substrate/              HIDDEN - Effect-backed kernel
      src/
        effect/             Effect service definitions, layer construction
        services/           Runtime-owned services
        config/             Config loading, validation, redaction
        schema/             Runtime-owned Effect schemas
        errors/             Tagged runtime errors
        observability/      Logger/tracer/metrics roots
        process-runtime/    ProcessView, RoleView, surface assembly
    harnesses/
      elysia/               Server harness adapter
      inngest/              Async harness adapter
    topology/               Topology export shapes (if earned in P2)
```

`packages/hq-sdk` remains the authoring API home. All public author-facing APIs (`defineApp`, `startAppRole`, `defineServerApiPlugin`, `bindService`, etc.) live there. `packages/runtime/*` is the execution home.

The existing `packages/bootgraph` reservation and `packages/runtime-context` type seam are both superseded by this topology:

- `packages/bootgraph` becomes `packages/runtime/bootgraph`
- `packages/runtime-context` is absorbed into `packages/runtime/substrate`

## What phase 2 must accomplish

### 1. Implement the public bootgraph shell

`packages/runtime/bootgraph` becomes real.

It must expose, at minimum:

- `defineProcessModule(...)`
- `defineRoleModule(...)`
- `startBootGraph(...)`

It must guarantee:

- dependency-first startup
- identity dedupe
- fatal startup on failure
- rollback on startup failure via Effect scope finalization
- reverse shutdown ordering
- process and role lifetimes only
- typed boot context assembly
- lowering of RAWR-shaped modules into the hidden Effect-backed plan via `lowerModule()`

The bootgraph produces one root `ManagedRuntime` per started process.

It must **not** own:

- app identity
- manifest membership
- surface composition
- harness semantics

### 2. Implement the runtime substrate (Effect-backed kernel)

Create `packages/runtime/substrate` as the hidden Effect-backed kernel beneath bootgraph.

This is the canonical home for:

- Effect service definitions for runtime-owned concerns
- layer construction and memoization
- managed-runtime creation and disposal
- scope creation and child-scope management
- tagged runtime errors
- runtime-owned config loading and validation
- process-local resource stores
- process-runtime assembly (ProcessView, RoleView, surface assembly, started-process handle)

The runtime substrate grows incrementally across the Phase 2 dominos. The minimum viable runtime-owned services for the P2 active lane are:

| Service | Lifetime | Lands in | Needed by |
| --- | --- | --- | --- |
| `RuntimeConfig` | process | M2-U00 | all entrypoints |
| `ProcessIdentity` | process | M2-U00 | all entrypoints |
| `RuntimeTelemetry` (logger, analytics) | process | M2-U00 | both services (baseline) |
| `DbPool` | process | M2-U00 | example-todo |
| `Clock` | process | M2-U00 | example-todo |
| `WorkspaceRoot` / `RepoRoot` | process | M2-U00 | hq-ops (scope.repoRoot) |
| `BoundaryCache` | process | M2-U00 | service binding memoization |
| `ProcessView` | process | M2-U02 | plugin binding, harness handoff |
| `RoleView` | role | M2-U02 | plugin binding |
| `SurfaceAssembler` | role | M2-U02 | surface construction |
| `AsyncActivation` | process | M2-U03 | async workflows |
| `TopologyRegistry` | process | M2-U02 if earned | debug/inspection |

Deferred beyond Phase 2: `FileSystemRuntime`, `CommandRuntime`, `AgentRuntimeHandle`, `RoleQueueHub`, `RolePubSubHub`.

This is the moment Effect enters the repo as a real dependency.

The canonical internal stance is:

```text
RAWR plans identity, lifetime, and ordering.
Effect executes acquisition, scoping, finalization, and runtime ownership.
```

### 3. Implement a thin runtime compiler

Create `packages/runtime/compiler` as the hidden compiler that turns:

- app manifest
- selected roles
- shared process modules
- plugin resource declarations
- plugin surface declarations

into a compiled process plan.

Start narrow.

Only compile what the active lane needs:

- `server.api`
- `async.workflows`
- `async.schedules`

You do **not** need `agent`, `channels`, `shell`, `tools`, or a rich topology catalog here.

### 4. Implement the harness adapters you actually need

Make these real:

- `packages/runtime/harnesses/elysia`
- `packages/runtime/harnesses/inngest`

Optional and deferred:

- web and cli harnesses
- `packages/agent-runtime/*`

### 5. Cut the public SDK to the canonical authoring model

Phase 2 needs the actual author-facing surface that future generators will target.

`packages/hq-sdk` is the canonical home. That means implementing or reshaping the public SDK around:

- `defineService(...)`
- `defineServicePackage(...)`
- `defineApp(...)`
- `startAppRole(...)`
- `startAppRoles(...)`
- `defineServerApiPlugin(...)`
- `defineAsyncWorkflowPlugin(...)`
- `defineAsyncSchedulePlugin(...)`
- `bindService(...)`

Current transitional builders such as generic API/workflow registration shapes must be deleted or quarantined from the active lane once migration is complete.

### 6. Normalize the proof slices

Use concrete slices to prove the runtime shell:

- `example-todo` for canonical service + server/api
- `hq-ops` (`repo-state` module) for HQ operational service ownership + process resources + service/client wiring
- a dedicated async exemplar introduced after the cleanup plateau, not `support-example`, for workflows and schedules
- `hq-ops` (`config` module) for startup/runtime config loading through canonical seams

`journal` and `security` remain canonical services in phase 2 even if they are still surfaced mainly through parked CLI projections. They do **not** need forced server/async projections before the core runtime shell is ready.

The point of the proof slices is not their business meaning.

The point is proving:

- service binding through `bindService(...)` backed by `BoundaryCache` and the runtime substrate
- runtime projection
- manifest composition
- booted process resources through the Effect-backed bootgraph
- async execution via Inngest

### 7. Delete the transitional runtime seam

At phase 2 exit, there should be no remaining live dependency on legacy host-composition architecture.

That includes:

- old app-local composition seams
- old registration/contribution grammar as the public authoring model
- old manual route-family merging as runtime truth
- old transitional support seams that are now subsumed by the runtime subsystem
- `apps/hq/legacy-cutover.ts`
- `packages/runtime-context` (absorbed into runtime substrate)

## Phase 2 sequence

1. replace legacy cutover with first canonical server runtime path, introducing `packages/runtime/substrate` and `packages/runtime/bootgraph` with minimum viable kernel
2. harden bootgraph with Effect lowering model, dependency ordering, rollback, tagged errors
3. generalize runtime compiler and build process-runtime inside substrate (ProcessView, RoleView, SurfaceAssembler)
4. install canonical async runtime path with Inngest harness
5. replace plugin builders with canonical role/surface builders in `packages/hq-sdk`
6. migrate the proof slices
7. ratchet proofs and delete remaining transitional seams

## Phase 2 verification

### Runtime substrate proofs

- `packages/runtime/substrate` exists with canonical internal topology
- Effect is a workspace dependency
- runtime-owned services (RuntimeConfig, ProcessIdentity, RuntimeTelemetry, DbPool, BoundaryCache) are implemented as `Effect.Service` definitions
- one started process owns one root `ManagedRuntime`
- raw Effect types do not leak into public bootgraph, plugin, or service authoring APIs

### Bootgraph proofs

- module identity dedupe
- startup order
- rollback on failure via Effect scope finalization
- shutdown order
- process vs role lifetime behavior
- `lowerModule(...)` bridge from ResourceModule to Effect Layer

### Compiler proofs

- manifest to plan compilation for `server` and `async`
- explicit role selection
- role/surface plan correctness
- resource lowering from plugin `bind(...)`

### Harness proofs

- `server` mounts only server surfaces
- `async` mounts only async surfaces
- published/internal exposure behavior matches declarations
- Inngest function registration derives from the compiled async plan, not ad hoc host glue

### End-to-end proofs

- `apps/hq/server.ts` boots through `startAppRole({ app, role: “server” ... })`
- `apps/hq/async.ts` boots through `startAppRole({ app, role: “async” ... })`
- example-todo server path works through the Effect-backed runtime substrate
- async proof slice works
- config service is used through canonical startup/runtime seams
- no live runtime path depends on old host-composition seams

## Plateau 2 done means

You are done with phase 2 when all of this is true:

- the app boots through canonical app/runtime APIs
- bootgraph is functional with Effect lowering
- runtime compiler is functional
- runtime substrate is functional with process-runtime, runtime-owned services, and `ManagedRuntime`
- Elysia and Inngest harnesses are functional
- at least one server and one async slice run canonically
- there is no legacy composition seam left in the live path
- HQ operational services are still cleanly classified and not reburied into runtime packages
- raw Effect types are not exposed in any public authoring API

At that point the platform is manually authorable and stable.

---

## Phase 3 — Generator-ready capability foundry

## Purpose

Phase 3 makes the architecture cheap to use.

This is the phase where “build a new capability” becomes a repeatable operation rather than a design session.

## Non-negotiable phase rules

1. generators must target canonical seams only
2. generated output must pass graph and structural checks immediately
3. generators are not allowed to recreate legacy shapes
4. idempotency matters more than cleverness
5. review should focus on business logic, not on whether folders and seams are correct
6. generators must understand family-nested services as well as flat services

## What phase 3 must accomplish

### 1. Establish golden templates

Create golden templates for the minimal active lane:

- canonical service shell
- canonical family-nested service shell
- canonical server/api plugin
- canonical async/workflow plugin
- canonical async/schedule plugin
- manifest insertion/update
- standard tests and project metadata

These templates are the real foundry contract.

The generator implementation can vary. The template output cannot.

### 2. Implement scaffold/generator infrastructure

This can be exposed via Nx, CLI, or both, but the implementation should be library-first and idempotent.

Each generator should support:

- dry-run
- write mode
- deterministic file output
- manifest update/codemod
- project tag assignment
- `sync` target creation
- `structural` target creation
- explicit support for `services/<capability>` plus reserved internal-module scaffolding inside `services/hq-ops` when needed

### 3. Add graph and proof ratchets for generated code

Every generated slice must be forced through the same proof stack:

- path/tag coherence
- module boundary rules
- manifest update correctness
- entrypoint purity unchanged
- generator idempotency
- family namespace rules
- no legacy imports or builders
- no semantic package facades
- targeted tests for the generated slice

### 4. Prove the foundry on a real example

Use a capability close to the target use case, such as `email-filter`.

The generated result should be able to express:

- a service boundary for email filtering semantics
- an async workflow for durable processing
- a schedule for polling or renewal
- an optional server/api surface for webhook ingress or operator triggers

That proof slice is not just a demo.

It is the evidence that agents can now add real business capabilities.

### 5. Freeze the canonical expansion rules

By the end of phase 3, the team should know exactly how new work expands:

- new semantic truth -> `services/<capability>`
- new HQ operational truth -> `services/hq-ops` if and only if it belongs to the HQ operational service package; add or refine an internal module seam instead of creating a sibling service
- new synchronous projection -> `plugins/server/api/<capability>`
- new durable execution -> `plugins/async/workflows/<capability>`
- new recurring trigger -> `plugins/async/schedules/<capability>`
- new membership -> `apps/hq/rawr.hq.ts`

No new top-level nouns.
No ad hoc host glue.
No “just for this one case” folder inventions.

## Phase 3 sequence

1. define the golden slice templates
2. implement generators and manifest codemods
3. add generator-specific structural and idempotency proofs
4. generate and land the `email-filter`-style exemplar
5. freeze the foundry contract

## Phase 3 verification

### Generator proofs

- dry-run output is accurate
- write mode is deterministic
- second run is idempotent
- generated files have correct tags and targets
- generated slice passes `sync`, `structural`, `typecheck`, and targeted tests
- family-nested services generate without manual cleanup

### Foundry proofs

- an agent can scaffold a new capability without inventing architecture
- human review only needs to judge logic and product decisions
- no manual hand-wiring is required outside declared stop markers

## Plateau 3 done means

You are done with phase 3 when all of this is true:

- new capability slices can be scaffolded canonically
- graph and proofs reject architectural drift automatically
- a real example capability proves server + async generation
- family-nested services are first-class in the foundry
- the team can hand capability work to AI agents without reopening structure design

At that point the capability foundry is real.

---

## What phases 1–3 deliberately do not build

These are real parts of the final spec, but they are **not** required to hit the capability-foundry target:

- `agent` runtime implementation
- `agent/channels/*`
- `agent/shell/*`
- `agent/tools/*`
- steward activation flows
- OpenShell runtime integration
- shell gateway
- rich topology catalog
- broader external control-plane/devplane features
- multi-app split beyond `hq`
- a remote/admin HQ plane for lifecycle control

These remain tranche-4 work.

They should be reserved, not invented early.

---

## Enforcement architecture for the migration

## Canonical tag axes

Use these as the minimum enforced metadata:

- `type:*`
  - `type:package`
  - `type:service`
  - `type:plugin`
  - `type:app`
  - `type:tool`
- `app:*`
  - `app:hq`
- `role:*`
  - `role:server`
  - `role:async`
  - `role:web`
  - `role:cli`
  - `role:agent`
- `surface:*`
  - `surface:api`
  - `surface:internal`
  - `surface:workflows`
  - `surface:schedules`
  - `surface:consumers`
  - `surface:app`
  - `surface:commands`
  - `surface:channels`
  - `surface:shell`
  - `surface:tools`
- `capability:*`

Transitional `migration-slice:*` tags are allowed only during phase 1 and should be removed by the plateau boundary.

## Boundary policy

### Hard dependency direction

- packages -> packages only
- services -> packages and services only
- plugins -> packages and services only
- apps -> packages, services, and plugins only

### Additional rules

- service families are namespaces only
- repositories remain under services
- plugins may not depend on other plugins
- apps may not hide composition inside harness-specific packages
- non-runtime content may not live under canonical `plugins/`
- packages may not own repo-local HQ truth once the `hq-ops` cut is complete

## Inventory and sync checks

`sync:check` should validate at least:

- app inventory
- entrypoint/role mapping
- plugin path/tag coherence
- allowed role/surface matrix
- absence of forbidden roots
- absence of archived capabilities in live inventories
- presence and shape of `services/hq-ops`
- absence of removed package facades

## Structural suites

Move away from tranche-labeled proof names.

Use invariant-labeled checks such as:

- `verify-manifest-purity`
- `verify-entrypoint-thinness`
- `verify-canonical-plugin-topology`
- `verify-service-shell-shape`
- `verify-hq-ops-service-shape`
- `verify-no-disguised-service-packages`
- `verify-no-legacy-hq-facades`
- `verify-repo-local-authority-ownership`
- `verify-no-live-coordination`
- `verify-agent-marketplace-lane-frozen`
- `verify-bootgraph-shell`
- `verify-runtime-compiler-shell`
- `verify-runtime-substrate-shape`
- `verify-effect-quarantine` (raw Effect types do not leak into public APIs)
- `verify-generator-idempotency`

## Runtime proofs

Keep runtime tests seam-focused:

- server surface projection tests
- async workflow/schedule tests
- bootgraph lifecycle tests (including Effect lowering)
- runtime substrate service tests (RuntimeConfig, DbPool, BoundaryCache, etc.)
- app runtime smoke tests
- generated-slice smoke tests
- HQ ops service behavior tests where those services participate in startup/runtime behavior

Do not let runtime proofs depend on scratchpads, archived design packets, or stale phase naming.

---

## Decision rubric for humans and AI agents

When the team encounters an ambiguity, use this order:

### Question 1

Does this code own durable semantic truth, canonical writes, or authoritative validation/merge semantics?

- yes -> service
- no -> continue

### Question 2

Is that truth HQ-only operational truth such as config, repo state, journal, or security?

- yes -> `services/hq-ops` with the appropriate internal module seam
- no -> continue within ordinary service classification

### Question 3

Does it project an existing service or capability into a runtime surface?

- yes -> plugin
- no -> continue

### Question 4

Does it only compose roles/surfaces into one product/runtime identity?

- yes -> app manifest
- no -> continue

### Question 5

Does it only boot, lower, mount, or host already-composed runtime contributions?

- yes -> `packages/runtime/*` (runtime compiler, bootgraph, substrate, harness)
- no -> continue

### Question 6

Is it support matter, tooling, sync logic, scaffolding, content, or machine-local utility with no durable semantic truth?

- yes -> package or tool/content root
- no -> stop and resolve the ambiguity explicitly before coding

This rubric exists so agents can fill gaps without inventing new ontology.

### Examples

- repo-local journal storage/search = service
- security scan/gate/report = service
- HQ config load/merge/validate = service
- repo-state locking and plugin enablement = service
- bootgraph = `packages/runtime/bootgraph`
- runtime compiler = `packages/runtime/compiler`
- runtime substrate = `packages/runtime/substrate`
- runtime-owned Effect services = internal to `packages/runtime/substrate`
- agent sync to Codex/Claude homes = package/tooling
- workspace discovery = package/tooling
- local HQ process manager status = app/tooling support

---

## Concrete stop markers

These are the places where the team should stop rather than improvise new structure:

- do not implement `agent` runtime in phases 1–3
- do not create new top-level roots
- do not reintroduce coordination under a new name
- do not move HQ operational truth back into packages
- do not recreate `@rawr/hq/journal` or `@rawr/hq/security` facades
- do not turn `hq-ops` into a parent service with shared repositories or migrations
- do not add `web` or `cli` generators until server/async foundry output is stable
- do not build rich topology catalog features before the core runtime shell is real
- do not promote install/workspace/lifecycle tooling to services without a fresh explicit decision after plateau 3
- do not expose raw `Layer`, `Context.Tag`, `ManagedRuntime`, or `Effect.Service` as ordinary public authoring primitives
- do not build a second lifecycle engine beneath bootgraph; Effect owns execution, bootgraph owns planning
- do not replace oRPC with runtime-subsystem service binding
- do not replace Inngest with in-process queues or schedules
- do not surface a public generic DI-container vocabulary as a peer architecture

If a task wants one of those, it belongs after plateau 3.

---

## Final target after phase 3

After phase 3, the repo should feel like this:

- there is one canonical app shell: `apps/hq`
- there is one active runtime lane: `server` + `async`
- there is one canonical HQ operational service package:

```text
services/
  hq-ops/
    config/
    repo-state/
    journal/
    security/
```

- services hold the truth
- packages are true support/tooling only
- plugins project truth into server and async surfaces
- the manifest selects which projections belong to HQ
- entrypoints choose process shape
- `packages/runtime/bootgraph` handles lifecycle
- `packages/runtime/compiler` and `packages/runtime/substrate` (including process-runtime) stay hidden
- the Effect-backed runtime substrate provides typed resource acquisition, service binding memoization, and deterministic lifecycle beneath the public shell
- harnesses stay downstream
- raw Effect vocabulary stays quarantined inside `packages/runtime/*`
- new capabilities are generated, not hand-invented
- the team can ask an AI agent for an `email-filter` capability and expect a canonical slice, not architectural improvisation

That is the right stopping point before tranche 4.

It is far enough to unlock the foundry.
It is short of the steward/agent-shell work that would slow the repo down now.
