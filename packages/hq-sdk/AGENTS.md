# HQ SDK Router (`@rawr/hq-sdk`)

## Purpose

- Give services, plugins, workflows, applications, and hosts a shared
  vocabulary for declaring and composing capabilities without coupling them
  to one runtime.

## Scope

- Applies to host-neutral service, plugin, workflow, and composition contracts
  in `packages/hq-sdk/**`.

## Boundaries

- Owns reusable oRPC contract construction, TypeBox schema adapters, service
  declarations, middleware contracts, capability ports, and declared-surface
  composition.
- Must not own a domain service's operations, application plugin selection,
  concrete host resources, route mounting, or process and provider state.
- Context flows through declared service dependencies and invocation context;
  SDK helpers must not seed ambient runtime authority.

## Behavior

- The SDK records contracts and composition intent, preserves their type and
  context boundaries, and lets a host realize the resulting declared surface.

## Concepts

- A **service declaration** names caller-visible capability. A **capability
  port** names a required host satisfier. A **declared surface** is a composed
  tree awaiting host realization.
- A service declares four input lanes: host-supplied `deps`, stable binding
  `scope`, stable behavior `config`, and per-call `invocation`. Each service's
  native client resolver starts the execution bucket as `provided: {}`;
  provider middleware populates its qualified keys. Procedure metadata remains
  outside execution context.

## Flow

- A service declares contracts and routers with the SDK's stable builders.
- Each service's owner-local native oRPC client binds `deps`, `scope`, and
  `config` once; each call supplies only `invocation`; the context resolver
  starts `provided: {}`. Provider middleware grows that bucket while retaining
  the named semantic lanes. A module may
  curate direct noncomputed member paths rooted below those lanes into additive
  handler fields; the projection does not create another SDK lane or remove
  inherited context.
- An application declares selected surfaces, then a host supplies concrete
  ports and composes the declared trees.
- The host projects the composed internal and published surfaces to its
  transport and workflow runtimes.

## Interfaces

- Contract builders and TypeBox adapters face service authors; declaration and
  composition APIs face apps and plugins; capability ports and realized trees
  face hosts.

## Routing

- [Packages router](../AGENTS.md)
- [HQ application declarations](../../apps/hq/AGENTS.md)
- [Server host](../../apps/server/AGENTS.md)
- [[src/orpc/context/types|Context lane model]]

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/hq-sdk:typecheck`
- `bunx nx run @rawr/hq-sdk:build`
