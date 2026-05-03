# Alt-X-2 Evaluation: Runtime Realization Spec Lock Spike

## Verdict

Alt-X-2 is coherent and strong as a runtime-realization model, but it should not be adopted verbatim as the canonical M2 basis. Its engineering spine is stable: app composition lowers into a process plan, bootgraph owns lifecycle ordering, Effect owns hidden provisioning, process runtime binds services and projects plugins, and harnesses host native surfaces. That aligns with M2's goal to remove the legacy cutover and install a minimal canonical runtime shell.

The blocker is not the runtime idea. The blocker is translation. Alt-X-2 uses `core/` plus top-level `resources/` as canonical physical roots, `startApp(...)` as the entrypoint API, `RuntimeAccess` as the runtime view name, and direct service-to-service dependency declarations. Current M2 execution docs require `packages/runtime/*`, `packages/hq-sdk`, `startAppRole(...)`, `ProcessView`/`RoleView`, and a first server cut that must not pull broad descriptor/catalog generalization forward. Adopt Alt-X-2 as a synthesis source, not as a drop-in replacement.

## Stable Components

Alt-X-2's runtime chain is load-bearing and aligned: `entrypoint -> SDK-normalized authoring graph -> runtime compiler -> compiled process plan -> bootgraph -> Effect provisioning kernel -> RuntimeAccess -> process runtime -> harnesses -> running process` (`Alt-X-2:14-20`, `2439-2452`). This matches M2's execution target that apps choose roles, services own semantics, plugins project capabilities, and runtime realizes execution through an Effect-backed kernel without becoming a second semantic plane (`M2:22-28`, `M2:60-85`).

The Effect boundary is stable. Alt-X-2 says RAWR owns semantic meaning, Effect owns provisioning mechanics, SDK owns derivation, adapters own lowering, and native frameworks keep their semantics (`Alt-X-2:107-119`). Its kernel owns one root managed runtime, process/role scopes, resource acquisition/release, config, errors, local coordination, and telemetry (`Alt-X-2:2530-2560`). That is the same architectural posture M2 enforces: raw Effect vocabulary stays quarantined inside runtime internals, and ordinary authors do not write `Layer`, `Context.Tag`, `ManagedRuntime`, or `Effect.Service` (`M2:138-154`, `M2-U00:34-42`, `M2-U01:34-40`).

The ownership split is stable. Alt-X-2's bind/project/compose/realize chain says services own capability truth, plugins project that truth into one role/surface/capability lane, apps select projections and profiles, and entrypoints realize process shapes (`Alt-X-2:131-145`, `1636-1754`, `2285-2433`). This reinforces the migration plan's Phase 2 rule set rather than replacing it (`Plan:931-941`, `Plan:1135-1143`).

The server and async lane split is stable. Public APIs live under `plugins/server/api`, trusted internal RPC under `plugins/server/internal`, async workflow/schedule/consumer surfaces stay under `plugins/async/*`, and public/internal trigger routes wrap a workflow dispatcher rather than making workflow plugins public APIs (`Alt-X-2:1760-1878`, `1917-1935`, `2103-2185`). This fits the active `server + async` lane and should survive future plugin/service internals work.

The lifecycle split is stable enough for M2-U00/U01. Alt-X-2 gives the compiler plan-only responsibility (`Alt-X-2:2454-2500`), bootgraph lifecycle ordering/rollback/finalizers (`Alt-X-2:2502-2528`), process runtime binding/projection/topology handoff (`Alt-X-2:2562-2587`), and harness host mounting (`Alt-X-2:2589-2609`). That maps cleanly onto the existing M2 domino order: first server path, then bootgraph hardening, then compiler/process-runtime generalization (`M2:181-193`, `M2-U00:64-72`, `M2-U01:48-69`).

## Unstable Or Load-Bearing Conflicts

The physical topology is the largest conflict. Alt-X-2 makes `core/` the RAWR-owned system foundation and puts authored resources at top-level `resources/` (`Alt-X-2:220-346`). Current M2 requires `packages/runtime/{bootgraph,compiler,substrate,harnesses,topology}` and keeps public authoring APIs in `packages/hq-sdk` (`M2:60-85`, `Plan:943-972`). This is load-bearing for M2-U00 because the issue explicitly requires `packages/runtime/substrate`, `packages/runtime/bootgraph`, and `packages/runtime/harnesses/elysia` (`M2-U00:34-49`, `64-68`). If we choose Alt-X-2's `core/` topology, M2 is no longer a detail swap; the migration plan must be resequenced around a repo-root topology move.

The public entrypoint API is not locked. Alt-X-2 uses `startApp({ app, profile, roles: [...] })` (`Alt-X-2:2375-2415`). M2-U00 requires `defineApp()` and `startAppRole()` exposed from `packages/hq-sdk` (`M2-U00:27-33`, `64-80`), and the current verifier checks for `packages/hq-sdk/src/app-runtime.ts` exporting `startAppRole()`. This is a small API decision, but it is U00-blocking because the public seam and verifier name are already part of the slice contract.

The service dependency model needs a lock. Alt-X-2 treats sibling service dependencies as declarative `serviceDep(...)` entries that the runtime can resolve as in-process clients or internal RPC clients depending on placement (`Alt-X-2:1356-1393`). The current realization spec distinguishes generic resource dependencies from semantic dependencies and requires explicit adapters for semantic deps (`Current Spec:1052-1102`). This is not blocking for the first bridge-deletion cut if U00 only needs resource-backed service binding, but it is load-bearing before M2-U02 or any cross-service runtime dependency proof.

The runtime-view/access name is unsettled. Alt-X-2 uses `ProcessRuntimeAccess`/`RoleRuntimeAccess` and says diagnostics/catalog projections are separate (`Alt-X-2:178-184`, `1022-1113`). M2 and current code already use `ProcessView`/`RoleView` language in the milestone and transitional `@rawr/hq-sdk/plugins` seam (`M2:51`, `112-116`; `packages/hq-sdk/src/plugins.ts` currently exports `ProcessView`/`RoleView`). This is mostly terminology, but it becomes load-bearing once M2-U02 exposes process-runtime APIs.

The resource authoring surface is a DX decision, not a runtime blocker. Alt-X-2 intentionally exposes one `defineRuntimeResource(...)` helper with lifetimes as data and rejects separate lifetime-specific public helpers (`Alt-X-2:686-723`). The current realization spec exposes `defineProcessResource(...)`, `defineRoleResource(...)`, and `defineRuntimeResource(...)` (`Current Spec:602-652`). This is not required to delete the legacy bridge, but it should be locked before public resource catalog work or generator work.

## Contingent But Valuable

Alt-X-2's top-level resource catalog and provider selectors are directionally good, but should not be pulled wholesale into M2-U00. M2-U00 explicitly says no descriptor-only inventory ahead of runtime use and no broader declaration grammar beyond bridge deletion (`M2-U00:27-33`, `53-62`, `107-113`). Keep the resource/provider/profile model as the target, but only implement the minimum resources consumed by the first server runtime path.

CLI, web, agent, and desktop surfaces are well-framed but deferred. Alt-X-2 gives native lowering paths for OCLIF, web, OpenShell-backed agent, and Electron desktop (`Alt-X-2:2199-2279`), but M2 says `server` and `async` are mandatory while `web`, `cli`, and `agent` remain optional or reserved (`M2:138-149`, `Plan:931-941`, `Plan:1049-1082`). These sections are useful for future consistency checks, not for the next domino.

Async workflows and Inngest lowering are coherent but belong after the server/runtime bridge cut. Alt-X-2's `WorkflowDefinition`, `ScheduleDefinition`, dispatcher, Inngest client resource, and worker/serve mode split are solid (`Alt-X-2:1917-2195`). They support M2-U03, not M2-U00/U01.

The topology catalog, diagnostics, observability chain, and error boundaries are good hardening targets (`Alt-X-2:2613-2697`), but rich topology should not precede the minimum runtime shell. M2 already treats topology as "if earned" and starts with current-findings proof wiring (`M2:75-80`, `156-180`).

## M2-U00/U01 Implications

We can start laying runtime-system dominos if the orchestrator treats Alt-X-2 as a synthesis input and immediately resolves the small set of load-bearing translations. The first domino remains M2-U00: delete `apps/hq/legacy-cutover.ts`, stand up `packages/runtime/substrate`, `packages/runtime/bootgraph`, the minimum `packages/hq-sdk` app-runtime seam, and the Elysia server harness (`M2-U00:18-23`, `64-72`). Alt-X-2 supports that order.

Do not implement Alt-X-2's full `core/`, `resources/`, all-role harness, and public resource catalog topology as U00. That would widen the slice and violate the existing "minimum server-only path" constraint (`M2-U00:53-62`, `107-113`). The clean move is: keep M2 order, update the spec language around the runtime chain and boundaries, and translate Alt-X-2's stable concepts into the current package topology unless the architecture owner explicitly chooses a repo-root topology change.

Current diagnostic grounding confirms U00 is still red in the expected places: `apps/hq/server.ts` imports `./legacy-cutover`; `apps/hq/legacy-cutover.ts` still imports `../server/src/host-composition`; `packages/runtime/substrate`, `packages/runtime/bootgraph`, `packages/runtime/harnesses/elysia`, `packages/hq-sdk/src/app.ts`, and `packages/hq-sdk/src/app-runtime.ts` do not yet exist; current-findings gate wiring is present.

## Recommendation

Use Alt-X-2 as a primary source for synthesis, not as the canonical document unchanged. Its runtime realization model is strong, modular, and semantically clean. Its terminology is mostly good engineering vocabulary: compiler, bootgraph, provisioning kernel, process runtime, harness, resource, provider, profile, access. It avoids turning Effect, oRPC, Inngest, OCLIF, Elysia, agent, or desktop frameworks into peer semantic owners.

Before canonicalizing it, lock these decisions:

1. Physical topology: preserve `packages/runtime/*` + `packages/hq-sdk` for M2, or explicitly replace M2 with an adopted `core/` topology migration.
2. Entrypoint API: `startAppRole(...)` for U00, with optional later `startApp(...)`/`startAppRoles(...)` convenience, or rename the U00 contract.
3. Runtime access naming: choose `ProcessView`/`RoleView`, `ProcessRuntimeAccess`/`RoleRuntimeAccess`, or a deliberate mapping.
4. Service dependency semantics: decide whether sibling service deps are direct `serviceDep(...)` declarations or semantic dependencies requiring explicit adapters.
5. Resource helper DX: one `defineRuntimeResource(...)` with lifetime metadata versus lifetime-specific helpers.

With those locked, Alt-X-2 gives enough confidence to begin M2-U00 without waiting on plugin/service internals. Without those locks, U00 could still start as a narrow bridge-deletion cut, but the public SDK/resource/service-dependency surfaces would need to stay intentionally minimal until synthesis resolves the naming and topology choices.
