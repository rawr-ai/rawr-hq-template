# Runtime Definition Owner (`runtime-definition`)

## Purpose

- Own Habitat's cold, import-safe runtime and provider-plan authoring
  contracts.

## Scope

- Applies to `packages/core/runtime/definition/**`.
- This is a private, package-less Nx owner with no registry or workspace
  package identity.

## Boundaries

- The sole Nx dependency edge is `runtime-definition -> runtime-schema`; this
  owner never imports the terminal SDK.
- `runtime-definition@1` and `runtime-definition@2` remain byte-immutable.
  The selected complete successor `runtime-definition@3` preserves the cold
  authoring contract while admitting closed owner-local TypeScript helper and
  proof subdirectories without inheritance or fallback.
- Definitions may describe apps, services, plugins, resources, providers,
  Effects, and observations, but never start, acquire, mount, supervise, or
  project live read models.
- Runtime service selections retain one complete service-owned cold export of
  declaration, native callable contract and typed synchronous constructor.
  The public service boundary seals it after its implementation exists; the
  upstream declaration does not import its own router. Named dependency slots
  remain distinct even when their coarse topology edges coincide.
- Server API/internal workflow admission uses are named cold capabilities.
  `useWorkflowDispatcher` retains an exact workflow plugin occurrence, a
  nonempty exact-member subset and one required native event-client resource
  requirement. The caller includes that exact requirement through its ordinary
  resource lane; identical references are not added twice, while distinct
  requirements remain available to ordinary conflict refusal.
- Admission contracts and server context types remain native-peer-free. Their
  minimal workflow facts do not import native execution contexts, select async
  functions or invoke schemas, routers, workflows or clients. The private use
  carrier retains exact references; only owned records and arrays are frozen.
- A declared dispatcher group's `send` infers payload from the selected workflow
  and returns only native event IDs. Its optional `id` is the native event ID,
  not a Habitat deduplication mechanism, run identity or lifecycle capability.
- Web route declarations select exactly one preserved module loader or one
  cold `WebEffectDescriptor`. The route's `id` is its sole authored occurrence
  identity; a body may be reused by different routes without another registry
  or discovery inside native modules. Only actual web Effect bodies enter
  per-occurrence executable derivation.
- Request-time web Effects use the ordinary procedure context: `input` is the
  original native `Request`, and `context.resources` is the declared
  host-process resource view. They return native `Response` values and retain
  existing execution/telemetry context and policy. Direct service binding,
  duplicate request bags and browser runtime inference remain absent.
- Web authoring freezes owned descriptor, policy, route and membership shells,
  retaining exact body, loader and requirement references. Private lowering
  constructs a cold operational descriptor with a `web.route` path projection;
  neither authoring nor lowering runs a body or loader.
- Provider `build(...)` is synchronous and cold: it returns a cold
  `ProviderEffectPlan`, never an acquisition result.
- The provider build context contains already decoded provider config, lookup
  of declared dependency resources, and the definition-owned
  `RuntimeObservationPort`. It carries no lifecycle `Scope` or telemetry
  client.
- The curated `HabitatEffect` value is native Effect, not a separate AST or
  interpreter. Cold value construction is distinct from runtime ownership;
  native service/resource values compose without an interoperability wrapper.
- A provider plan uses curated `HabitatEffect` values and requires an
  infallible release. Its construction witness and accessor remain private.
- Definition, provider, and SDK authoring never starts or acquires a resource,
  runs an Effect, constructs `Scope`, `Layer`, or `ManagedRuntime`, registers a
  finalizer, or decodes config.
- `Entrypoint` is the sole cold selection artifact. Synchronous
  `defineEntrypoint(...)` produces it from real `AppDefinition`,
  `RuntimeProfile`, and `ProcessDefinition` values, one entrypoint id, and the
  exact five-field `RuntimeLaunchIdentity`.
- Before returning or otherwise publishing the frozen artifact,
  `defineEntrypoint(...)` requires launch-identity app, process, and entrypoint
  fields to agree with their selected definitions and id. Mismatch is built-in
  `TypeError` with no output, external mutation, or authored executable call;
  error text and check order are noncontractual.
- Launch identity has no profile field. Profile-id agreement remains a
  selection-to-derivation check, and derivation retains all agreement checks
  defensively for a corrupted or substituted selected artifact.
- Future `startApp(...)` consumes the exact accepted `Entrypoint` and does not
  reconstruct selection. Source-unavailable means producer-local authoring
  bindings or factory scope is gone, not that implementation code or artifacts
  are unavailable.
- The current `src/profile.ts` module owns the cold object-shaped
  `providerSelection(...)` authoring grammar. The terminal SDK projects that
  helper only through `@habitat-ai/sdk/runtime/profiles`; it does not become a
  second definition owner.
- Provider selection neither constructs nor consumes provider plans. The
  substrate work allocated to tasks 7.1-7.3 alone owns plan lowering,
  acquisition, release, rollback, finalization, and runtime construction.
- The process catalog is app-owned cold data. It is not a kind, child project,
  registry, supervisor, deployment unit, or cross-process controller.
- Deployment supplies launch identity once. Habitat copies and freezes its
  exact five fields without deriving placement or lineage.

## Interfaces

- Private assembly interface: `src/index.ts`.
- Cold app/process/entrypoint authoring and selection owner: `src/app.ts`.
- Cold provider-selection authoring owner: `src/profile.ts`.
- Peer-free workflow admission contracts: `src/workflow-admission.ts`;
  cold named uses and private accessor: `src/workflow-dispatcher-use.ts`.
- Cold web Effect authoring and private operational lowering: `src/web.ts`;
  native module/Effect route membership remains in `src/plugin.ts`.
- Shared native Effect/generator channel inference and cold policy snapshots:
  `src/local-effect.ts`; this is a helper leaf, not another execution owner.
- Current cold provider descriptor module: `src/provider.ts`.
- Current cold provider-plan module: `src/provider-effect-plan.ts`.
- Private helper and proof decomposition follows the selected version's
  closed TypeScript grammar; subdirectories do not create another owner or
  public face. `src/index.ts` remains the assembly entry.
- The existing `@habitat-ai/sdk/runtime/providers` face and the
  `@habitat-ai/sdk/runtime/providers/effect` face are the only provider
  projections, and the plan accessor stays private.
- Nx scheduler identity: `runtime-definition`.

## Validation

- `bunx nx run runtime-definition:typecheck`
- `bunx nx run runtime-definition:test`
- `bunx nx run runtime-definition:build`
- `bunx nx run runtime-definition:check`
