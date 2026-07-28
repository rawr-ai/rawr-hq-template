---
name: service-database-frame
description: Frame a database as an optional service-owned persistence boundary that projects store capabilities through context.
---

# Service Database Frame

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. Service, resource, provider, and adjacent Habitat packets retain their
> qualified authority.

## Frame

A database is persistence owned by one service, not a module, provider,
resource, or Nx project. It always holds the service's owner-issued migrations
and store implementations. Migrations own physical evolution. A closed
`schema` interior appears only when the selected database technology requires
physical mappings beyond those authorities. The database does not become a
home for generated clients, memory substitutes, repositories, sessions,
provider wiring, helpers, indexes, or alternate composition faces.

Migration, schema, and store leaves use atomic names because their containing
directories already carry the database role.

Physical schema describes storage mapping, not domain identity. Stores remain
private persistence implementations and infer their native record types from
that mapping. Identity-bearing domain state belongs under service or module
`model/entities`; command, query, result, and boundary projections belong
under `model/dto`. The database has no parallel DTO authority.

## Funnel

```text
provider -> resource -> service base -> named root middleware
  -> store capability -> module handler
```

The provider realizes an external database resource. The application binds
that ready dependency into service context. Direct named service-root
middleware may use the service-owned database source to project narrow store
capabilities. Modules inherit those capabilities through native oRPC context;
production modules do not construct persistence or import database internals.
Owner-local package proof may inspect a private store without creating a
public dependency or alternate production client path.

## Relations

- [[README|Database boundary]]
- [[../service/skill|Service capability funnel]]
- [[../resource/skill|Resource frame]]
- [[../provider/skill|Provider frame]]
- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
