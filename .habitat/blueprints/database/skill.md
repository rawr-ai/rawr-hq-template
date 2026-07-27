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
and store implementations. TypeBox owns logical record structure, while the
migrations own physical evolution. A closed `schema` interior appears only
when the selected database technology requires physical mappings beyond those
two authorities. The database does not become a home for generated clients,
memory substitutes, repositories, sessions, provider wiring, helpers, or
alternate composition faces.

## Funnel

```text
provider -> resource -> service base -> named middleware
  -> store capability -> module handler
```

The provider realizes an external database resource. The application binds
that ready dependency into service context. Named service-root middleware may
use the service-owned database source to project narrow store capabilities.
Modules inherit those capabilities through native oRPC context; they do not
construct persistence or import database internals.

## Relations

- [[README|Database boundary]]
- [[../service/skill|Service capability funnel]]
- [[../resource/skill|Resource frame]]
- [[../provider/skill|Provider frame]]
- [[../skill|Blueprint direction]]
- [[../../AUTHORITY|Habitat authority]]
