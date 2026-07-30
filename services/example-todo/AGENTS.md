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
  before any task, tag, or assignment store mutation.

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
| `provided` | middleware | execution | Workspace-bound task, tag, and assignment stores acquired once for the operation. |

Procedure metadata is static service-authored meaning, not another execution
lane. The four input lanes are service-declared; the owner-local native client
resolver starts an empty `provided` bucket and root middleware populates it
during execution. The lane
model entered the sealed public face at Template commit
`07ff505ff781ee2f27af700e25beb1032cb53d37` and remains the canonical worked
reference for construction and invocation. Each module then curates the
smallest handler vocabulary from inherited lane descendants and provided
stores. That additive curation is the intended module boundary: it creates
no fifth input lane and does not remove the inherited service context.

## Flow

- The private authoring funnel is
  `host -> base -> service -> module -> router -> handler`.
- Callers enter only through `/client`, which binds the completed private root
  router without exposing it.
- A host constructs the service client through the public client face with
  public `CreateClientOptions`: stable `Deps`, `Scope`, and `Config` lanes.
  Per-call `Invocation` facts enter through client call options; root middleware
  acquires one SQL capability and contributes workspace-bound stores; each
  module curates its route context; handlers apply todo policy and persist
  through those stores.

## Interfaces

- The public client is the sole caller boundary. It exposes only the service
  contract, its contract type, client construction, the derived client type,
  and the deliberate `Deps`, `Scope`, `Config`, `Invocation`, and
  `CreateClientOptions` lane vocabulary. The executable router, service
  authoring surface, and composed execution context stay private.
  The service-root model declares workspace and record identity, canonical
  task/tag/assignment records, store contracts, and the clock and
  identifier-generator ports. The service database owns SQL migrations and
  store implementations. Ready database, clock, identifier, logging, and
  analytics capabilities enter through host context; API and CLI projections
  consume the sealed client.

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
- [[src/service/middleware/stores|Store capability middleware]]
- [[src/service/db/migrations/0001_create_example_todo.sql|Database migration]]
- [[src/service/db/stores/tasks|Task store]]
- [[src/service/db/stores/tags|Tag store]]
- [[src/service/db/stores/assignments|Assignment store]]

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/example-todo:typecheck`.
- Run `bunx nx run @rawr/example-todo:test` when todo behavior changes.
