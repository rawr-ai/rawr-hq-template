# Repo Structural Audit: Full Manifest & Restructure Proposal (V5)

**Date**: 2026-03-21
**Branch**: context-directory-reorg
**Methodology**: 3-agent parallel audit (Package Ontology, App/Plugin Boundary, Dependency Graph) + architecture enforcement pass + service boundary deepening + SDK promotion audit
**Status**: V5 -- V4 corrected by restoring `hq-operations` as a service (reversing the erroneous de-escalation that violated our own classification rules).

---

## Executive Summary

The repo currently has 15 packages, 2 services, 8 plugin capability directories across 5 plugin roots, and 3 apps. The golden `example-todo` service proves the architecture works when followed. But most of the codebase doesn't follow it yet.

**The core finding**: 8 packages/app-local modules are actually services, 1 package is a god-package that needs splitting, and the worst boundary violation is a split-brain support workflow where service truth and workflow runtime truth are divided across two owners.

**Proposed outcome**: 8 new services (coordination, state, journal, security, session-intelligence, plugin-management, agent-config-sync, hq-operations), 1 mega-package split, role-first plugin topology hardening, deduplication of lifecycle code between package and plugin, and explicit reservation of the future HQ app seam plus `packages/bootgraph/`.

**Prerequisite**: The proto SDK in `services/example-todo/src/orpc/` must be promoted to `packages/hq-sdk/` before any service promotion begins. This SDK provides `defineService`, baseline middleware, the context type system, and the boundary pattern that all new services depend on.

**Future-shape reservation**: This proposal explicitly reserves the future HQ app seam and treats the root manifest bridge plus current role apps as transitional runtime homes on the way to it.

---

## Non-Negotiable Architecture Stances

This proposal enforces four classification rules without exception:

1. **Classification is based on what code owns (capability truth), not who consumes it.** If a module owns a data model, business invariants, or authoritative write logic, it is a service candidate -- regardless of where it currently lives or how many things import it.
2. **Plugins are projections -- they never own capabilities.** A plugin surfaces capability truth that lives in a service. If a plugin contains business logic, that logic must be extracted to a service and the plugin must re-export or call it.
3. **Consumer count is not a classification signal.** A capability boundary with one consumer is still a capability boundary. "Single consumer" or "evaluate if more consumers emerge" is never valid reasoning for classification decisions.
4. **Services own capability truth regardless of size or current consumer count.** A 200-line module that owns a data model and write authority is a service. A 2000-line module that only orchestrates calls to other services is not.

---

## Classification Manifest

### Tier 1: Promote to `services/` (highest impact)

| Current | Classification | Proposed | Reasoning |
|---|---|---|---|
| `packages/coordination` | **service** | `services/coordination/` | Owns oRPC contracts, domain types (workflows, desks, handoffs, runs), validation logic, graph algorithms, storage, ID generation. Textbook semantic capability truth. |
| `packages/state` | **service** | `services/state/` | Owns oRPC contract (`stateContract`), domain types (`RepoState`), mutation logic with file locking, write authority over plugin state. |
| `packages/journal` | **service** | `services/journal/` | Owns journal data model, SQLite-backed FTS database, semantic search, snippet CRUD, event writing. Capability truth for journal/knowledge domain. |
| `packages/security` | **service** | `services/security/` | Owns repo/staged security audit orchestration, secret/untrusted-dependency/vulnerability finding types, severity ordering, report generation, and risk-tolerance gate decisions. Capability truth for the security domain. |
| `packages/session-tools` | **service** | `services/session-intelligence/` | Owns session data model (14 domain types), SQLite-backed session index with cache invalidation, multi-provider discovery/parsing pipeline (Claude + Codex wire format parsers), full-text search, metadata search. Capability truth for the session intelligence domain. |
| `packages/agent-sync` | **service** | `services/agent-config-sync/` | Owns agent config sync with conflict resolution policy, plugin ownership tracking via `ClaimedSets`, write authority over agent config destinations (Claude/Codex), GC policy for orphaned files, undo system. 22+ files, 2000+ lines. Capability truth for agent configuration management. |

**Dependency evidence**: The original 4 promotions (coordination, state, journal, security) are leaf-level packages with zero or minimal @rawr/* deps, proving they are natural service boundaries.

**Note**: `journal` and `security` don't yet have oRPC contracts (unlike coordination and state). They'll need contracts defined following the `example-todo` pattern when promoted. `session-intelligence` and `agent-config-sync` will also need contracts.

### Tier 2: Split/decompose (second highest impact)

| Current | Classification | Proposed | Reasoning |
|---|---|---|---|
| `packages/core` | **split** | See breakdown below | God-package mixing CLI base class, service implementations, telemetry install, and contract composition. Most critical violation: `runtime-router.ts` implements coordination + state oRPC handlers. |
| `packages/hq` (3 subpaths) | **service extraction** | Extract workspace + install + lifecycle into `services/plugin-management/` | Per-subpath analysis reveals 3 of 6 subpaths own capability truth. See detailed breakdown below. |
| `apps/cli/src/lib/hq-status.ts` | **service extraction** | Extract into `services/hq-operations/` | Owns operational health domain model (15+ types), business invariants (8-way state derivation), and write authority (status artifacts). |

**`core` split plan**:
- `src/cli/rawr-command.ts` -- stays `packages/core`. Pure support matter (oclif Command subclass). Whether to rename the residual package to `packages/cli-base` is a deferred naming decision (see "Deferred design decisions").
- `src/orpc/telemetry.ts` -- stays `packages/core` or new `packages/telemetry`. OTel SDK install.
- `src/orpc/runtime-router.ts` -- **move procedure implementations into `services/coordination/` and `services/state/`**. This file literally implements the service handlers but lives outside the service boundary. This is the biggest single architectural inversion.
- `src/orpc/hq-router.ts` -- keep it thin, but relocate it with app-level composition when the HQ app seam exists. Today it is only a root contract composition anchor, not service truth or host wiring.

**`packages/hq` per-subpath analysis**:

| Subpath | V1 classification | Actual content | V2 verdict |
|---|---|---|---|
| `src/workspace/` | app-local | Plugin manifest contract (`WorkspacePluginKind`, `ParsedWorkspacePluginManifest`), plugin discovery, forbidden legacy key enforcement, kind-to-root consistency rules | **SERVICE** -- owns plugin registry capability truth |
| `src/install/` | app-local | Installation state machine (`InstallStateStatus` with 4 states), 7 drift types, health report model, `assessInstallState()` (150+ lines), reconciliation with convergence verification | **SERVICE** -- owns plugin installation management capability truth |
| `src/lifecycle/` | app-local | Plugin quality gate (`evaluateLifecycleCompleteness()`), two-judge merge policy engine (`decideMergeAction()`), scratch policy enforcement, file classification business rules | **SERVICE** -- owns plugin lifecycle management capability truth |
| `src/scaffold/` | app-local | Code generation templates, string interpolation, naming convention validation | **PACKAGE** -- utility, no capability truth |
| `src/journal/` | thin wrapper | Process-scoped context accumulator (`JournalContext` with global symbol singleton) | **PACKAGE** -- thin runtime concern, not a journal wrapper. Destination deferred to journal service work. |
| `src/security/` | thin wrapper | Lazy-load wrapper for `@rawr/security` via dynamic import | **ELIMINATE** -- pure lazy-load indirection, no value |

The three SERVICE subpaths (workspace, install, lifecycle) should be combined into a single **Plugin Management** service (`services/plugin-management/`). They share a coherent capability boundary: plugin manifest contract, plugin installation state, and plugin lifecycle quality gates.

**Terminal state of `packages/hq`**: After all subpath extractions are complete -- workspace/install/lifecycle to `services/plugin-management/`, scaffold to `packages/scaffold/`, security wrapper eliminated, and journal-context deferred to journal service work -- the `packages/hq` package is fully decomposed. The package (including its `src/index.ts` barrel re-export) is retired and deleted.

**`hq-status.ts` extraction to `services/hq-operations/`**: 725 lines, of which only 20 are CLI formatting. The rest is the operational health model: 15+ domain types, 8-way state derivation, system probing (PIDs, ports, Docker, HTTP), and write authority over status artifacts (`.rawr/hq/status.json`). Classified by the same criteria as every other service promotion (Non-Negotiable Stances rules 1 and 4).

### Tier 3: Packages that correctly stay as packages

| Package | Reasoning |
|---|---|
| `packages/bootgraph` | Reserved future home for downstream process-local lifecycle support. This proposal reserves the seam only. It does **not** claim current files already move there, and it defers bootgraph API, internals, and migration details. |
| `packages/coordination-observability` | Coordination-adjacent support matter. It supports coordination truth but does not itself become semantic capability truth. Keep it package-scoped; final colocation or rename can be decided later. |
| `packages/coordination-inngest` | Transitional mixed runtime/support matter. It currently combines durable execution harness responsibilities with coordination-adjacent support, and it should be decomposed around service-truth vs async/runtime seams rather than merged wholesale into `services/coordination/`. Final split names are intentionally deferred. |
| `packages/hq-sdk` | Full oRPC service authoring SDK, promoted from the proto SDK in `services/example-todo/src/orpc/`. Provides: context type system (semantic lanes), factory layer (contract/implementer/middleware builders), baseline layer (guaranteed observability + analytics), service definition (`defineService`), boundary pattern (`defineDomainPackage`), port interfaces (Logger, AnalyticsClient, Sql, DbPool, FeedbackClient), and placeholder host adapters for test/dev. Replaces the existing 5-file draft. Genuine support matter -- defines the architectural patterns all services use but owns no business truth itself. Prerequisite for all service promotions. |
| `packages/control-plane` | Config schema (`RawrConfigV1`), loading, merging, validation. Infrastructure that carries embedded business knowledge (risk tolerance levels, plugin channel policy) but does not independently own a capability. Consider renaming to `packages/config`. Caveat: if configuration becomes dynamic (runtime-mutable, API-managed), this would need to become a service. |
| `packages/orpc-client` | Thin RPC link factories. Pure transport support matter. |
| `packages/scaffold` | Extracted from `packages/hq/src/scaffold/`. Code generation templates and naming utilities. No capability truth. |
| `packages/test-utils` | Test helper. Dev-only. Correctly a package. |
| `packages/ui-sdk` | Micro-frontend mount protocol types. Support matter for web surface. |

For `packages/hq` subpath dispositions (scaffold, journal, security), see the Tier 2 per-subpath analysis.

### Tier 4: Plugin boundary fixes

| Current | Issue | Proposed |
|---|---|---|
| `plugins/workflows/support-example/` | **Worst boundary violation**: `services/support-example/` already owns real service truth, while the workflow plugin separately owns run-store, trigger, and execution truth. The problem is dual authority, not simply "plugin owns everything." | **Collapse authority into `services/support-example/` as the sole truth owner.** Any retained workflow plugin becomes async/runtime projection only. Rebuild the retained projection from the service outward instead of preserving split-brain ownership. |
| `plugins/cli/plugins/` lifecycle duplication | Plugin contains character-for-character copies of `packages/hq/src/lifecycle/policy.ts`, `lifecycle.ts`, `types.ts`, and identical copy of `install/reconcile.ts`. Also contains a pure re-export of `@rawr/hq/install`. Truth already lives in the package. | **Deduplicate immediately.** Once `packages/hq/src/lifecycle/` becomes `services/plugin-management/`, the plugin should import from the service. The duplicated code in the plugin directory must be removed and replaced with re-exports or service calls. |
| `plugins-lifecycle/policy.ts` | Two-judge policy assessment engine with merge decision business rules, code quality assessment, and policy enforcement. These are business invariants (capability truth), not plugin concerns. | **Extract to `services/plugin-management/`** as part of the lifecycle subpath promotion. The extraction is justified by what the code owns (business invariants about merge decisions), not by consumer projections. |
| `rawr.hq.ts` | Transitional composition+wiring bridge: it mixes app-level composition authority with host wiring, in-memory store creation, ID generation, and dependency wiring types. | Retire the root bridge in favor of reserved `apps/hq/rawr.hq.ts` plus app entrypoints/runtime helpers. The future manifest is composition-only; runtime wiring stays with entrypoints and runtime helpers. |
| `apps/server/src/rawr.ts` | Inngest HMAC signature verification (50+ lines) is a reusable security primitive, not app-specific. | Extract to shared package-scoped support matter. Whether that remains under existing `packages/coordination-inngest` or later earns a dedicated `packages/inngest-auth` should stay open until implementation planning. |
| `apps/server/src/workflows/context.ts` | `RawrBoundaryContext` type structurally duplicated in `plugins/workflows/support-example/src/context.ts`. | Extract to a shared type in a package. |

### Tier 5: Plugin directory restructure

Current structure: `surface -> capability` (2 levels)
Target structure: `role -> surface -> capability` (3 levels)

| Current | Proposed |
|---|---|
| `plugins/api/example-todo` | `plugins/server/api/example-todo` |
| `plugins/workflows/support-example` | `plugins/async/workflows/support-example` |
| `plugins/cli/hello` | `plugins/cli/commands/hello` |
| `plugins/cli/plugins` | `plugins/cli/commands/plugins` |
| `plugins/cli/session-tools` | `plugins/cli/commands/session-tools` |
| `plugins/web/mfe-demo` | `plugins/web/app/mfe-demo` |
| `plugins/agents/hq` | `plugins/agent/tools/hq` (or `plugins/agent/skills/hq`) |
| `plugins/agents/nx` | `plugins/agent/tools/nx` (or `plugins/agent/skills/nx`) |

**Plugin compliance notes** (inspected for Rule 2 -- "plugins are projections, never own capabilities"):
- `plugins/agents/hq` -- Compliant. Contains only markdown skill definitions, workflow instructions, and agent persona files. No TypeScript source; no business logic. Proper agent-role projection.
- `plugins/agents/nx` -- Compliant. Contains only empty skill directory stubs (scaffold stage). No source code, no business logic.
- `plugins/cli/hello` -- Compliant. Single trivial oclif Command subclass (`this.log("hello")`). Pure CLI surface projection, no capability truth.
- `plugins/web/mfe-demo` -- Compliant. Client-side micro-frontend mounting code with locally declared DTO types and a thin server-side health route. All business logic delegated to `support-example` service via oRPC RPCLink. Proper web-role projection.
- `plugins/api/example-todo` -- Compliant. Re-exports the `@rawr/example-todo` service contract and creates a delegating router that forwards all calls to the service client. Textbook API projection of service truth.

**Impact**: The target topology is correct, but this is not cosmetic churn. Current discovery, install, lifecycle, tests, and phase scripts are coupled to the old roots. Treat the role-first tree as one coupled policy decision (`role -> surface -> capability`), even if implementation lands in the staged sequence of broadening roots, moving paths, then removing legacy compatibility.

### Tier 6: Cleanup / minor fixes

| Item | Action |
|---|---|
| `eslint-fixtures` | Re-tag from `type:service,type:plugin` to `type:tool`. Not production code. |
| `@rawr/cli` -> `@rawr/plugin-plugins` dependency | **Direction violation**: app directly imports plugin. Should compose via manifest. |
| `@rawr/hq` phantom dependencies | Clean up declared deps that are only used in code-gen template strings. |
| `packages/hq/src/security/` | Eliminate lazy-load wrapper. Direct imports of `@rawr/security` suffice. |

---

The following maps show the cumulative target state after all classification decisions above are applied.

## Proposed Service Map (post-restructure)

```
services/
  coordination/          <- packages/coordination
                           + partial core/src/orpc/runtime-router.ts (coordination handlers)
  state/                 <- packages/state
                           + partial core/src/orpc/runtime-router.ts (state handlers)
  journal/               <- packages/journal
  security/              <- packages/security
  session-intelligence/  <- packages/session-tools
                           (session data model, SQLite index, multi-provider discovery/parsing/search)
  plugin-management/     <- packages/hq/src/workspace/ + src/install/ + src/lifecycle/
                           (plugin manifest contract, install state machine, lifecycle quality gates)
  agent-config-sync/     <- packages/agent-sync
                           (conflict resolution, ownership tracking, write authority, undo)
  hq-operations/         <- apps/cli/src/lib/hq-status.ts
                           (operational health model, system probing, status artifact management)
  example-todo/          (already correct -- golden template)
  support-example/       (already exists; sole truth owner after authority collapse per Tier 4)
```

## Proposed Package Map (post-restructure)

```
packages/
  bootgraph/             (reserved downstream process-local lifecycle support only; API/internals/migration deferred)
  coordination-inngest/  (transitional runtime/support matter; decompose around service-truth and async/runtime seams)
  coordination-observability/
                         (coordination-adjacent support matter)
  core/                  (keep: CLI base class RawrCommand + telemetry install; remove: router impls)
  control-plane/         (stays, consider rename to config/)
  hq-sdk/                (promoted: full oRPC service/plugin SDK)
    subpaths: ., ./service, ./boundary, ./context, ./ports, ./ports/*,
              ./middleware, ./schema, ./host-adapters/*
  orpc-client/           (stays)
  scaffold/              (from packages/hq/src/scaffold/ -- code generation utility)
  test-utils/            (stays)
  ui-sdk/                (stays)
```

## Proposed App Changes

```
apps/
  hq/                    (reserved target app home; current root `rawr.hq.ts` retires into this seam)
    rawr.hq.ts           (future composition-only app manifest)
    server.ts            (future server entrypoint)
    async.ts             (future async entrypoint)
    web.ts               (future web entrypoint)
    dev.ts               (future optional cohosted development entrypoint)
    cli.ts               (optional only if HQ later earns a dedicated CLI entrypoint)
  cli/                   (current transitional runtime home; remove direct plugin-plugins dependency; extract hq-status.ts to services/hq-operations/)
  server/                (current transitional runtime home; runtime wiring eventually shifts behind `apps/hq` entrypoints/runtime helpers)
  web/                   (current transitional runtime home)
```

The `apps/hq/` entrypoint filenames (server.ts, async.ts, web.ts, dev.ts, cli.ts) are structural reservations consistent with the canonical architecture's target-state topology -- not files being created immediately. The target-state seam is explicit: `apps/hq/rawr.hq.ts` becomes composition-only, while runtime wiring remains in entrypoints and runtime helpers. Current root `rawr.hq.ts` is a transitional bridge to be retired, and current `apps/server`, `apps/web`, and `apps/cli` are transitional runtime homes rather than the target topology.

## Proposal Support Tables

These tables are decision support, not an implementation matrix. They summarize where the structural changes land and how service truth projects outward without prescribing execution slices or folder-by-folder migration mechanics.

### Structural Change Ledger

| Change area | Current home | Target home | Proposal decision | Why it matters |
|---|---|---|---|---|
| HQ app manifest seam | root `rawr.hq.ts` | reserved `apps/hq/rawr.hq.ts` | Retire the repo-root bridge into a composition-only app manifest. | Separates app composition authority from runtime wiring. |
| HQ role entrypoints | current `apps/server`, `apps/web`, and CLI runtime homes | reserved `apps/hq/{server,async,web,dev}.ts` with optional `cli.ts` only if later earned | Keep current runtime homes transitional while reserving the future HQ seam now. | Makes the canonical app seam explicit without forcing an implementation plan into the proposal. |
| Bootgraph reservation | no current `packages/bootgraph/` home | reserved `packages/bootgraph/` | Reserve the package as downstream process-local lifecycle support only. | Closes the target-shape hole without drafting API, internals, or migration. |
| `core` router split | `packages/core/src/orpc/{runtime-router,hq-router}.ts` | service handlers move into service truth; thin contract composition relocates with the HQ app seam | Split service implementation from thin root contract composition instead of treating both files the same way. | Fixes the biggest inversion while keeping `hq-router.ts` correctly classified as composition support. |
| Coordination truth vs runtime support | `packages/coordination`, `packages/coordination-inngest`, `packages/coordination-observability` | `services/coordination` plus retained package-scoped runtime/support matter | Promote coordination truth, but keep Inngest/runtime and observability support out of service truth. | Preserves the semantic-service / async-runtime split established by the RAWR Future Architecture. |
| Plugin management extraction | `packages/hq/src/{workspace,install,lifecycle}` | `services/plugin-management/` | Treat registry, install state, and lifecycle gates as one service boundary. | Pulls real capability truth out of the transitional HQ package and removes duplicated plugin logic. |
| `support-example` authority collapse | `services/support-example` plus `plugins/workflows/support-example` | `services/support-example` as sole owner, with retained async projection only if needed | Collapse dual authority per Tier 4. | Rebuilds the projection from one truth owner. |
| HQ operations service extraction | `apps/cli/src/lib/hq-status.ts` | `services/hq-operations/` | Extract the operational health model into a service. | Classification per Tier 2; same standard as all other service promotions. |
| Plugin topology policy | `plugins/{agents,api,cli,web,workflows}/*` | `plugins/{server,async,web,cli,agent}/*` | Treat the role-first rename as one coupled topology/policy decision; staging remains an implementation concern. | Keeps the proposal at policy level while acknowledging discovery/install/lifecycle/test coupling. |

### Truth To Projection Map

All rows below assume the reserved HQ app seam. Until that seam is implemented, current `apps/server`, `apps/web`, and `apps/cli` remain transitional runtime homes.

| Truth owner | Projection path(s) | HQ role(s) | Proposal note |
|---|---|---|---|
| `services/coordination` | `plugins/server/api/coordination` plus an async/runtime seam from decomposed coordination runtime support (`TBD`) | `server`, `async` | `packages/coordination-inngest` does not merge wholesale into service truth. |
| `services/state` | `TBD` | `server`, optional `cli` | Exact projection path stays open, but state truth remains service-owned. |
| `services/journal` | `TBD` | `cli`, `agent` (`TBD exact mix`) | Projection mix stays open without changing journal truth ownership. |
| `services/security` | `TBD` | `cli`, `agent`, `server` (`TBD exact mix`) | Keep security semantics service-owned even if operator-facing projections diversify later. |
| `services/session-intelligence` | `plugins/cli/commands/session-tools` | `cli` | Future agent-facing projection may be earned later, not assumed now. |
| `services/plugin-management` | `plugins/cli/commands/plugins` | `cli` | This service stays the truth owner even as plugin-topology policy changes land. |
| `services/agent-config-sync` | `TBD` | `cli`, `agent` (`TBD exact mix`) | Projection path remains open; sync truth and conflict policy stay centralized. |
| `services/hq-operations` | `TBD` (likely `cli` projection initially) | `cli` | Future projections (agent, web dashboard) may be earned later. Needs oRPC contract. |
| `services/example-todo` | `plugins/server/api/example-todo` | `server` | This remains the golden reference pattern. |
| `services/support-example` | `plugins/async/workflows/support-example` if retained | `async` (+ server trigger seam only if later earned) | Authority collapse per Tier 4. |

## Dependency Direction After Restructure

In this architecture, **packages** provide support matter (reusable utilities and SDKs with no business truth), **services** own capability truth (domain models, business invariants, authoritative writes), **plugins** are projections that surface service truth into runtime surfaces, and **apps** hold composition authority (manifests and entrypoints that assemble projections into deployable shapes).

```
packages (support) -> services (truth) -> plugins (projection) -> apps (composition)
                                                                    |
                                             manifest -> entrypoints/runtime helpers -> bootgraph -> process
```

All current violations would be resolved:
- `core` no longer contains service implementations
- `cli` no longer directly imports a plugin
- `hq` facade package eliminated -- service-grade subpaths promoted, utilities kept or folded
- coordination truth is separated from transitional Inngest/runtime support and observability support matter instead of merged wholesale
- plugin workflow split-brain ownership collapses into a single service truth owner
- Plugin lifecycle code deduplicated -- truth lives in service, plugin re-exports
- Agent-sync recognized as service, not utility
- Session-tools recognized as service, not utility
- hq-status.ts extracted from app-local into `services/hq-operations/`
- the root `rawr.hq.ts` bridge retires in favor of reserved app manifest + entrypoint seams

`packages/bootgraph/` is reserved as downstream process-local lifecycle support only. It remains below app composition authority: entrypoints and runtime helpers decide what boots in one process, and bootgraph only realizes that process safely.

---

## SDK Foundation: Prerequisite for Service Promotions

The `services/example-todo/src/orpc/` directory contains a mature proto SDK (~30 files, ~1800 lines) that defines the complete oRPC boundary shell pattern for services: context type system, middleware factories, baseline observability/analytics, service definition, domain-package boundary, port interfaces, and placeholder host adapters. This proto SDK is currently trapped inside a single service. Promoting it to `packages/hq-sdk/` is a prerequisite for all 8 service promotions -- without it, each new service would need to copy the proto SDK, import from example-todo internals, or reinvent the patterns.

The existing `@rawr/hq-sdk` package (5 files, ~100 lines) is an earlier draft that the proto SDK has already superseded in every dimension. The promotion **replaces** the existing hq-sdk contents, not layers on top of them.

**Compressed subpath exports** (post-promotion):

| Subpath | Provides |
|---|---|
| `.` (root) | Curated re-export: `defineService`, `schema`, `BaseDeps`, `BaseMetadata`, port types, `defineDomainPackage`, provider middleware |
| `./service` | `defineService()`, `ServiceDeclaration`, `ServiceTypesOf`, `AnyService`, projection helpers |
| `./boundary` | `defineDomainPackage()`, `DomainPackage<T>`, lane inference types |
| `./context` | `ExecutionContext`, `ORPCInitialContext`, `DeclaredContext`, `ProvidedContext`, reserved key types |
| `./ports`, `./ports/*` | `AnalyticsClient`, `Logger`, `Sql`, `DbPool`, `FeedbackClient` |
| `./middleware` | Baseline + required + additive middleware for analytics and observability; feedback and SQL providers; policy type |
| `./schema` | `schema()`, `typeBoxStandardSchema()` |
| `./host-adapters/*` | Placeholder adapters for analytics, feedback, logger (test/dev use) |

**What stays in example-todo**: Only the domain-specific in-memory SQL host adapter (references todo-specific schemas). After promotion, example-todo imports from `@rawr/hq-sdk` instead of its local `./orpc/` directory.

**Gaps**: The SDK currently covers the service shell only. A plugin shell pattern (`definePlugin()`, plugin registration interfaces) and boot-module integration types are identified as future work (see "What This Does NOT Cover").

The subpath export surface, promotion scope, and gap analysis above are sufficient to execute this prerequisite.

---

## Execution Priority (suggested order)

**Prerequisite: SDK Foundation (hq-sdk promotion)** -- Promote the proto SDK from `services/example-todo/src/orpc/` to `packages/hq-sdk/`, replacing the existing 5-file draft. Validates by confirming example-todo still works with imports from `@rawr/hq-sdk`. This is a prerequisite for the service promotions below.

1. **Reserve the future HQ app seam** -- establish `apps/hq/rawr.hq.ts` and `apps/hq/{server,async,web,dev}.ts` as the target topology, with optional `cli.ts` only if later earned. Treat current root `rawr.hq.ts` and current `apps/server`, `apps/web`, and `apps/cli` as transitional runtime homes. Also create `packages/bootgraph/` as an empty reserved package (downstream process-local lifecycle support; API and internals deferred).
2. **Coordination truth extraction plus runtime/support decomposition** (requires SDK foundation) -- promote `packages/coordination` to service truth, move coordination/state handlers out of `@rawr/core`, keep `packages/coordination-observability` as support matter, and decompose `packages/coordination-inngest` around service-truth vs async/runtime seams instead of merging it wholesale into the service.
3. **Support-example authority collapse** (requires SDK foundation) -- make `services/support-example/` the sole truth owner, then rebuild any retained workflow projection outward from that owner.
4. **State service promotion** (requires SDK foundation) -- straightforward move, already has oRPC contracts.
5. **Plugin Management service extraction + scaffold package extraction** (requires SDK foundation) -- extract workspace + install + lifecycle from `packages/hq` into `services/plugin-management/` and deduplicate the copied lifecycle/install logic in `plugins/cli/plugins/`. Extract `packages/hq/src/scaffold/` into standalone `packages/scaffold/`. After this step, `packages/hq` is fully decomposed and retired (deleted).
6. **Plugin topology/policy rename** -- land the role-first plugin policy after plugin-management extraction; staging details stay subordinate to the coupled policy described above.
7. **Session Intelligence service promotion** (requires SDK foundation) -- promote `packages/session-tools` to `services/session-intelligence/`. Needs oRPC contracts.
8. **Agent Config Sync service promotion** (requires SDK foundation) -- promote `packages/agent-sync` to `services/agent-config-sync/`. Needs oRPC contracts. Large package (2000+ lines) with write authority and conflict resolution.
9. **Journal + Security service promotion** (requires SDK foundation) -- need oRPC contracts created (follow example-todo pattern).
10. **HQ Operations service extraction** (requires SDK foundation) -- extract `hq-status.ts` from `apps/cli/` into `services/hq-operations/`. Needs oRPC contract design. Lower priority because it is currently self-contained (single file).
11. **`core` split** -- after coordination/state handlers move out, core becomes genuinely minimal. `hq-router.ts` stays in core until the HQ app seam lands and provides a composition home for it.
12. **Minor cleanups** -- eslint-fixtures tag, inngest auth extraction, security wrapper elimination, phantom dep cleanup, etc.

---

## Risk Notes

| Risk | Mitigation |
|---|---|
| Coordination truth vs runtime/support decomposition could collapse back into one vague move | Keep `packages/coordination` as service truth, keep `coordination-observability` package-scoped support matter, and decompose `coordination-inngest` explicitly around async/runtime seams instead of merging wholesale |
| Journal/security have no oRPC contracts yet | Create contracts following example-todo pattern before or during promotion |
| Session-intelligence and agent-config-sync need new oRPC contracts | Same pattern. Agent-config-sync is particularly large (2000+ lines) -- plan contract surface carefully. |
| Plugin Management service combines 3 `packages/hq` subpaths | These subpaths share a coherent capability boundary (plugin registry, install, lifecycle). If the combined service proves too broad, split into plugin-registry and plugin-lifecycle as a second move. |
| HQ app seam reservation could sprawl into premature manifest/entrypoint implementation design | Keep `apps/hq/*` reservation structural only: manifest becomes composition-only, entrypoints/runtime helpers keep wiring, and exact migration mechanics stay deferred |
| Bootgraph reservation could accidentally become a bootgraph design chapter | Reserve `packages/bootgraph/` as downstream process-local lifecycle support only; defer API, internals, and migration details |
| Lifecycle code duplication (package + plugin) | Deduplicate during or immediately after Plugin Management service extraction. The plugin keeps its CLI surface but imports all business logic from the service. |
| `core` split touches many consumers (7 packages depend on it) | Split incrementally: move router impls first, then update consumer imports |
| `rawr.hq.ts` cleanup touches boot path | Test boot after each change; keep cohosted dev.ts working |
| Plugin directory restructure touches discovery, install, lifecycle, tests, and phase scripts | Keep the proposal at the coupled-policy level and let implementation planning sequence the staged cutover mechanics |
| Support-example authority collapse is high-effort | Collapse truth into the service first, then rebuild only the retained async/runtime projection |
| HQ Operations extraction is a single-file service promotion | Currently self-contained in one 725-line file. Low risk but needs oRPC contract design. |
| SDK promotion adds `@opentelemetry/api` as a new transitive dependency for all services | This is the lightweight API-only package (~50KB), not the full OTel SDK. Acceptable. |
| Plugin shell pattern not yet defined in SDK | SDK currently covers the service shell only. Plugin shell (`definePlugin()`, registration interfaces) is a gap to address before plugin proliferation. Track in "What This Does NOT Cover." |

---

## What This Does NOT Cover

### Deferred design decisions

These items need resolution before or during implementation but are intentionally left open in this proposal:

- Whether `packages/control-plane` should be split so that `RiskTolerance` moves to the security service and sync config concepts move to agent-config-sync (deferred to service extraction phase)
- Final package names and exact decomposition boundaries for the current `packages/coordination-inngest` mixed runtime/support matter
- Whether Inngest ingress signature support stays within coordination-adjacent support or later earns a dedicated `packages/inngest-auth` package
- Plugin SDK shell pattern (`definePlugin()`, plugin registration interfaces) -- identified as a gap, to be addressed before plugin count grows
- Exact app-manifest / entrypoint migration mechanics. The future `apps/hq/*` seam is reserved, but the implementation path from the current root bridge and current app homes is deferred.
- Per-service oRPC contract design (the SDK provides `defineService` + `schema()` + contract builder; individual contract surfaces are a per-service design task)
- Whether the residual `packages/core` should be renamed to `packages/cli-base` after the router implementations are extracted

### Out of scope

These are separate workstreams with no bearing on the structural decisions in this proposal:

- Service-internal module structure (that's implementation detail)
- Bootgraph implementation details. `packages/bootgraph/` is reserved, but this proposal does not define its API, internals, migration path, or claim that any current files already move there.
- Railway deployment topology changes
- Plugin runtime composition mechanism changes
- Web app micro-frontend architecture
- SDK-internal module structure beyond the subpath export surface
- Nx workspace configuration updates (`project.json`, workspace layout, Nx plugin configuration). Every package/service move in this proposal implies corresponding Nx configuration changes. This is an implementation concern, not a proposal concern.
- Test suite migration. Existing test suites, test fixtures, and test configuration will need to move alongside their packages/services. The mechanics of test migration are an implementation concern.
