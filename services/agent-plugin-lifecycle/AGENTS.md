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
- The shared service model owns clean-content eligibility, declared-tree
  validation, selection, and release derivation because those meanings span
  multiple capability modules. Modules own their operation DTOs, handlers,
  results, issues, and operation-specific mutation policy.
- The Releases module owns staged-index observation DTOs, its ready observation
  port, resource normalization, and staged eligibility policy. Resource
  provenance does not promote transition-specific meaning into the root model.
- Filesystem, clock, package-output, and native-provider mechanics remain
  behind host-supplied dependencies.
- It does not own the Oclif installation, Personal repository contents, app
  composition, or provider-home state. Native provider inventory is the live
  installed-state authority.

## Behavior

- The service admits exact reviewed content, applies shared selection and
  release-derivation policy, and dispatches package, vendor, and provider
  operations through their owning modules.

## Concepts

- A **reviewed channel record** declares desired membership; exact Git objects
  supply its selected bytes. A **release input** is the validated source set; a
  **package** is deterministic output; native **inventory** is the independent
  installed-state observation.

## Flow

- The host supplies dependencies to the base boundary, which admits invocation
  context and selects the service branch. Each `module.ts` provides the ready
  capabilities its router consumes. Exact module authoring views remain a
  service-context migration requirement until broader root lanes are absent
  from handler types.

## Interfaces

- The public oRPC contract is the caller boundary. Content workspace, lifecycle
  clock, package output, and native provider sessions are the host-supplied
  dependencies.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Service dependency boundary](src/service/base.ts)
- [Native-provider host types](src/host.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` when lifecycle behavior
  changes.
