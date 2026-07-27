# Agent Plugin Lifecycle Service Router

## Purpose

- Govern how reviewed agent-plugin content becomes a deterministic package and
  converges with native provider state.

## Scope

- Applies to `services/agent-plugin-lifecycle/**`.
- This oRPC service owns the curated agent-plugin capability boundary across
  release inputs, vendors, packaging, native-provider convergence, and
  current-main governance.

## Boundaries

- Consumers cross through declared package exports; `src/service/**` remains
  owned by this package.
- Personal's reviewed record owns desired plugin membership; exact Git objects
  own the selected bytes; native provider inventory owns installed state.
- The service model owns pure current-main selection, clean-content
  classification, declared-tree validation, release derivation, and release
  diagnostics only where those meanings span capability modules. Its TypeBox
  DTOs define diagnostic structure; its policy bounds construction and
  canonical ordering. Its generic release-result DTO and policy own only the
  internal computation discriminant, construction, nonempty narrowing, and
  identity-preserving elimination; concrete caller-facing result schemas
  remain with their operation modules. Raw-value admission policy owns only
  bounded traversal and established granular diagnostics before TypeBox
  aggregate checks; it is not a second schema or parser framework.
  Its canonical JSON DTO constrains pure serializer input; separate JSON and
  Base64 policy leaves own established encoding, while one byte-equality
  mechanic supports canonical record checks. Concrete record TypeBox schemas
  remain with their owning DTOs. Canonical UTF-8 text ordering has one
  service-root policy owner shared by record construction, projection, and
  packaging. Agent-plugin payload structure, manifest semantics, canonical
  encoding, and admitted construction have direct service-root DTO and policy
  owners; modules consume those leaves without a `shared` payload face.
  Distribution ownership structure and its admitted brand have one direct
  service-root DTO owner; synthesis, admission, bounds, canonical ordering and
  projection, immutability, member coverage, conflict classification, and
  owner-local selection have one direct policy owner. Release records consume
  those exact leaves without a `shared` ownership face. Release-input body and
  envelope structure, member declarations, provenance bindings, completeness
  witness, and admitted brand have one direct service-root TypeBox DTO owner.
  Construction, verification, canonical encoding, diagnostics, ordering, and
  digest policy remain outside that DTO; modules name the structural owner
  directly rather than reaching through the transitional release barrel.
  Providers owns selected-content structure,
  source-interface classification, native marketplace validation,
  selected-content projection, and native-state policy because no other module
  consumes those meanings. Provider status, sync, and disposable test handlers
  directly sequence the ready content-workspace and native-provider resources;
  sessions stay operation-local and pure policy sees only admitted facts.
- The Releases module owns clean and staged eligibility operations and directly
  consumes one ready content-workspace resource. Its handlers own observation
  order and final revalidation; pure shared policy classifies the resulting Git
  facts. Native Git protocol remains in the resource provider.
- The Packaging module directly consumes ready content-workspace and
  package-output resources through separate named middleware contributions.
  Its package handler owns source observation, derivation, encoding,
  revalidation, publication, and settlement order; pure policy classifies
  typed facts and public results.
- Content-workspace, versioned-content, clock, package-output, and
  native-provider mechanics remain behind host-supplied dependencies.
- It does not own the Oclif installation, Personal repository contents, app
  composition, or provider-home state. Native provider inventory is the live
  installed-state authority.

## Behavior

- The service admits exact reviewed content, applies cross-module
  release-derivation policy, and dispatches package, vendor, and provider
  operations through their owning modules. Provider status, test, and sync
  derive their invocation-local selections in their operation handlers before
  native observation or mutation.

## Concepts

- A **reviewed channel record** declares desired membership; exact Git objects
  supply its selected bytes. A **release input** is the validated source set; a
  **package** is deterministic output; native **inventory** is the independent
  installed-state observation.

## Flow

- The host supplies ready capabilities to the context-seeded base boundary.
  The base exposes one separate native middleware author; each documented named
  module middleware contributes one owner capability, and `module.ts`
  attaches that middleware through inferred `.use(middleware)` composition.
  Operation handlers sequence ready resources and pass only typed facts into
  pure policy. Native context remains additive; owner-local cuts remove broad
  dependency access rather than hiding it behind a shadow `Context` type.

## Interfaces

- The public oRPC contract is the caller boundary. Content workspace, versioned
  content, lifecycle clock, package output, and ready native provider resources are
  the host-supplied dependencies.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Service dependency boundary](src/service/base.ts)
- [Native-provider resource contract](../../resources/native-agent-provider/contract.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` when lifecycle behavior
  changes.
