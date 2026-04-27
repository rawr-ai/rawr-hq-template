# Terminology/DX Layer Evaluator Report

## Verdict

The target naming contract should use Alt-X-2's layer model, sharpen it with Alt-X-1's `RuntimeAccess` / `RuntimeCatalog` split, and reject current repo naming where it is migration scaffolding. The correct rule is not "pick the old name or the new name." The correct rule is: name the thing from the layer that owns it.

This produces one firm correction to the prior spike: `startAppRole(...)` should not survive as a canonical public API. It is a migration-era helper name that makes role selection sound like a distinct operation. Target entrypoints call `startApp(...)`; role/harness selection is input data or a harness descriptor concern, not a verb.

## Target Terminology By Layer

| Layer | Canonical terms | Forbidden drift | Rationale |
| --- | --- | --- | --- |
| Author-facing app/entrypoint | `defineApp(...)`, `startApp(...)`, `AppDefinition`, `Entrypoint`, `RuntimeProfile` | `startAppRole(...)`, `startAppRoles(...)` as canonical APIs | Alt-X-1 and Alt-X-2 both center `startApp(...)`; current M2 `startAppRole(...)` is transition wording. Entrypoints select what to realize; they do not redefine app membership. Evidence: Alt-X-1 `:2191-2208`, Alt-X-2 `:2380-2415`, migration plan `:1091-1093`. |
| Service authoring | `defineService(...)`, `resourceDep(...)`, `serviceDep(...)`, `semanticDep(...)`, `deps`, `scope`, `config`, `invocation`, `provided` | `useService(...)` inside service dependency declarations; treating service deps as resources | A service declares construction-time dependencies. `resourceDep(...)` is provisionable host capability; `serviceDep(...)` is service-to-service client dependency; `semanticDep(...)` requires an explicit adapter. Evidence: Alt-X-2 `:1360-1391`, current realization spec `:1034-1101`. |
| Plugin authoring | `PluginDefinition`, `PluginFactory`, `useService(...)`, builder-specific terms like `api(...)`, `workflows`, `commands`, `routeBase`, `capability` | generic `adapter.kind` fields in public authoring; `bindService(...)` in plugin definitions | Plugins declare service use and native surface facts. The SDK/runtime derives binding and mounting. Evidence: Alt-X-2 `:1722-1732`, `:1791-1813`, `:3030-3062`; Alt-X-1 `:1568-1601`. |
| SDK/lowering | `ServiceBindingPlan`, `ProviderSelection`, `ResourceRequirement`, `SurfaceRuntimePlan`, `FunctionBundle` | publicizing lowering nouns as normal authoring concepts | Lowering names should be concrete because they are mechanical. `FunctionBundle` is correct for Inngest harness payload, not for public workflow authoring. Evidence: Alt-X-2 `:431-510`, `:2107-2164`. |
| Runtime internals | `runtime compiler`, `compiled process plan`, `bootgraph`, `Effect provisioning kernel`, `process runtime`, `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `ServiceBindingCache` | `RuntimeView`, `ProcessView`, `RoleView` for live access; manual author cache keys | Runtime internals need operational engineering names. Current `ProcessView` / `RoleView` and `cacheKey` are migration scaffolding in `packages/hq-sdk/src/plugins.ts:12-31` and `:61-114`. Target live access is `RuntimeAccess`. Evidence: Alt-X-2 `:1022-1113`; current realization spec `:2747-2798` shows the name to replace. |
| Harness/native framework | `Harness`, `HarnessAdapter`, `SurfaceAdapter`, `Elysia harness`, `Inngest harness`, `OCLIF harness`, native names like `FunctionBundle` only at the harness boundary | letting harness vocabulary become app/service/plugin authority | Harnesses mount concrete hosts. Surface adapters expose only native facts needed for topology and mounting. Evidence: current realization spec `:1568-1636`; Alt-X-1 `:2437-2461`; Alt-X-2 `:2260-2279`, `:2872-2885`. |
| Diagnostics/control-plane | `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeDiagnosticContributor`, topology/catalog/read model | `RuntimeAccess` as diagnostics; `view` as live handle | `RuntimeCatalog` observes what was selected, derived, provisioned, bound, projected, and mounted. It does not compose or mutate. Evidence: Alt-X-1 `:298-304`, `:2483-2527`; Alt-X-2 `:2613-2658`; current realization spec `:2985-3011`. |

## Naming Locks

### Start APIs

Lock `startApp(...)` as the only canonical start verb. Delete `startAppRole(...)` and `startAppRoles(...)` from target docs rather than preserving them as alternate authoring APIs.

The remaining design question is input shape, not verb naming. Alt-X-1/Alt-X-2 show `roles` input. The current realization spec shows `harnesses` input and says harness descriptors can derive role selection. Terminology recommendation: prefer `startApp({ app, profile, harnesses })` if the target entrypoint selects concrete process hosts; use `roles` only as explicit process-shape data when a harness descriptor cannot infer it. Do not express either as `startAppRole`.

### Service Use, Service Dependencies, And Binding

Allow `useService(...)`, `serviceDep(...)`, and `bindService(...)` to coexist because they belong to different layers:

- `serviceDep(...)`: service authoring. A service declares another service client in its own construction-time dependency lane.
- `useService(...)`: plugin authoring. A plugin declares that its projection needs a service client.
- `bindService(...)`: SDK/runtime operation. The runtime attaches resources, sibling service clients, scope, and config to construct the live service client.

Do not use `useService(...)` as the service-definition dependency helper. Alt-X-1 does this in one example, but Alt-X-2 and the current realization spec are sharper: service dependency declarations are not plugin service uses. Evidence: Alt-X-1 `:1381-1405`, Alt-X-2 `:1360-1391`, current realization spec `:1034-1101`.

### Resources, Providers, Profiles

Keep the nouns:

- `RuntimeResource`: provisionable capability/value contract.
- `RuntimeProvider`: implementation that acquires/provides a resource.
- `RuntimeProfile`: app/environment selection of providers, config sources, and process defaults.

Rename profile fields that contain provider selections to `providers`, not `resources`. Alt-X-2's `resources: ProviderSelection[]` blurs requirement with implementation selection. Alt-X-1's `providers: ProviderSelection[]` is the correct DX because "resources" are what services/plugins require; "providers" are what profiles select. Evidence: Alt-X-1 `:859-914`, Alt-X-2 `:951-969`.

Avoid names like `EmailProviderResource` unless the exposed value really is a provider. Resource names should describe the consumed capability (`EmailSenderResource`, `SqlPoolResource`, `ClockResource`). Provider names should describe the implementation (`ResendEmailProvider`, `PostgresSqlProvider`, `SystemClockProvider`).

### Runtime Access And Catalog

Lock:

- `RuntimeAccess`
- `ProcessRuntimeAccess`
- `RoleRuntimeAccess`
- `RuntimeCatalog`

Rename:

- `RuntimeView` -> `RuntimeAccess`
- `ProcessView` -> `ProcessRuntimeAccess`
- `RoleView` -> `RoleRuntimeAccess`

Reserve "view" for read models, UI/state projections, or diagnostics. A live access handle that can retrieve provisioned resource values is not a view. Evidence: Alt-X-2 `:1022-1113`; current realization spec `:2747-2798`; current code `packages/hq-sdk/src/plugins.ts:12-31`.

### Caching

Caching is not a minor boundary detail. For M2, the load-bearing runtime component should be named `ServiceBindingCache`, with internal `ServiceBindingCacheKey` derivation from canonical inputs: process, role, surface, capability, service identity, dependency instances, scope, and config. Alt-X-1 already says runtime owns binding caches and derives rebuild boundaries. Evidence: Alt-X-1 `:1470-1496`; current code exposes manual `cacheKey` in `packages/hq-sdk/src/plugins.ts:61-65` and host code hand-rolls keys in `apps/server/src/host-satisfiers.ts:74-104`.

Do not expose generic `cacheKey` authoring as target DX. If explicit cache policy becomes necessary, name it `CachePolicy` at the SDK/runtime lowering layer and give it an expiration/ownership rule. Do not let plugin authors manually encode process/role/service identity strings.

### Telemetry And Diagnostics

Use distinct terms:

- `RuntimeTelemetry`: runtime-owned spans/events/annotations chain.
- `RuntimeDiagnostic`: structured finding or status.
- `RuntimeCatalog`: diagnostic topology/read model.
- `LoggerResource` / `TelemetryResource`: only if a service/plugin truly consumes telemetry as a declared runtime resource.

Do not use "observability" as a catch-all API noun. Observability is a category; telemetry, diagnostics, logging, and catalog export are different components. Evidence: Alt-X-2 `:2660-2674`; current realization spec `:2700-2702`; Alt-X-1 `:2887-2906`.

### Harness And Adapter Terms

Use `Harness` for concrete host runtime ownership. Use `HarnessAdapter` for runtime-internal mounting implementation. Use `SurfaceAdapter` for the narrow lowering boundary where native surface facts are exposed to topology and mounting.

Public plugin authors should mostly see builder-specific vocabulary, not generic adapter machinery. For example, server API plugin authors write `api(...)` and `routeBase`; async authors write `WorkflowDefinition` / `ScheduleDefinition`; CLI authors write command concepts. A plugin author can enter native framework vocabulary inside the specific boundary callback, but the app manifest should not become a bag of generic adapter kinds.

## Rename / Preserve / Coexist

| Decision | Terms |
| --- | --- |
| Preserve as target | `defineApp`, `startApp`, `RuntimeResource`, `RuntimeProvider`, `RuntimeProfile`, `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `RuntimeCatalog`, `RuntimeDiagnostic`, `Harness`, `SurfaceRuntime`, `WorkflowDefinition`, `ScheduleDefinition` |
| Rename in target docs/code | `startAppRole` -> `startApp`; `startAppRoles` -> `startApp`; `RuntimeView` -> `RuntimeAccess`; `ProcessView` -> `ProcessRuntimeAccess`; `RoleView` -> `RoleRuntimeAccess`; profile `resources` field -> `providers` when values are provider selections |
| Keep only as internal/lowering | `bindService`, `ServiceBindingPlan`, `ServiceBindingCache`, `ProviderPlan`, `SurfaceRuntimePlan`, `FunctionBundle`, `HarnessAdapter`, `EffectLayer`, `ManagedRuntime`, `Scope`, `Fiber` |
| Can coexist because layers differ | `useService` for plugin service use; `serviceDep` for service dependency lanes; `resourceDep` for service resource deps; `requireResource` for explicit plugin/harness resource requirements; `useProvider` or provider selectors for profile selection |
| Do not canonicalize | `ColdProjection*`, broad `View` live-access nouns, public `adapter.kind` fields, author-provided service `cacheKey`, `resources` profile field for provider selections, generic `Dependency` when the thing is specifically a resource dependency or semantic dependency |

## Anti-Compromise Rules

1. Do not keep two public names for one operation. If `startApp(...)` is target, `startAppRole(...)` is deleted or explicitly marked as migration-only with a removal issue in the same milestone.
2. Do not rename a layer's real concept to make another layer feel consistent. Service authors declare `serviceDep(...)`; plugin authors declare `useService(...)`; runtime binds.
3. Do not call implementation choices resources. Resources are required capabilities; providers implement resources; profiles select providers.
4. Do not let diagnostics vocabulary leak into live execution. `RuntimeCatalog` and diagnostic views observe; `RuntimeAccess` retrieves provisioned values.
5. Do not make cache/telemetry invisible. If they are not fully designed in a slice, name the component and record the integration hook. For M2, `ServiceBindingCache` and `RuntimeTelemetry` are named runtime components, not incidental details.
6. Do not expose harness machinery as app composition authority. Harnesses mount, adapters lower, plugins project, services own truth, apps select.

## Migration-Fact Notes

Current repo code confirms the transition debt, not the target language. `packages/hq-sdk/src/plugins.ts` still exposes `ProcessView`, `RoleView`, `bindService(...)`, and author-supplied `cacheKey`; `apps/server/src/host-satisfiers.ts` hand-rolls host satisfier cache keys. That is useful evidence for what must be replaced, not a reason to preserve the names.

Narsil was usable for repo orientation against `rawr-hq-template#5c717202`, but the most precise evidence for this terminology pass came from direct line reads of the candidate specs and local migration-fact seams.
