# Development Operations Service Router

## Scope

- Applies to `services/dev/**`.
- This oRPC service owns repository, Graphite stack, worktree, and scratch-root
  operational capabilities exposed by the development command surface.

## Boundaries

- Consumers cross through declared package exports; module contracts, policy,
  and routers remain package-owned.
- Service modules decide operation policy and sequencing. Hosts supply the
  filesystem, path, process, and clock resources that perform mechanics.
- This service does not own curated agent-plugin lifecycle or provider
  installation state.

## Flow

- A host binds development resources; the public router selects the stack,
  repository, worktree, or scratch-policy module; that module inspects or
  performs the requested operation and returns structured results.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Host resource contracts](src/service/common/resources.ts)

## Validation

- Run `bunx nx run habitat:lint` and `bunx nx run @rawr/dev:typecheck`.
- Run `bunx nx run @rawr/dev:test` when operational behavior changes.
