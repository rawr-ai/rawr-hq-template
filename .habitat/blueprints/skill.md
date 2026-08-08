---
name: habitat-blueprint-direction
description: Mental model for locating work in RAWR's blueprint kinds while keeping semantic direction, ownership, and structural proof distinct.
---

# Habitat Blueprint Direction

> **Activation:** None. This lowercase `skill.md` is an unregistered design
> seed. It informs judgment but creates no discovery, enforcement, or runtime
> authority.

## Frame

A blueprint kind is a sealed architectural habitat. It gives one class of work
a stable name, a bounded interior, known public faces, and a predictable
handoff to neighboring kinds. The enclosure is valuable because an author can
reason locally without reconstructing the whole repository.

A blueprint is not a capability or niche. A capability adds a reusable facet
to an admitted instance. A niche governs a community selected from accepted
instance and capability facts. Those relations are additive; neither may
silently weaken the instance's blueprint kind.

RAWR's durable direction is:

```text
packages support
resources declare
providers implement
services own
plugins project
apps select
Nx schedules
Habitat asserts
tests prove
```

These are different authorities, not interchangeable folder labels. Shared
infrastructure does not transfer ownership. A namespace does not become an
owner. A runtime projection does not become capability truth.

## Gradient

Work moves toward the smallest kind that can own its meaning. Inside that kind,
context narrows from public boundary to local decision. Across kinds, handoffs
cross explicit public faces rather than mechanical source directories.

Strong boundaries make bad destinations unavailable. A vague `shared`,
`internal`, or `utils` container is not neutral: it erases the reason a thing
exists and expands the context required to change it. When matter does not fit
the admitted kinds, the unresolved question is ownership, not where to hide a
file.

Within a v3 blueprint, one structural spine is a singular anchor and therefore
lives at the blueprint root as `structure.toml`. Directory trees are reserved
for genuinely plural rule families whose members need additional local
context; nesting is not a substitute for naming the blueprint's one relation.

The skill seed supplies orientation. Neighboring `structure.toml` files close
filesystem possibility, `pattern.md` files assert source relations, TypeScript
owns type compatibility, and behavioral tests prove the capability itself.
None may impersonate another.

## Relations

- [[../AUTHORITY|Habitat authority]]
- [[../AUTHORITY-ONTOLOGY|Habitat authority ontology]]
- [[agent-router/skill|Agent routers]]
- [[blueprint-packet/skill|Blueprint packets]]
- [[grit-pattern/skill|Grit patterns]]
- [[nx-workspace/skill|Nx workspaces]]
- [[oclif-app/skill|Oclif applications]]
- [[oclif-command-plugin/skill|Oclif command plugins]]
- [[plugin/skill|Plugins]]
- [[plugin-server/skill|Server plugins]]
- [[provider/skill|Providers]]
- [[resource/skill|Resources]]
- [[service/skill|Services]]
