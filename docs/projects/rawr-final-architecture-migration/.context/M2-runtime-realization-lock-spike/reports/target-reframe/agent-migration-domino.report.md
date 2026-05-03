# Migration-Domino Evaluator Report

## Direct Sequencing Verdict

Keep the seven-domino M2 shape, but rewrite what the first three dominos lock. The prior spike was too conservative because it treated `packages/runtime/*` and `@rawr/hq-sdk` as if current repo topology deserved preservation. Under the target-authority frame, that is backwards: current repo reality is the material being migrated, and the target geometry should steer the first runtime implementation.

The right M2 shape is still:

```text
U00 -> U01 -> U02 -> U03 -> U04 -> U05 -> U06
```

The corrected interpretation is:

- U00 is not only "replace legacy cutover"; it is the first target-foundation cut. It must instantiate the target package/import geometry before the bridge dies.
- U01 still hardens bootgraph lifecycle, but under target runtime roots and target names.
- U02 becomes the real semantic lock point for compiler, `RuntimeAccess`, service dependency closure, resource/provider coverage, and the minimal runtime catalog/topology seed.
- U03 must include the full active async surface family: workflows, schedules, and consumers. Consumers may be thinner than workflows/schedules, but their plan shape cannot be left undefined.
- U04 remains the public builder cleanup, but public names used by U00-U03 must already be target-canonical when first introduced.
- U05 and U06 prove and ratchet; they are not where target topology or core runtime semantics get decided.

The macro order remains sound. The issue docs should be reshaped so each domino lays target-state pieces, not repo-transitional pieces with a promise to rename them later.

## Evidence Anchors

- The current M2 milestone says the runtime subsystem is `packages/runtime/*` and the public seam is `packages/hq-sdk` ([M2 milestone lines 60-85](../../../../milestones/M2-minimal-canonical-runtime-shell.md#phase-2-package-topology)). It also says the order is load-bearing and Effect enters in U00 ([lines 181-193](../../../../milestones/M2-minimal-canonical-runtime-shell.md#domino-order)).
- U00 currently requires deleting the bridge, creating substrate/bootgraph/Elysia harness, and exposing `defineApp()` / `startAppRole()` from `packages/hq-sdk` ([M2-U00 lines 18-51](../../../../issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md)).
- Alt-X-2 defines the target laws: RAWR owns meaning, Effect owns provisioning mechanics, SDK derives, adapters lower, frameworks keep semantics, and runtime remains downstream ([Alt-X-2 lines 105-145](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md)).
- Alt-X-2's topology target separates RAWR-owned core, support packages, top-level `resources/`, flat `services/`, projection `plugins/`, and app-owned runtime profiles ([Alt-X-2 lines 218-346](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md)). With the user correction, this should become `packages/core/sdk`, `packages/core/runtime`, top-level `resources/`, `services/`, `plugins/`, and `apps/`.
- Alt-X-2 makes the runtime compiler responsible for resource requirements, provider selections, service binding plans, surface runtimes, and topology seed, while explicitly not acquiring resources ([Alt-X-2 lines 2437-2500](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md)).
- Alt-X-2 makes the Effect kernel own scopes, provider acquisition, config, runtime schema, errors, coordination primitives, and observability ([Alt-X-2 lines 2530-2559](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md)).
- Alt-X-2 makes process runtime own `ProcessRuntimeAccess`, `RoleRuntimeAccess`, service binding, mounted surfaces, topology metadata, and harness handoff ([Alt-X-2 lines 2562-2587](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md)).
- Alt-X-1 is explicit that resources include telemetry, config, database pools, queues, caches, and machine capabilities, and that the runtime provisions them ([Alt-X-1 lines 268-272](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md)).
- Alt-X-1 separates `RuntimeAccess` from `RuntimeCatalog` and says the catalog observes rather than composes ([Alt-X-1 lines 298-304](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md)).
- Alt-X-1 says runtime owns service binding caches ([Alt-X-1 lines 1484-1490](/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md)).
- Current repo reality confirms transition debt: `apps/hq/server.ts` and `apps/hq/async.ts` still import `legacy-cutover`; `@rawr/hq-sdk` still exposes pre-Effect binding and local cache state; `@rawr/bootgraph` and `@rawr/runtime-context` are transient packages, not the target runtime.
- Current Phase 2 verifiers remain red in the expected places: legacy cutover still live, missing `app` / `app-runtime` public seams, and missing runtime substrate/bootgraph/Elysia packages.

## Revised Domino Ledger

| Domino | Keep | Pull earlier / revise | May temporarily tolerate | Explicit cleanup / off-ramp |
| --- | --- | --- | --- | --- |
| `M2-U00` | First live runtime cut; delete `apps/hq/legacy-cutover.ts`; server role boots canonically; Effect enters immediately. | Lock target package/import geometry first: `packages/core/sdk`, `packages/core/runtime`, public `@rawr/sdk` authoring seam, top-level `resources/`, app runtime profiles under `apps/<app>/runtime/profiles`. Implement only consumed U00 resource families: config source, process identity, telemetry/logger, sql/db pool, clock, workspace/filesystem root. `BoundaryCache` lands as runtime-internal service binding memoization, not SDK-local cache. | Existing code may be mined as implementation substrate. A temporary `@rawr/hq-sdk` wrapper should be avoided; if unavoidable inside the slice, it may not survive U00 closure as live public authority. | U00 exit deletes live bridge imports, makes server boot through target SDK/runtime roots, and proves no server path uses legacy host composition. Any package-name bridge is removed before U00 closes or explicitly demoted to a non-runtime migration helper expiring by U04. |
| `M2-U01` | Bootgraph lifecycle hardening: dependency order, identity dedupe, rollback, shutdown, tagged errors, one root managed runtime. | Rename/align around target topology and target vocabulary. Bootgraph lives under `packages/core/runtime/bootgraph`; it lowers RAWR modules to Effect work but does not own service truth, app membership, or framework semantics. | Only U00's intentionally minimal lifecycle behaviors. No alternate lifecycle engine, no SDK-visible Effect vocabulary. | U01 exit makes bootgraph hard enough that later compiler/process work never reopens lifecycle semantics. Transitional U00 shortcuts become tests or are deleted. |
| `M2-U02` | Generalize compiler and process runtime after server path and lifecycle are proven. | This is the main pull-forward point. Lock `CompiledProcessPlan`, `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, service binding plans, `serviceDep(...)`, `resourceDep(...)`, provider coverage validation, and minimal `RuntimeCatalog` / topology seed. Replace `ProcessView` / `RoleView` as live-access nouns; reserve "view" for diagnostics/read models only. Include `server.api`, `server.internal`, `async.workflows`, `async.schedules`, and `async.consumers` in the active plan grammar. | `RuntimeCatalog` persistence/export/UI may remain minimal. Generic app data caching does not need a provider yet if no proof slice declares it, but the resource/provider model must have a named `CacheResource` hook or negative-space entry by U02. | U02 exit removes compiler/process-runtime ambiguity. Any residual `ProcessView` / `RoleView` live-access references are renamed or explicitly quarantined as diagnostic views. Service dependency semantics cannot be deferred past U02. |
| `M2-U03` | Install async role through Inngest harness; prove workflows and schedules derive from compiled plans. | Treat async as a full surface family: workflows, schedules, consumers. The Inngest harness must consume compiled async surface plans and share the same managed runtime/access pattern as Elysia. Async trigger/status/cancel API remains server/internal or server/api projection, not async public API. | Consumers may receive the thinnest proof if no real consumer exists yet, but their definition, compiler lane, harness lowering hook, and diagnostic identity must be locked. | U03 exit removes direct async host glue and makes async registration plan-derived. If consumer implementation is still thin, U05 must include the proof or U06 must ledger it as a Phase 3 entry condition before generator work. |
| `M2-U04` | Replace transitional plugin builders with canonical role/surface builders. | Public authoring grammar must align by layer: authors use `useService(...)` for plugin service usage; runtime/SDK internals use `bindService(...)`; services use `serviceDep(...)` and `resourceDep(...)`; apps use provider selectors in runtime profiles. Finalize `defineServerApiPlugin`, `defineServerInternalPlugin`, `defineAsyncWorkflowPlugin`, `defineAsyncSchedulePlugin`, and `defineAsyncConsumerPlugin` for the active lane. | Migration-only builder aliases may exist only as private helpers to finish moving current plugins. They must not be exported as canonical public SDK API. | U04 exit deletes or quarantines old builders from active authoring. Any `@rawr/hq-sdk` compatibility facade, if it survived U00 for mechanical reasons, expires here. |
| `M2-U05` | Migrate proof slices onto canonical runtime shell. | Proofs must exercise the target geometry, not current package names: `example-todo` server API, HQ Ops runtime/service binding, async exemplar, resource profiles, provider coverage, BoundaryCache, RuntimeTelemetry, and RuntimeCatalog snapshots. Include one internal server proof if `server/internal` was not already exercised. | CLI/web/agent/desktop remain outside M2 if they do not affect server/async target basics. Generic `CacheResource` provider can remain unimplemented only if no proof declares cache and U06 records the named hook. | U05 exit retires transitional proof paths rather than leaving them beside canonical proofs. Any unproved active-lane surface has to be either proved here or moved into an explicit U06 closeout gap. |
| `M2-U06` | Ratchet proofs, delete transitional runtime seams, close Plateau 2. | U06 is a ratchet and truth-freeze, not a design-decision bucket. It must verify target roots, public import geometry, Effect quarantine, runtime-context absorption, no legacy host composition, active-lane builder grammar, RuntimeCatalog minimum, telemetry baseline, and negative-space ledger. | No live compatibility path. Only documented Phase 3 entry conditions for non-active roles or unused resources. | U06 exit leaves no `packages/runtime/*` or `@rawr/hq-sdk` as target-authority leftovers unless deliberately retained as non-runtime compatibility with a named owner and non-M2 purpose. `packages/runtime-context` is gone or empty with no imports. |

## Hidden Deferrals That Should Become First-Class Work

1. **Target topology/import geometry.** Prior spike treated this as a choice between current M2 and target spec. It is not. U00 must lock the target shape before runtime packages are created.
2. **SDK package identity.** `@rawr/hq-sdk` is a current package, not target public grammar. Public authoring should converge on `@rawr/sdk`; any bridge has to expire by U04 at the latest.
3. **Top-level `resources/`.** This is not optional catalog polish. U00 needs the minimal resource/provider/profile spine because provider coverage and resource acquisition are part of runtime realization.
4. **Resource vs provider terminology.** Profiles select providers for resources. If a field contains provider selections, call it `providers` or `providerSelections`, not `resources`, unless synthesis intentionally keeps the user-facing "resources" list as a selector list with explicit wording.
5. **Service dependency semantics.** `serviceDep(...)` cannot drift past U02. The compiler needs service binding DAGs and closure validation before process runtime is considered real.
6. **Caching.** Split it explicitly:
   - `BoundaryCache`: runtime-internal service binding memoization, lands U00.
   - `CacheResource`: general app/service cache resource family, named in U02 resource-model hooks and implemented only when a proof slice declares it.
7. **Telemetry and diagnostics.** `RuntimeTelemetry` lands U00 as baseline process service. `RuntimeCatalog` minimum schema/topology seed lands U02 and is proven in U05; rich export/UI can be Phase 3 only if U06 records the hook.
8. **`server/internal`.** The active server lane is both public API and trusted internal API. Compiler and builder grammar must account for both by U02/U04 even if only one gets a rich initial proof.
9. **Async consumers.** Consumers are part of the target async surface family. They cannot stay implicit until a future generator phase; lock lane grammar and harness hook in U03.
10. **Compatibility cleanup.** The old spike allowed too much "keep current seam for M2" thinking. In this repo, with no external consumers, compatibility should be exceptional, slice-local, and explicitly expiring.

## Updated Domino Map

```text
U00 Target foundation + server cut
  lock: target roots, public SDK seam, minimal resources/profiles, runtime kernel, bootgraph shell, Elysia harness, bridge deletion
  tolerate: source-mining current code only
  off-ramp: no live legacy cutover or canonical hq-sdk/runtime-context authority remains for server

U01 Bootgraph lifecycle
  lock: lifecycle graph, Effect lowering, rollback/finalization, tagged errors, one managed runtime
  tolerate: only U00-minimal lifecycle shortcuts before this slice closes
  off-ramp: no second lifecycle engine or hidden fallback

U02 Compiler + process runtime
  lock: compiled plan, service/resource deps, provider coverage, RuntimeAccess, service binding, topology seed
  tolerate: minimal catalog export/persistence, unimplemented generic cache provider if no proof needs it
  off-ramp: no undefined service dependency or process-runtime naming model remains

U03 Async runtime
  lock: Inngest harness, AsyncActivation, workflow/schedule/consumer plan grammar, async no-host-glue rule
  tolerate: thin consumer proof if no real consumer exists
  off-ramp: consumers either proved by U05 or recorded as explicit Phase 3 entry condition

U04 Canonical builders
  lock: public active-lane authoring grammar and layer-specific naming
  tolerate: private migration aliases only
  off-ramp: transitional public builders and any SDK facade expire

U05 Proof slices
  lock: server + async proof through target runtime, HQ Ops binding, resource/provider/profile proof, catalog snapshots
  tolerate: inactive roles outside M2
  off-ramp: all active-lane proofs canonical or explicitly failed closed before U06

U06 Plateau ratchet
  lock: gates, docs, import graph, Effect quarantine, no transitional runtime seams, negative-space ledger
  tolerate: no live compatibility path
  off-ramp: Phase 3 starts from target truth, not from M2 leftovers
```

## Bottom Line

M2 does not need a different number of dominos. It needs the dominos sharpened so target authority propagates from the first move. The biggest correction is that U00 must stop being "minimum runtime under current package names" and become "minimum target runtime under target geometry." Once that is true, U01-U06 remain a strong sequence: lifecycle, compiler/process runtime, async, builders, proof slices, ratchet.

The practical next edit is to update the M2 milestone and issue docs so `packages/core/runtime`, `packages/core/sdk`, public `@rawr/sdk`, top-level `resources/`, target runtime profiles, `RuntimeAccess`, `serviceDep(...)`, and the negative-space ledger are explicit milestone obligations rather than implied future cleanup.
