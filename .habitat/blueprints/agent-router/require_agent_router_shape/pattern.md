---
level: error
tags: [agents, documentation, routing]
---
# Require Agent Router Shape

An `AGENTS.md` is a local product-context and navigation router. It exposes
stable anchors for purpose, scope, boundaries, behavior, concepts, flow,
interfaces, routes, and validation, and at least one route uses non-self
repository-relative Markdown syntax to point at another `AGENTS.md`. Concepts
include the important entities that let an operator reason about the local
capability. This pattern rejects obvious self-links, scheme and absolute
destinations, anchors, and non-`AGENTS.md` documents. It cannot resolve `..`,
prove that the destination exists, or prove that the normalized path stays
inside the repository. Static link audit and review own those resolution facts,
the semantic locality and quality of the prose, and whether each route points
to the canonical conceptual owner.

```grit
language markdown

// Scopes the navigation law to local AGENTS routers rather than ordinary Markdown.
predicate is_agent_router() {
  $filename <: r"(?:^|.*/)AGENTS\.md$"
}

// Recognizes non-self relative route syntax without claiming filesystem resolution.
predicate has_non_self_agent_router_route($body) {
  $body <: contains `[$label]($destination)` where {
    $destination <: r"(?:^|/)AGENTS\.md(?:#.*)?$",
    not { $destination <: r"^[A-Za-z][A-Za-z0-9+.-]*:" },
    not { $destination <: r"^/" },
    not { $destination <: r"^#" },
    not { $destination <: r"^(?:\./)*AGENTS\.md(?:#.*)?$" }
  }
}

file($name, $body) where {
  is_agent_router(),
  or {
    not { $body <: contains `## Purpose` },
    not { $body <: contains `## Scope` },
    not { $body <: contains `## Boundaries` },
    not { $body <: contains `## Behavior` },
    not { $body <: contains `## Concepts` },
    not { $body <: contains `## Flow` },
    not { $body <: contains `## Interfaces` },
    not { $body <: contains `## Routing` },
    not { $body <: contains `## Validation` },
    not { has_non_self_agent_router_route(body=$body) }
  }
}
```

## Matches an incomplete router

```markdown
<!-- @filename: services/AGENTS.md -->
# Service Packages Router

## Purpose

- Host reusable product capabilities behind service-owned contracts.

## Scope

- Applies to `services/**`.

## Boundaries

- Services are sealed.

## Behavior

- Each service admits requests through its public contract.

## Concepts

- A service owns a cohesive capability set.

## Routing

- [Service authority](../../../docs/system/services.md)

## Validation

- Run the owning package checks.
```

## Ignores a complete local router

```markdown
<!-- @filename: services/AGENTS.md -->
# Service Packages Router

## Purpose

- Host reusable product capabilities behind service-owned contracts.

## Scope

- Applies to `services/**`.

## Boundaries

- Services are sealed.

## Behavior

- Each service admits requests through its public contract.

## Concepts

- A service owns a cohesive capability set.

## Flow

- Requests enter through the public service face.

## Interfaces

- Service contracts define admitted inputs, outputs, and failures.

## Routing

- [Parent router](../AGENTS.md)

## Validation

- Run the owning service checks.
```

## Matches a complete router whose routes are not valid lattice edges

```markdown
<!-- @filename: services/orders/AGENTS.md -->
# Orders Service Router

## Purpose

- Own order fulfillment behavior.

## Scope

- Applies to the orders service.

## Boundaries

- Inventory remains a neighboring capability.

## Behavior

- Orders move through their admitted fulfillment states.

## Concepts

- An order is the unit of fulfillment.

## Flow

- A caller submits an order and receives its current state.

## Interfaces

- The service contract carries order inputs and results.

## Routing

- [Bare self](AGENTS.md)
- [Dot self](./AGENTS.md)
- [Absolute root](/AGENTS.md)
- [Remote router](https://example.com/AGENTS.md)
- [Design notes](../docs/orders.md)

## Validation

- Run the owning service checks.
```
