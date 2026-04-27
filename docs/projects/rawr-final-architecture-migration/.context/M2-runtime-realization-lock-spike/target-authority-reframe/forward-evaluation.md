# Runtime Realization Forward Evaluation

This spike evaluated Alt-X-1, Alt-X-2, the current M2 milestone, the migration plan, and current repo reality to decide whether runtime implementation can start without future renegotiation of the substrate.

The short answer: the runtime system shape is stable enough, but the replacement spec must be synthesized before production implementation. The synthesis is not more open-ended architecture work. It is a narrow lock on physical topology, public import names, and app/API grammar so M2-U00 does not start on package names or public seams that the new spec later invalidates.

The right forward move is:

1. Adopt a synthesized runtime realization spec, using Alt-X-2 as the terminology/DX spine.
2. Carry forward Alt-X-1's strongest lifecycle, flexibility, and diagnostic catalog language.
3. Keep the current M2 domino order.
4. Decide explicitly whether M2 implements under `packages/runtime/*` and `packages/hq-sdk`, or whether the architecture owner is reopening repo-root topology around `core/*`, top-level `runtime/`, and `@rawr/sdk`.

My recommendation is to keep `packages/runtime/*` and `packages/hq-sdk` for M2, and treat `@rawr/sdk` or a top-level runtime root as future packaging/topology work only if it remains worth doing after the runtime is real.

## The Forward Verdict

M2 is still the right macro sequence. It does not need to be thrown away or reshaped into a different migration phase. The stable runtime system in both alternate specs maps onto the existing M2 order:

- M2-U00 removes the live legacy cutover by creating the first canonical server runtime path.
- M2-U01 hardens bootgraph and lifecycle semantics.
- M2-U02 generalizes the compiler/process runtime after the first server path proves the shape.
- M2-U03 adds async as the second runtime proof.
- M2-U04 replaces transitional builders and finalizes authoring grammar.
- M2-U05 proves real slices.
- M2-U06 ratchets gates and deletes transition debt.

The opportunity in the new specs is not a cleaner domino order. The opportunity is a cleaner spec basis for the same domino order: clearer laws, cleaner DX vocabulary, better boundary language, and a more explicit runtime compiler/bootgraph/substrate/process-runtime/harness split.

Production implementation should not start by adopting Alt-X-1 or Alt-X-2 verbatim. Both specs are close on runtime mechanics, but both carry topology/API examples that conflict with current M2 gates and repo reality. Starting implementation before resolving that would make the first runtime packages vulnerable to an immediate path/import/API rewrite.

The next step should be a short spec-lock edit, not another broad spike:

- Synthesize the runtime realization spec.
- Normalize it to the chosen M2 topology/import surface.
- Update M2/U00 wording and gates only where names change.
- Then start M2-U00.

## What Is Hardened Enough Now

These components are stable enough to implement once topology/import names are locked:

| Component family | Classification | Forward decision |
| --- | --- | --- |
| Runtime chain | stable | Keep `entrypoint -> runtime compiler -> bootgraph -> Effect provisioning kernel -> process runtime -> harness -> process`. |
| Runtime compiler | stable | Compiler emits normalized process plans and diagnostics; it does not acquire resources or start frameworks. |
| Bootgraph | stable | Bootgraph owns dependency/lifecycle ordering, rollback, finalizers, and process/role scopes. It does not own service semantics. |
| Effect provisioning kernel | stable | Effect is mandatory inside runtime provisioning and hidden from app/service/plugin authors. One root managed runtime per started process remains the right substrate rule. |
| Process runtime | stable | Process runtime owns service binding, scoped runtime access, surface assembly, and harness handoff. |
| Harness adapters | stable | Harnesses mount native framework surfaces and keep framework semantics inside their boundary. They do not become semantic owners. |
| Boundary laws | stable | Services own truth, plugins project, apps select, resources provision substrate, frameworks execute, runtime realizes, diagnostics observe. |
| Active first lanes | stable | Server API and server internal are active runtime lanes; async workflow/schedule/consumer should be treated as the next active proof after server. CLI/web/agent/desktop stay deferred. |
| Public Effect quarantine | stable | Public RAWR APIs should not expose `Layer`, `Context.Tag`, `ManagedRuntime`, `Effect.Service`, or raw Effect resource authoring. |
| Diagnostics role | stable | Diagnostics and catalogs observe realized topology. They do not compose the app or own runtime decisions. |

This is enough to start M2-U00 after the spec-lock edit. It is not enough to skip the edit, because the unstable decisions below determine package paths, public imports, and verifier names.

## Minor Discrepancies

These should be normalized in synthesis but are not architectural blockers:

| Discrepancy | Recommended normalization |
| --- | --- |
| `startApp(...)` vs `startAppRole(...)` | Use `startApp(...)` as the final mental model if desired, but keep `startAppRole(...)` as the M2-U00 public seam or wrapper unless the U00 issue and verifiers are updated. |
| `RuntimeAccess` vs `ProcessView`/`RoleView` | Use `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess` for live runtime access. Treat `ProcessView`/`RoleView` as transitional names or public adapter views only if needed. |
| `RuntimeCatalog` vs topology catalog | Keep `RuntimeCatalog` as the public diagnostic/read-model noun. "Topology catalog" describes its contents, not a second public authority. |
| `bindService(...)` vs `useService(...)` | Prefer `useService(...)` for plugin author declarations. Reserve `bindService(...)` for SDK/runtime binding and cache mechanics. |
| `resources` vs `providers` in runtime profiles | If the value is provider selections, call the field `providers` or `providerSelections`, not `resources`. |
| Harness adapter naming | Keep concrete operational nouns: harness, adapter, function bundle, surface runtime plan. Avoid making framework names into RAWR semantic owners. |

## The Load-Bearing Locks

These decisions must be locked before runtime implementation if we want M2-U00 to survive future spec hardening.

### 1. Physical Runtime Root

Current M2 and current gates assume:

- `packages/runtime/bootgraph`
- `packages/runtime/compiler`
- `packages/runtime/substrate`
- `packages/runtime/harnesses/*`
- `packages/runtime/topology` if earned

Alt-X-1 uses `core/runtime/*`. Alt-X-2 uses `core/*` plus top-level `resources/`. The current intermediate realization spec argues for a top-level `runtime/` root and treats `packages/runtime/` as wrong.

This is the main load-bearing conflict. It is not semantic hand-waving. It determines Nx projects, package manifests, workspace globs, import paths, verifiers, and where future maintainers look for runtime ownership.

Recommendation: keep `packages/runtime/*` for M2. The runtime is not an app, service, or plugin, but in this repo it is still a package workspace concern. Moving to a top-level `runtime/` or `core/` root can be a later packaging decision if it remains valuable after implementation.

### 2. Public SDK Package

Current M2 and current repo reality use `@rawr/hq-sdk`. The alternate specs use examples like `@rawr/sdk`.

Recommendation: keep `@rawr/hq-sdk` for M2. Do not combine the runtime substrate cut with an SDK package rename. The synthesized spec can describe the package as the public RAWR SDK seam and note that the template's current package name is `@rawr/hq-sdk`.

### 3. App Input Model

Current repo reality has an explicit app manifest shaped around roles and surfaces in `apps/hq/rawr.hq.ts`. Alt-X-1 pushes toward SDK-derived plugin membership rather than manual role/surface grouping. Alt-X-2 also prefers SDK normalization from authoring definitions.

Recommendation: U00 may consume the current explicit `role -> surface -> plugin membership` shape as the first server-lane input. The compiler can normalize that shape internally. Public authoring can later move toward cleaner `defineApp(...)` ergonomics without changing the runtime substrate.

### 4. Service Dependency Semantics

Alt-X-2's `serviceDep(...)` model is attractive, but current repo services express construction lanes as TypeScript context types and client factories. The current realization spec is more cautious about semantic service dependencies versus resource dependencies.

Recommendation: U00 should only implement the service/resource derivation needed for the first server path. Do not make full sibling service dependency semantics a U00 blocker. Lock the broader service dependency model before M2-U02 or any cross-service runtime proof.

### 5. BoundaryCache Placement

Current `packages/hq-sdk` has transitional `bindService(...)` behavior and local memoization. The target runtime should own process/role scoped service binding and cache behavior under the substrate/process runtime.

Recommendation: keep the public binding gesture RAWR-shaped, but do not entrench SDK-local cache state as canonical runtime behavior.

### 6. Server Harness Extraction Boundary

Current `apps/server` owns boot, route registration, host composition, Inngest bundle construction, and plugin mounting. U00 must decide whether those pieces are mined into runtime/harness packages or whether `apps/server` becomes a thin host that delegates into `@rawr/hq-sdk/app-runtime`.

Recommendation: `apps/server` should become a thin harness/host boundary for M2. Runtime composition authority should move out of `apps/server/src/host-*` and out of `apps/hq/legacy-cutover.ts`.

## Contingent But Non-Blocking

These are important, but they should not block M2-U00 or M2-U01:

- Full public resource/provider/profile catalog.
- Full `RuntimeCatalog` schema and persistence/export format.
- CLI, web, agent, desktop, OpenShell, Electron, and other deferred harnesses.
- Complete async workflow/schedule/consumer implementation.
- Public `server/internal` builder ergonomics beyond the active server runtime proof.
- Full `runtime-context` deletion, unless U00/U02 naturally replaces all imports.
- Generator/codegen layout.
- Observability storage, rich telemetry export, and diagnostics UI.
- Final service package family rules, unless implementation begins moving service roots.

These should be carried in the synthesized spec as target architecture or later M2 work, not smuggled into the first bridge-deletion slice.

## Spec Selection

Do not choose Alt-X-1 or Alt-X-2 as-is. Choose a synthesis.

Use Alt-X-2 as the spine because it has the best DX and terminology discipline:

- It explains stable architecture versus runtime realization clearly.
- It uses operational laws rather than a long noun inventory.
- It separates public authoring terms, adapter/lowering terms, and runtime internals.
- It has cleaner public authoring instincts around resources, services, async, and harness boundaries.

Carry forward from Alt-X-1:

- The concise thesis: topology classifies, services own truth, plugins project, apps select, resources provision substrate, SDK derives, frameworks execute, runtime realizes, diagnostics observe.
- The `definition -> selection -> derivation -> provisioning` lifecycle.
- The stable flexibility section, especially what can vary without renegotiating the architecture.
- `RuntimeCatalog` as the diagnostic topology/read-model noun.
- The explicit `RuntimeAccess` versus diagnostic catalog split.

Carry forward from current M2/integrated docs:

- `packages/runtime/*` as the Phase 2 implementation topology unless explicitly overturned.
- `packages/hq-sdk` as the current public app/runtime authoring seam.
- `defineApp(...)`, `startAppRole(...)`, and `bindService(...)` as the current U00 contract, with room to map them to cleaner final names.
- Server-first then async-proof sequencing.
- No descriptor-only interlude before the bridge is deleted.

The current untracked realization spec should not be promoted unchanged because its top-level `runtime/` claim conflicts with current M2 and labels that topology as load-bearing. Either adopt that repo-root topology intentionally and rewrite M2 around it, or revise the spec so runtime realization semantics are load-bearing while the M2 package root remains `packages/runtime/*`.

## Domino Implications

M2-U00 remains the first production domino. It should get a small preface/update before implementation:

- It boots `apps/hq/server.ts` through `@rawr/hq-sdk`.
- It exposes the minimum `app` and `app-runtime` public seams.
- It creates the minimal runtime packages under the chosen runtime root.
- It creates enough substrate/bootgraph/harness implementation to remove `legacy-cutover`.
- It does not introduce broad descriptor inventory that is not consumed by the first server runtime path.

M2-U01 remains bootgraph hardening. It should use the synthesized spec's compiler/bootgraph/kernel language and avoid turning bootgraph into a service semantic owner.

M2-U02 remains compiler/process-runtime generalization. It likely needs wording updates if `server/internal` and `async/consumers` are locked as active plan shapes in the synthesized spec.

M2-U03 remains async/Inngest proof. The alternate specs strengthen the async boundary: public/internal server APIs may trigger workflows, but workflow/schedule/consumer plugins are not public APIs.

M2-U04 remains builder replacement, unless the compiler cannot honestly consume current builder output. If needed, introduce normalized internal builder records earlier, but keep broad author-facing migration in U04.

M2-U05 and M2-U06 remain proof and ratchet work. They should absorb `runtime-context`, enforce Effect quarantine, delete transitional seams, and close current-findings gates once real runtime paths exist.

## Exact Docs To Update Next

1. Create or revise the synthesized runtime realization authority:
   - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
   - or rename it to a cleaner runtime realization title if the team wants to drop `Effect` from the public document name.

2. Update M2 references away from the archived/old subsystem spec:
   - `docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md`
   - `docs/projects/rawr-final-architecture-migration/issues/M2-U00-replace-legacy-cutover-with-canonical-server-runtime.md`
   - `docs/projects/rawr-final-architecture-migration/issues/M2-U01-harden-bootgraph-and-runtime-lifecycle.md`
   - `docs/projects/rawr-final-architecture-migration/issues/M2-U02-generalize-runtime-compiler-and-process-runtime.md`
   - `docs/projects/rawr-final-architecture-migration/issues/M2-U03-add-async-runtime-lane-and-inngest-harness.md`
   - `docs/projects/rawr-final-architecture-migration/issues/M2-U04-replace-transitional-plugin-builders.md`
   - `docs/projects/rawr-final-architecture-migration/issues/M2-U06-ratchet-phase-2-proofs-and-close-the-plateau.md`

3. Update the Phase 2 section of:
   - `docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md`

4. Update guardrails and verifier language:
   - `docs/projects/rawr-final-architecture-migration/resources/spec/m2-guardrails-and-enforcement.md`
   - `scripts/phase-2/verify-*.mjs` only after doc names/topology are locked.

5. Defer the integrated final spec hardening until the runtime realization authority is locked:
   - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

## Agent Report Synthesis

The four reports are worth keeping as provenance because they contain distinct evidence:

- `initial-forward-evaluation-reports/agent-alt-x-1.report.md`: confirms the engineering core is stable and flags manifest grammar plus `core/*`/`@rawr/sdk` as normalization needs.
- `initial-forward-evaluation-reports/agent-alt-x-2.report.md`: confirms Alt-X-2 is the best synthesis source while identifying topology, entrypoint API, runtime access naming, service dependency semantics, and resource helper DX as locks.
- `initial-forward-evaluation-reports/agent-m2-repo-reality.report.md`: grounds the conclusion in current repo state: `legacy-cutover` is still live authority, `packages/runtime/*` does not exist, `bootgraph` is only a reservation, `runtime-context` is support debt, and Effect is not yet live.
- `initial-forward-evaluation-reports/agent-terminology-dx.report.md`: recommends Alt-X-2 as terminology spine, `RuntimeAccess` for live access, `RuntimeCatalog` for diagnostics, and cleaner author-facing service/resource vocabulary.

Scratch documents were intermediate working notes and should be deleted after this synthesis.

## Final Recommendation

Proceed with a synthesized runtime realization spec and keep the M2 domino order.

Do not wait for deep plugin/service internals before starting the runtime substrate. The stable boundaries are already strong enough: services own truth, plugins project, apps select, resources provision, runtime realizes, harnesses mount, and diagnostics observe. Future service/plugin internals can evolve behind those contracts.

Do not start production runtime implementation until the spec lock explicitly chooses the physical root and public import surface. That is the one decision that can still make the tower move. Once it is locked, M2-U00 can begin directly.
