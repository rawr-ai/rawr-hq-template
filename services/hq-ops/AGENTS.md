# HQ Operations Service Router

## Purpose

- Centralize HQ configuration, journal, and security operations behind typed,
  host-neutral service boundaries.

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

## Behavior

- The service resolves configuration views, records and retrieves operational
  knowledge, evaluates security posture, and evaluates and persists enablement
  admission through host-supplied primitives. It does not perform enablement.

## Concepts

- **Layered configuration** combines global and workspace views. The
  **journal** holds events and searchable snippets. A **security report** and
  **gate** describe readiness and the enablement admission decision.

## Flow

- A host supplies primitive resources; root middleware establishes service
  context; the selected config, journal, or security module applies its policy
  and returns a typed oRPC result.

## Interfaces

- Config, journal, and security oRPC modules are the caller interfaces;
  filesystem, process, SQLite, and embedding contracts are the host mechanics
  interfaces.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Host resource ports](src/service/model/ports/resources.ts)
- [Procedure metadata policy](src/service/model/policy/procedure-metadata.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/hq-ops:typecheck`.
- Run `bunx nx run @rawr/hq-ops:test` when operational behavior changes.
