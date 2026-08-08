# HQ SDK Router (`@habitat-ai/rawr-hq-sdk`)

## Purpose

- Route the remaining pre-separation API, workflow, binding, and host-adapter
  source until each classified reader reaches its final owner.

## Scope

- Applies only to the remaining predecessor source in `packages/hq-sdk/**`.

## Boundaries

- Does not own service metadata, analytics or observability middleware, or the
  analytics and logger contracts. Those have one authority at
  `@habitat-ai/sdk/service`.
- Remaining API, workflow, binding, and host-adapter declarations are migration
  input, not Habitat platform authority or compatibility surfaces.
- Native oRPC owns contracts, service context, middleware construction,
  implementers, routers, and clients. `@habitat-ai/sdk/service/schema` exposes the
  product-free TypeBox standards bridge.
- Must not own a domain service's operations, application plugin selection,
  concrete host resources, route mounting, or process and provider state.

## Behavior

- The SDK records contracts and composition intent, preserves their type and
  context boundaries, and lets a host realize the resulting declared surface.

## Concepts

- A **declared surface** is a predecessor composition tree awaiting final
  classification. It does not establish a generic Habitat API or workflow
  contract.

## Flow

- An application declares selected surfaces, then a host supplies concrete
  ports and composes the declared trees.
- The host projects the composed internal and published surfaces to its
  transport and workflow runtimes.

## Interfaces

- `@habitat-ai/sdk/service` and `@habitat-ai/sdk/service/schema` face service
  authors. No service author imports this predecessor.

## Routing

- [Packages router](../AGENTS.md)
- [[../core/runtime/schema/AGENTS|Private runtime-schema owner]]

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-hq-sdk:typecheck`
- `bunx nx run @habitat-ai/rawr-hq-sdk:build`
