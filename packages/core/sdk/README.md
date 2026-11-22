# `@habitat-ai/sdk`

`@habitat-ai/sdk` is Habitat's public local runtime. It composes the private
Habitat service, provider-neutral resources, concrete Node providers, and the
TypeBox Standard Schema bridge into one conventional npm product.

## Public interface

The package root is intentionally empty. Import the subpath that owns the
operation: `@habitat-ai/sdk/service` for service declarations, and
`@habitat-ai/sdk/app` for app definitions and the live `startApp` entrypoint.

The isolated `@habitat-ai/sdk/service/schema` entry exposes:

- `standard(schema)` adapts a TypeBox 1.3.8 schema to Standard Schema and
  Standard JSON Schema.
- `TypeBoxStandardSchema` is the inferred adapter result type.

The isolated `@habitat-ai/sdk/service` entry exposes the host-neutral service
authoring substrate: procedure metadata, analytics and observability middleware,
service definitions and dependency declarations, and the `AnalyticsClient` and
`Logger` capability contracts they require. Its type-only
`ServiceBoundaryContext` carries exactly the readonly `deps`, `scope`, `config`,
`invocation`, and `provided` lanes. `ServiceModuleContextProjection<T>`
preserves an exact service-internal projection only when none of those five
reserved lane names is present. Neither type constructs a context, binds a
service, or defines an execution contract, and this entry exposes no workflow,
database, feedback, or concrete adapter mechanics.

The isolated `@habitat-ai/sdk/plugins/server` entry exposes the public and
trusted-internal server plugin builders, their native oRPC implementers, and
the shared `useService(...)` declaration. Native `.handler(...)` remains the
synchronous and Promise terminal, while Effect-backed operations use the
official implementation-owned Effect-oRPC `.effect(...)` extension.
`@habitat-ai/sdk/plugins/server/effect` installs that official extension once
for the service implementation owner; it exports no Habitat runner or helper.

The isolated `@habitat-ai/sdk/plugins/async` entry exposes cold workflow,
schedule, and consumer plugin builders and declarations plus `useService(...)`.
`@habitat-ai/sdk/plugins/async/effect` exposes the cold async-step Effect
descriptor and the invocation-owned `stepEffect` bridge. These entries do not load Inngest or
construct native functions, clients, registration bundles, loaders, adapters,
harnesses, or dispatchers; those mechanics remain with later runtime owners.

The isolated `@habitat-ai/sdk/plugins/web` entry exposes the cold web app
projection builder and route projection contracts. Route-module loaders remain
lazy definition data and do not enter serializable projection facts. This entry
does not select a browser runtime or expose a router vendor, DOM mount protocol,
adapter, build executor, app composition, or native harness lifecycle. The
separate `@habitat-ai/sdk/plugins/web/effect` subpath declares request-time Effect bodies.

The app declarations, Effect, execution, and definition-owned `runtime/*` entries expose the
cold runtime-definition authoring contract. They declare app composition,
finite process catalogs, immutable launch identity, profiles, lazy Effects,
executable descriptors, resources, providers, observation records, and
runtime-carried schemas without starting a process or acquiring a resource.
`@habitat-ai/sdk/runtime/profiles` alone exposes cold provider selection.
`@habitat-ai/sdk/runtime/providers` exposes only `defineRuntimeProvider` plus
`ProviderBuildContext`, `RuntimeProvider`, `RuntimeProviderHealthDescriptor`,
and `RuntimeResourceMap`. `@habitat-ai/sdk/runtime/providers/effect` exposes
only `providerFx` plus `ProviderAcquire`, `ProviderEffectPlan`, `ProviderFx`,
`ProviderFxFacade`, and `ProviderRelease`. Both faces are cold and expose no
private witness/accessor, raw Effect/runtime primitive, runner, or alternate
plan constructor.

The isolated `@habitat-ai/sdk/runtime/derivation` entry is the sole public
derivation face. Its runtime surface is exactly `deriveRuntimeArtifacts`,
`PortableRuntimePlanArtifactSchema`, and
`decodePortableRuntimePlanArtifact`. Its twenty-six type-only exports describe
the input, normalized facts, derived plans and tables, portable artifact, and
findings. The facade directly projects the private owner and exposes no second
implementation or public derivation error API.

Compiler and bootgraph blueprints are inert policy assets, not public
JavaScript entries. The app terminal bundles the private runtime it needs
to start the selected process; neither compiler nor bootgraph is a public API.

The isolated `@habitat-ai/sdk/telemetry` entry exposes the provider-neutral
technical telemetry contract and declarative OpenTelemetry Node configuration.
It exports no provider acquisition, lease, exporter factory, or instrumentation
bootstrap. Habitat runtime provisioning owns those mechanics; the selected
runtime owns one process lease and later harness owners attach foundational
observations once. Service, plugin, and command authors add only optional
semantic enrichment through their owning surfaces.

The package also exports `habitat-pack.json`, files below `blueprints/*`, and
ordinary `package.json` metadata. The blueprint files are copied during the
build directly from the repository's canonical `.habitat/blueprints` tree;
there is no second tracked authority tree in this package.

## Ownership boundary

The service, resources, concrete providers, runtime-schema adapter, and cold
runtime-definition, including plugin declarations, remain private workspace
implementation owners. The SDK bundles their code and
declarations behind its qualified public surfaces, so consumers install and
import only `@habitat-ai/sdk`; private package identities are not part of the
published runtime or type interface. Third-party libraries remain ordinary
dependencies.

The application profile selects the provider; the process owns acquisition and
release. A service or plugin does not install its own exporter, replace the
request runner, or decide when the process shuts down. The SDK is not a
workspace policy client, package manager, or retained store.

[habitat-pack.json](habitat-pack.json) is the closed protocol-1 policy envelope
and declares the current sorted member inventory.
Version 1 resolves from `dist/blueprints/<id>/blueprint.toml`; later versions
resolve from `dist/blueprints/<id>/versions/<version>/blueprint.toml`. Presence in
`dist/blueprints` alone grants no authority.

### Service authoring on the beta.51 oRPC cohort

Read the service's `habitat.toml`, not the first README found under
`dist/blueprints/service/`. That unversioned directory, including its
`README.md` and `skill.md`, belongs to **service@1**. It is preserved for
that version, not a guide to the current bridge. Run `habitat resolve --json`
from the governed workspace to see the selected rules and their remediation.

For a service upgrading from this SDK's `service@3` or `service@4` policy,
the service owner must make the corresponding selection in `habitat.toml`:

| Existing selection | Select with this cohort | What stays the same |
| --- | --- | --- |
| `blueprintVersion = 3` | `blueprintVersion = 5` | The native base remains required. New services start here. |
| `blueprintVersion = 4` | `blueprintVersion = 6` | The native base may be absent when unused; all five context lanes remain required. |

Installing the packages does not rewrite a service manifest. An old selection
can pass its own check without examining direct imports of the renamed vendor
bridge. Do not treat that pass as beta.51 service qualification. Versions 1
and 2, custom blueprints and overlays require their own adoption review.

A plain native `.handler(...)` needs no bridge import. For an Effect handler,
put `import "@habitat-ai/sdk/plugins/server/effect";` once in
`src/service/impl.ts` and author the operation with the patched native
`.effect(...)`. Do not import the underlying vendor extension or its runner
from the service. Use `habitat check --owner <project> --json` and confirm the
selected `service_v5_effect_bridge` or `service_v6_effect_bridge` rule was
evaluated. The package includes the [service@5 rule](dist/blueprints/service/versions/5/components/funnel/effect-bridge.md)
and the [service@6 rule](dist/blueprints/service/versions/6/components/funnel/effect-bridge.md).

### Other blueprint guarantees

The selected SDK package owns each reusable definition, version, runner asset,
and its policy-pack provenance. A repository remains the authority for its own
`habitat.toml` instances and qualified overlays; installing the package does
not select an instance or create an application. The Habitat workspace's exact tracked
authoring copy is inert during resolution, while a different local definition
at the same identity is rejected as drift.
Each member path locates one immutable, complete definition and runner-asset
closure. A version neither inherits nor traverses assets from another version.
`runtime-bootgraph@1` and `runtime-compiler@1` preserve their original private
structure closures. Their selected complete version-2 successors admit closed
owner-local TypeScript helper and proof subdirectories. Every compiler and
bootgraph version remains asset-only: membership creates no implementation
bundle, public face, or SDK source/build edge.
`runtime-definition@1` preserves the immutable original cold definition
closure. `runtime-definition@2` independently closes the provider-plan
authoring owner and its behavior proofs, without inheritance, fallback, or
cross-version assets. Selected `runtime-definition@3` preserves that contract
while admitting closed owner-local TypeScript helper and proof subdirectories.
`runtime-derivation@1` preserves the topology-only predecessor closure.
`runtime-derivation@2` independently closes the complete derivation owner and
its behavior proofs, without inheritance, fallback, or cross-version assets.
Selected `runtime-derivation@3` preserves those contracts with the same closed
helper and proof grammar. Every predecessor remains byte-immutable.

Each selected definition exposes only its required `project` anchor.
Source-specific structure scopes carry blueprint-owned `src/**` relative
paths; a caller-authored `source` binding is rejected as an unknown root role.
The SDK build copies and hashes thirteen blueprint directories through the manifest-listed
build inputs, including the private `runtime-substrate-effect@1` provisioning
law. SDK integration tests consume compiler, bootgraph and substrate source;
their test-source edges do not add production entrypoints or public APIs.

`resource@1`, `resource@2`, and `resource@3` include the provider-neutral Effect failure law
promoted from the Magic Migration evidence at commit
`8f40bdff34dde18680352a9b91ce7b953c385942`. Only its generic Grit semantics
ship. `resource@1` and `service@1` preserve their `habitat-cli-v0.5.13`
definition and runner-asset bytes. Their complete version-2 successors change
only version and rule identity plus Grit acquisition, narrowing subjects to the
declared `rootPatterns`; no instance or generated staging data is part of either
closure.
