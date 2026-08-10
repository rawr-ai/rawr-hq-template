# Habitat SDK Package Router (`@habitat-ai/sdk`)

## Purpose

- Ship Habitat's public local runtime as one conventional npm SDK.
- Bundle the private service, resource, provider, runtime-schema, and cold
  runtime-definition owners behind isolated public surfaces.
- Transport the repository's generic Habitat blueprint bytes from the canonical
  `.habitat/blueprints` tree as generated package assets.

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
  runtime-schema authoring faces project only cold definition capabilities.
  They expose no `startApp`, provider selection, provider Effect plan, managed
  runtime, native harness, or observation read model.
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
- `habitat-pack.json` is the closed protocol-1 policy envelope. Its exact sorted
  member set is `app@1`, `package@1`, `plugin@1`, `plugin-nx@1`, `provider@1`,
  `resource@1`, `resource@2`, `runtime-definition@1`, `service@1`, and
  `service@2`, and `service@3`. The version-1
  resource and service members preserve their released bytes; each version-2
  member is a complete successor with the same law and structure and narrowed
  Grit acquisition.
  `service@3` preserves that complete service closure while projecting the
  official Effect-oRPC bootstrap through the terminal SDK for SDK-consuming
  services.
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
  App, Effect, execution, and runtime entry
  modules project only implemented cold definition capabilities.
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

## Validation

- Run `bunx nx show project @habitat-ai/sdk --json` and confirm its package root,
  public npm tag, and build inputs.
- Run `bunx nx run @habitat-ai/sdk:typecheck` and
  `bunx nx run @habitat-ai/sdk:build`.
- Inspect `dist/index.js` and `dist/index.d.ts` for private workspace package
  names, and inspect the packed tarball for `dist/blueprints`.
