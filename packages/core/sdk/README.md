# `@habitat-ai/sdk`

`@habitat-ai/sdk` is Habitat's public local runtime. It composes the private
Habitat service, provider-neutral resources, concrete Node providers, and the
TypeBox Standard Schema bridge into one conventional npm product.

## Public interface

The package root exposes two names:

- `createHabitatClientForWorkspace(workspaceRoot)` constructs a Habitat client
  bound to one absolute workspace root.
- `HabitatClient` is the resulting client type.

The isolated `@habitat-ai/sdk/service/schema` entry exposes:

- `standard(schema)` adapts a TypeBox 1.3.8 schema to Standard Schema and
  Standard JSON Schema.
- `TypeBoxStandardSchema` is the inferred adapter result type.

The isolated `@habitat-ai/sdk/service` entry exposes the host-neutral service
authoring substrate: procedure metadata, analytics and observability middleware,
service definitions and dependency declarations, and the `AnalyticsClient` and
`Logger` capability contracts they require. It does not expose live binding,
workflow, database, feedback, or concrete adapter mechanics.

The isolated `@habitat-ai/sdk/plugins/server` entry exposes the public and
trusted-internal server plugin builders, their native oRPC implementers, and
the shared `useService(...)` declaration. Native `.handler(...)` remains the
synchronous and Promise terminal, while Effect-backed operations use the
official implementation-owned Effect-oRPC `.effect(...)` extension.
`@habitat-ai/sdk/plugins/server/effect` installs that official extension once
for the service implementation owner; it exports no Habitat runner or helper.

The isolated `@habitat-ai/sdk/plugins/async` entry exposes cold workflow,
schedule, and consumer plugin builders and declarations plus `useService(...)`.
`@habitat-ai/sdk/plugins/async/effect` exposes only the cold async-step Effect
descriptor and its definition function. These entries do not load Inngest or
construct native functions, clients, registration bundles, loaders, adapters,
harnesses, or dispatchers; those mechanics remain with later runtime owners.

The app, Effect, execution, and implemented `runtime/*` entries expose the cold
runtime-definition authoring contract. They declare app composition, finite
process catalogs, immutable launch identity, profiles, lazy Effects, executable
descriptors, resources, providers, observation records, and runtime-carried
schemas without starting a process or acquiring a resource. Provider selection,
provider Effect plans, and live runtime mechanics remain absent until their
owning runtime tasks land.

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

The SDK selects the production Node provider profile, resolves the packaged
policy envelope, and constructs a fresh client for each workspace binding. It
does not own a controller, package manager, retained store, compatibility
surface, or public implementation cohort.

The telemetry integration in this package is provider substrate, not the final
`RuntimeTelemetry` observation bridge. Process provisioning, automatic oRPC,
Effect, Oclif, and Inngest instrumentation, and app-profile selection land with
their exact runtime and harness owners; none is repeated by an individual
service or plugin.

`habitat-pack.json` is the closed protocol-1 policy envelope. It declares
exactly eleven sorted members: `app@1`, `package@1`, `plugin@1`, `plugin-nx@1`,
`provider@1`, `resource@1`, `resource@2`, `runtime-definition@1`, `service@1`,
`service@2`, and `service@3`.
Version 1 resolves from `dist/blueprints/<id>/blueprint.toml`; later versions
resolve from `dist/blueprints/<id>/versions/<version>/blueprint.toml`. Presence in
`dist/blueprints` alone grants no authority.

The selected SDK package owns each reusable definition, version, runner asset,
and its policy-pack provenance. A repository remains the authority for its own
`habitat.toml` instances and qualified overlays; installing the package does
not select an instance or create an application. The Habitat workspace's exact tracked
authoring copy is inert during resolution, while a different local definition
at the same identity is rejected as drift.
Each member path locates one immutable, complete definition and runner-asset
closure. A version neither inherits nor traverses assets from another version.

Each selected definition exposes only its required `project` anchor.
Source-specific structure scopes carry blueprint-owned `src/**` relative
paths; a caller-authored `source` binding is rejected as an unknown root role.

`resource@1` and `resource@2` include the provider-neutral Effect failure law
promoted from the Magic Migration evidence at commit
`8f40bdff34dde18680352a9b91ce7b953c385942`. Only its generic Grit semantics
ship. `resource@1` and `service@1` preserve their `habitat-cli-v0.5.13`
definition and runner-asset bytes. Their complete version-2 successors change
only version and rule identity plus Grit acquisition, narrowing subjects to the
declared `rootPatterns`; no instance or generated staging data is part of either
closure.
