---
level: error
tags: [agents, documentation, routing]
---
# Require Agent Router Shape

An `AGENTS.md` is a local operator plaque. It exposes stable anchors for scope,
boundaries, flow, routes, and verification, and at least one route is a
repository-relative Markdown edge to another `AGENTS.md`. This pattern owns
only those positive source relations. Review owns the semantic locality and
quality of the prose and whether each route points to the canonical conceptual
owner.

```grit
language markdown

predicate is_agent_router() {
  $filename <: r"(?:^|.*/)AGENTS\.md$"
}

predicate has_agent_router_route($body) {
  $body <: contains `[$label]($destination)` where {
    $destination <: r"(?:^|/)AGENTS\.md(?:#.*)?$",
    not { $destination <: r"^[A-Za-z][A-Za-z0-9+.-]*:" },
    not { $destination <: r"^/" },
    not { $destination <: r"^#" }
  }
}

or {
  file($name, $body) where {
    is_agent_router(),
    not { $body <: contains `## Scope` }
  },
  file($name, $body) where {
    is_agent_router(),
    not { $body <: contains `## Boundaries` }
  },
  file($name, $body) where {
    is_agent_router(),
    not { $body <: contains `## Flow` }
  },
  file($name, $body) where {
    is_agent_router(),
    not { $body <: contains `## Routing` }
  },
  file($name, $body) where {
    is_agent_router(),
    not { $body <: contains `## Validation` }
  },
  file($name, $body) where {
    is_agent_router(),
    not { has_agent_router_route(body=$body) }
  }
}
```

## Matches an incomplete router

```markdown
<!-- @filename: services/AGENTS.md -->
# Service Packages Router

## Scope

- Applies to `services/**`.

## Boundaries

- Services are sealed.

## Routing

- [Service authority](../../../docs/system/services.md)

## Validation

- Run the owning package checks.
```

## Ignores a complete local router

```markdown
<!-- @filename: services/AGENTS.md -->
# Service Packages Router

## Scope

- Applies to `services/**`.

## Boundaries

- Services are sealed.

## Flow

- Requests enter through the public service face.

## Routing

- [Parent router](../AGENTS.md)

## Validation

- Run the owning service checks.
```
