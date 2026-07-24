# HQ SDK Router (`@rawr/hq-sdk`)

## Scope

- Applies to host-neutral service, plugin, workflow, and composition contracts
  in `packages/hq-sdk/**`.

## Boundaries

- Owns reusable oRPC contract construction, TypeBox schema adapters, service
  declarations, middleware contracts, capability ports, and declared-surface
  composition.
- Must not own a domain service's procedures, application plugin selection,
  concrete host resources, route mounting, or process and provider state.
- Context flows through declared service dependencies and invocation context;
  SDK helpers must not seed ambient runtime authority.

## Flow

- A service declares contracts and routers with the SDK's stable builders.
- An application declares selected surfaces, then a host supplies concrete
  ports and composes the declared trees.
- The host projects the composed internal and published surfaces to its
  transport and workflow runtimes.

## Routing

- [Packages router](../AGENTS.md)
- [HQ application declarations](../../apps/hq/AGENTS.md)
- [Server host](../../apps/server/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/hq-sdk:typecheck`
- `bunx nx run @rawr/hq-sdk:build`
