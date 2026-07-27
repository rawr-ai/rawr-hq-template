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
- Tasks, tags, and assignments own their operation behavior, policy, and
  declared errors. The service-root model owns suite-wide identity, scope,
  host capability contracts, and inert record schemas that cross module
  contracts and persistence. Mere access does not assign root ownership.
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
  is service policy, not a database feature. A **workspace id** scopes every
  record in the capability suite.

## Context Lanes

| Lane | Bound by | Lifetime | Example Todo meaning |
| --- | --- | --- | --- |
| `Deps` | host | client | Database pool, clock, identifier generator, logger, and analytics capabilities. |
| `Scope` | host binding | client | Workspace identity shared by every operation on that client. |
| `Config` | host binding | client | Read-only policy and assignment limits selected from outside the service. |
| `Invocation` | caller | call | Request facts; the current client requires a trace id, while request and idempotency identities belong here when a capability needs them. |
| `provided` | middleware | execution | SQL and module repository capabilities acquired or derived for downstream handlers. |

Procedure metadata is static service-authored meaning, not another execution
lane. The four input lanes are service-declared; the SDK seeds an empty
`provided` bucket and middleware populates it during execution. The lane model
entered the sealed public face at Template commit
`07ff505ff781ee2f27af700e25beb1032cb53d37` and remains the canonical worked
reference for construction and invocation. Current module composition also
projects selected values into flat handler fields; that transitional wiring is
retained here as implementation evidence, not as a fifth input lane or a
pattern to copy. Preserve the named lanes through service refactors: change a
lane only when its owner or lifetime changes, never to make local wiring
convenient.

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
  The service-root model declares workspace and record identity, canonical
  task/tag/assignment records, and the clock and identifier-generator ports.
  Ready database, clock, identifier, logging, and analytics capabilities enter
  through host context; API and CLI projections consume the sealed client.

## Routing

- [Repository router](../../AGENTS.md)
- [[src/client|Public client]]
- [[src/service/base|Service context declaration]]
- [[src/service/impl|Service middleware assembly]]
- [[test/context-typing|Context lane type proof]]
- [[src/service/contract|Private service contract]]
- [[src/service/model/dto/identifier|Todo identifier DTO]]
- [[src/service/model/dto/workspace-id|Workspace identity DTO]]
- [[src/service/model/dto/task|Task record DTO]]
- [[src/service/model/dto/tag|Tag record DTO]]
- [[src/service/model/dto/assignment|Assignment record DTO]]
- [[src/service/model/ports/clock|Clock port]]
- [[src/service/model/ports/identifier-generator|Identifier generator port]]

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` when todo behavior changes.
