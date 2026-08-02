# HQ SDK Router (`@habitat-ai/rawr-hq-sdk`)

## Purpose

- Give services, plugins, workflows, applications, and hosts a shared
  vocabulary for metadata, operational middleware, ports, and declared-surface
  composition without replacing native framework authoring.

## Scope

- Applies to host-neutral service, plugin, workflow, and composition contracts
  in `packages/hq-sdk/**`.

## Boundaries

- Owns RAWR's stable procedure metadata plugin, one-shot analytics and
  observability middleware callbacks, capability ports, host adapters, and
  declared-surface composition.
- Native oRPC owns contracts, service context, middleware construction,
  implementers, routers, and clients. `@habitat-ai/typebox-adapter` owns the
  product-free TypeBox standards bridge.
- Must not own a domain service's operations, application plugin selection,
  concrete host resources, route mounting, or process and provider state.
- SDK middleware callbacks declare only the minimum context they consume and
  contribute no parallel context lane. Service bases own their complete
  context, decorate those callbacks, and retain native oRPC composition
  authority.

## Behavior

- The SDK records contracts and composition intent, preserves their type and
  context boundaries, and lets a host realize the resulting declared surface.

## Concepts

- A **capability port** names a required host satisfier. A **declared surface**
  is a composed tree awaiting host realization. Procedure metadata remains
  outside execution context and flows through oRPC's native metadata plugin.

## Flow

- A service declares contracts, context, middleware, routers, and clients with
  native oRPC. It attaches its service-wide analytics and observability
  lifecycle once at the service root, where that single analytics event may be
  classified by the native operation path. Qualified module or operation
  branches may attach owner-local runtime signals through middleware derived
  from the same base; they must not recreate the service lifecycle.
- An application declares selected surfaces, then a host supplies concrete
  ports and composes the declared trees.
- The host projects the composed internal and published surfaces to its
  transport and workflow runtimes.

## Interfaces

- Native oRPC and `@habitat-ai/typebox-adapter` face service authors; composition APIs
  face apps and plugins; capability ports and realized trees face hosts.

## Routing

- [Packages router](../AGENTS.md)
- [HQ application declarations](../../apps/hq/AGENTS.md)
- [Server host](../../apps/server/AGENTS.md)
- [[../typebox-adapter/AGENTS|TypeBox adapter]]

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-hq-sdk:typecheck`
- `bunx nx run @habitat-ai/rawr-hq-sdk:build`
