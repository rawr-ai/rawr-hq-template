# HQ Operations Service Router

## Scope

- Applies to `services/hq-ops/**`.
- This oRPC service owns layered configuration reads, journal operations, and
  HQ security checks and gates.

## Boundaries

- Consumers cross through declared package exports; config, journal, and
  security modules retain their contracts, policy, and implementation.
- Modules own operational semantics. Hosts supply primitive filesystem, path,
  process, SQLite, and embedding resources through the service boundary.
- Do not place agent-plugin lifecycle policy, app composition, or concrete
  runtime construction in this service.

## Flow

- A host supplies primitive resources; root middleware establishes service
  context; the selected config, journal, or security module applies its policy
  and returns a typed oRPC result.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Common resource boundary](src/service/common/README.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/hq-ops:typecheck`.
- Run `bunx nx run @rawr/hq-ops:test` when operational behavior changes.
