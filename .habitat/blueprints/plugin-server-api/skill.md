---
name: habitat-api-server-plugin-frame
description: Mental model for a public API server plugin as an operation boundary around one embedded service and one projected client.
---

# API Server Plugin Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. The API, service, TypeBox, and adjacent Habitat packets retain their
> qualified authority.

## Frame

An API server plugin projects one service capability into a public caller
boundary. Its three public faces have distinct jobs:

- `service/` owns capability meaning and internal operation behavior.
- `api.ts` owns the public operation tree and caller policy.
- `client.ts` owns the caller-facing projection of that tree.

The API vocabulary is **operations**. oRPC procedures are the callable leaves
that realize those operations; they do not require the public boundary to be
described as a procedure container.

## Gradient

Public input enters through TypeBox-owned schemas and API policy, narrows into
an operation, crosses the service boundary, and returns through public result
and error mapping. Authentication, authorization, rate limits, public
redaction, and caller transformation belong here when they are API-specific.
Business invariants remain in the service.

Operation leaves may stand alone and compose into a plain router object.
Natural groups may share context or guards while neighboring operations remain
independent. A section-level JSDoc on each real group names its purpose, guard,
shared capability, behavior, and relation to adjacent operations. Grouping
signals real semantics; it is not a device for hiding operation logic outside
its authoring site.

The application host owns HTTP, Elysia, fetch adaptation, listener lifecycle,
and native mounting. The API plugin publishes an operation boundary, not a
server runtime.

## Relations

- [[../skill|Blueprint direction]]
- [[README|API server-plugin boundary]]
- [[../plugin-server/skill|Server-plugin frame]]
- [[../../AUTHORITY|Habitat authority]]
