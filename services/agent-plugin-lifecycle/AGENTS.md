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
- The shared service model owns pure current-main selection, clean-content
  classification, declared-tree validation, and release derivation only where
  those meanings span capability modules. Providers owns selected-content
  structure, native marketplace validation, resolution, and its narrowed
  content-workspace read port because no other module consumes that meaning.
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
  operations through their owning modules. Providers derives its invocation-
  local desired content before native observation or mutation.

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
