# Example Todo Service Router

## Purpose

- Serve as a complete reference domain for creating tasks and tags and
  relating them through assignments.

## Scope

- Applies to `services/example-todo/**`.
- This reference oRPC service owns todo tasks, tags, assignments, and their
  domain policy.

## Boundaries

- Consumers cross only through the declared `/client` package export.
  `src/client.ts` exposes the callable client, deliberate contract, and the
  named construction and invocation lanes callers must satisfy;
  `src/service/**` remains private implementation owned by this package.
- Tasks, tags, and assignments own their operation behavior and declared
  errors. Cross-module primitives belong in `service/common` only when they
  are genuinely shared.
- Hosts provide database, clock, identifier, logging, and analytics
  capabilities; this package does not own runtime mounting or transport
  presentation.

## Behavior

- The service validates caller intent, enforces task, tag, assignment, and
  read-only policy, persists through the supplied database, and returns
  declared domain failures.
- Host-generated identity candidates pass service-owned TypeBox admission
  before any task, tag, or assignment repository mutation.

## Concepts

- A **task** is actionable work, a **tag** is reusable classification, and an
  **assignment** is the constrained relation between them. **Read-only mode**
  is service policy, not a database feature.

## Flow

- The private authoring funnel is
  `host -> base -> service -> module -> router -> handler`.
- Callers enter only through `/client`, which binds the completed private root
  router without exposing it.
- A host constructs the service client through the public client face with
  public `CreateClientOptions`: stable `Deps`, `Scope`, and `Config` lanes.
  Per-call `Invocation` facts enter through client call options; middleware
  establishes private execution context; the owning module applies todo policy
  and persists through the supplied database capability.

## Interfaces

- The public client is the sole caller boundary. It exposes only the service
  contract, its contract type, client construction, the derived client type,
  and the deliberate `Deps`, `Scope`, `Config`, `Invocation`, and
  `CreateClientOptions` lane vocabulary. The executable router, service
  authoring surface, and composed execution context stay private.
  Database, clock, identifier, logging, and analytics capabilities enter
  through host context; API and CLI projections consume the sealed client.

## Routing

- [Repository router](../../AGENTS.md)
- [Public client](src/client.ts)
- [Private service contract](src/service/contract.ts)
- [Common-area boundary](src/service/common/README.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` when todo behavior changes.
