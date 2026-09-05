# Habitat SDK Package Router (`@habitat-ai/sdk`)

## Purpose

- Ship Habitat's public local runtime as one conventional npm SDK.
- Bundle the private service, resource, provider, runtime-schema, cold
  runtime-definition, and complete runtime-derivation owners behind isolated
  public surfaces.
- Transport the repository's generic Habitat blueprint bytes from the canonical
  `.habitat/blueprints` tree as generated package assets, including the private
  runtime-compiler and runtime-bootgraph structures without bundling their
  implementations.

## Scope

- Applies to `packages/core/sdk/**`.

## Boundaries

- The public root exports only `createHabitatClientForWorkspace` and
  `HabitatClient`.
- `@habitat-ai/sdk/service` exposes only the type-only canonical five-lane
  service boundary, its disjoint module-context projection, host-neutral
  procedure metadata, analytics and observability middleware, and their
  required capability ports. The projection cannot contain `deps`, `scope`,
  `config`, `invocation`, or `provided`; neither context type binds or executes
  a service.
- `standard` and `TypeBoxStandardSchema` are available only through
  `@habitat-ai/sdk/service/schema`.
- `@habitat-ai/sdk/plugins/server` exposes the public and trusted-internal
  server plugin builders plus native oRPC implementers. Synchronous and Promise
  handlers stay native oRPC handlers; Effect handlers stay owned by the
  official Effect-oRPC extension. `@habitat-ai/sdk/plugins/server/effect` is
  the service-implementation-owned, side-effect-only bootstrap for that exact
  extension and exports no Habitat runner.
- `@habitat-ai/sdk/plugins/async` exposes cold workflow, schedule, and consumer
  declarations. `@habitat-ai/sdk/plugins/async/effect` adds only the cold async
  step Effect descriptor builder; neither face imports or materializes a native
  async host.
- `@habitat-ai/sdk/plugins/web` exposes only the cold web app projection builder
  and route projection contracts. Route-module loaders remain lazy definition
  data and are excluded from serializable projection facts. This face exposes no
  browser runtime, router vendor, DOM mount protocol, adapter, build execution,
  app composition, native harness lifecycle, or Effect subpath.
- Implemented app, Effect, execution, service, resource, provider, profile, and
  runtime-schema authoring faces project cold definition capabilities or inert
  shared invocation types. The curated Effect API uses native Effect values;
  the SDK defines no interpreter or competing runtime.
  `effect/context` and `effect/wrap` expose only exact native wiring types.
  Process-owned service client assembly supplies the official bridge's context,
  decoration and admission tracking without exposing provisioning values or a
  raw runtime. The execution face adds no terminal.
  `@habitat-ai/sdk/runtime/profiles` is the sole cold provider-selection face.
  `@habitat-ai/sdk/runtime/providers` exposes only `defineRuntimeProvider` and
  the four provider/build/resource-map types. The separate
  `@habitat-ai/sdk/runtime/providers/effect` face exposes only `providerFx` and
  the five provider-plan types. Neither provider face exports the private plan
  witness/accessor, the raw Effect namespace or runtime authority, a runner, or an alternate
  constructor. These faces expose no `startApp`, managed runtime, native
  harness, or observation read model.
- `@habitat-ai/sdk/runtime/derivation` is the sole public derivation face. It
  exposes exactly three runtime values and twenty-six type-only contracts from
  the private owner, with no second implementation or public error API.
- `@habitat-ai/sdk/runtime/harnesses` exposes only the exact import-safe native
  companion contract types, including bounded process access and definition-owned
  launch identity. It exports no live values, private mounting handles, host
  imports, registration singleton, or lifecycle controller.
- `@habitat-ai/sdk/runtime/observation` exposes only diagnostic, catalog,
  topology and telemetry contract types. It exports no collector factory,
  observation port implementation, storage, native sink or control surface.
- Runtime compiler definitions are transported only as policy-pack closures.
  The SDK exposes no compiler JavaScript or declaration face and has no
  production composition dependency until task 10.6. SDK-owned task 7 integration
  tests may import and call it, establishing real test-source Nx/build edges.
- Runtime bootgraph definitions are transported only as policy-pack closures.
  The SDK exposes no bootgraph JavaScript or declaration face and has no
  production composition dependency until task 10.6. SDK-owned task 7 integration
  tests may import and call it and the Effect substrate. Those test-source edges
  do not expose a public lifecycle API or put provisioning in a production bundle.
- Qualified telemetry provisioning tests consume the resource/provider-owned
  private runtime identity and adapter as source. Keep their definition witness
  in the same runtime assembly; do not bundle a second copy into the legacy
  private resource package or claim a new public telemetry provider export.
- `@habitat-ai/sdk/telemetry` exposes the provider-neutral telemetry contract
  and declarative OpenTelemetry Node configuration. It exports no acquisition,
  lease, exporter factory, or instrumentation bootstrap; Habitat runtime
  provisioning owns those mechanics. Service, plugin, and command authors add
  only optional semantic enrichment through their owning surfaces.
- Other low-level service constructors, resource contracts, provider
  factories, and all implementation package identities stay private and must
  be bundled out of both JavaScript and declarations.
- Third-party runtime libraries remain ordinary npm dependencies. Inngest is
  absent from dependency, peer, optional, load, and public facade metadata
  until its runtime-harness owner lands.
- The SDK owns production Node composition, but no controller, package manager,
  retained store, compatibility export, or public implementation cohort.
- Blueprint assets are copied only at build time. Do not create a second
  tracked blueprint tree below this package.

## Behavior

- Each client construction resolves one absolute workspace root over the ready
  Node provider profile and the SDK's packaged policy envelope.
- `HABITAT_COMMAND_TIMEOUT_MS` retains the production integer range of 1 through
  600000 milliseconds and defaults to 600000.
- Production invokes the published JavaScript command entrypoint from the exact
  pinned `@getgrit/cli` package directly on POSIX so its vendor-owned Node shebang
  selects the runtime. Windows invokes the same entrypoint through PATH-resolved
  Node. The vendor command owns native acquisition when a consumer package
  manager has not run dependency install scripts.
- The TypeBox bridge retains TypeBox 1.3.8 as its sole validation authority.
- [habitat-pack.json](habitat-pack.json) is the closed protocol-1 policy
  envelope and owns its current sorted member inventory. The version-1
  resource and service members preserve their released bytes; each version-2
  member is a complete successor with the same law and structure and narrowed
  Grit acquisition.
  `service@3` preserves that complete service closure while projecting the
  official Effect-oRPC bootstrap through the terminal SDK for SDK-consuming
  services.
  `runtime-derivation@1` preserves its immutable topology-only closure;
  `runtime-derivation@2` independently closes the finished derivation owner;
  selected `runtime-derivation@3` preserves that contract while admitting
  closed owner-local TypeScript helper and proof subdirectories.
  `runtime-definition@1` preserves the immutable original definition closure;
  `runtime-definition@2` independently closes the provider-plan authoring
  owner and its behavior proofs. Selected `runtime-definition@3` preserves
  that contract with the same closed helper and proof grammar.
  The immutable `runtime-bootgraph@1` and `runtime-compiler@1` predecessors
  remain independently resolvable. Their selected complete version-2
  successors admit private helper and proof subdirectories. All compiler and
  bootgraph policy-pack membership is asset carriage rather than an
  implementation or public-face edge.
  Shipped files are not members merely by being present.
- The selected package owns reusable definitions, versions, runner assets, and
  policy-pack provenance. Repository manifests alone select instances and
  qualified overlays remain repository-owned.
- A member path locates one immutable, self-contained closure. Versions do not
  use `include`, `contains`, inheritance, or cross-version asset traversal.
- Each selected definition exposes only its required `project` anchor;
  source-specific structure scopes carry blueprint-owned `src/**` paths.

## Flow

- `src/index.ts` composes the private service and concrete Node providers into
  the public workspace-bound client. `src/service/index.ts` owns the generic
  service authoring surface; `src/service/procedure-context.ts` owns only the
  readonly boundary-lane and disjoint module-projection types; and
  `src/service/schema.ts` separately assembles the private runtime-schema owner.
  App, Effect, execution, and runtime entry modules project implemented cold
  definition capabilities. The two `src/runtime/providers` entries directly
  project the exact provider descriptor and provider-plan authoring faces.
  `src/runtime/derivation/index.ts` directly projects the one private
  derivation owner without wrapping or duplicating it.
  The `src/plugins/*` entries project only the corresponding private cold
  definitions and native oRPC authoring values; they do not introduce a host,
  loader, adapter, dispatcher, or execution runner. `src/telemetry.ts` assembles the private
  telemetry resource and OpenTelemetry Node provider without selecting or
  acquiring that provider for a consumer.
- Later runtime and harness owners attach foundational telemetry exactly once
  per selected process lease. Business-logic authors may add semantic
  enrichment, but never repeat exporter configuration, provider acquisition,
  or baseline instrumentation.
- `tsdown` bundles workspace implementation owners into `dist` and leaves only
  declared third-party dependencies external.
- The build copies `.habitat/blueprints` into `dist/blueprints` without
  modifying the canonical authoring source. Exact producer definitions resolve
  as inert duplicates of the package authority; drift at the same identity is
  rejected.
- The copied and hashed build-input inventory contains fifteen blueprint
  directories and the manifest-listed inputs. Compiler, bootgraph, process runtime and Effect substrate
  policy assets do not add production entrypoints. SDK integration tests use
  their real source operations; production startApp composition waits for 10.6.

## Interfaces

- Public runtime: `@habitat-ai/sdk`.
- Public service authoring substrate: `@habitat-ai/sdk/service`.
- Public service schema adapter: `@habitat-ai/sdk/service/schema`.
- Public server plugin authoring: `@habitat-ai/sdk/plugins/server` and the
  implementation bootstrap `@habitat-ai/sdk/plugins/server/effect`.
- Public host-neutral async authoring: `@habitat-ai/sdk/plugins/async` and
  `@habitat-ai/sdk/plugins/async/effect`.
- Public cold web projection authoring: `@habitat-ai/sdk/plugins/web`.
- Public cold runtime authoring: `@habitat-ai/sdk/app`,
  `@habitat-ai/sdk/effect`, `@habitat-ai/sdk/execution`, and implemented
  `@habitat-ai/sdk/runtime/*` subpaths.
- Public native wiring types: `@habitat-ai/sdk/effect/context` and
  `@habitat-ai/sdk/effect/wrap`.
- Public cold provider authoring: `@habitat-ai/sdk/runtime/providers` and
  `@habitat-ai/sdk/runtime/providers/effect`.
- Public complete runtime derivation: `@habitat-ai/sdk/runtime/derivation`.
- Public type-only companion contract: `@habitat-ai/sdk/runtime/harnesses`.
- Public type-only read models: `@habitat-ai/sdk/runtime/observation`.
- Public telemetry substrate: `@habitat-ai/sdk/telemetry`.
- Public assets: `@habitat-ai/sdk/habitat-pack.json` and
  `@habitat-ai/sdk/blueprints/*`.
- Ordinary package metadata: `@habitat-ai/sdk/package.json`.

## Routing

- [[../../AGENTS|Packages router]]
- [[../../../services/catalog/AGENTS|Private Habitat catalog service authority]]
- [[../../../resources/rule-evaluation/AGENTS|Private rule-evaluation resource]]
- [[../../../resources/source-inventory/AGENTS|Private source-inventory resource]]
- [[../../../resources/telemetry/AGENTS|Private telemetry resource]]
- [[../runtime/schema/AGENTS|Private runtime-schema owner]]
- [[../runtime/definition/AGENTS|Private runtime-definition owner]]
- [[../runtime/derivation/AGENTS|Private runtime-derivation owner]]
- [[../runtime/compiler/AGENTS|Private runtime-compiler owner]]
- [[../runtime/bootgraph/AGENTS|Private runtime-bootgraph owner]]
- [[../runtime/substrate/effect/AGENTS|Private Effect provisioning owner]]
- [[../runtime/process-runtime/AGENTS|Private service binding and execution owner]]
- [[../runtime/harnesses/AGENTS|Private native harness contract owner]]
- [[../runtime/observation/AGENTS|Private observation owner]]

## Validation

- Run `bunx nx show project @habitat-ai/sdk --json` and confirm its package root,
  public npm tag, and build inputs.
- Run `bunx nx run @habitat-ai/sdk:typecheck` and
  `bunx nx run @habitat-ai/sdk:build`.
- Inspect `dist/index.js` and `dist/index.d.ts` for private workspace package
  names, and inspect the packed tarball for `dist/blueprints`.
