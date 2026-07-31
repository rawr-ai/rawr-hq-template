# Habitat Catalog Service Router

## Purpose

- Resolve local Habitat authority into a deterministic catalog.

## Scope

- Applies to `services/habitat/**`.
- This service owns Habitat blueprint and instance admission semantics.

## Boundaries

- Consumers cross only through the public client. The service does not select
  providers, mount a runtime, execute rules, or expose a composite CLI.
- The service enumerates exact authority paths from its bound workspace. Callers
  provide no repository visibility or authority classification input.
- Version 2 records are inert compatibility identity facts. They never become
  an alternate execution path.

## Behavior

- The catalog module resolves closed version 3 local authority and reports all
  bounded admission failures as a rejected result.

## Concepts

- A **blueprint** defines reusable rules and instance vocabulary. An
  **instance** binds that vocabulary to one repository owner. An
  **application** is one resolved instance/rule pair.

## Flow

- Ready filesystem and path capabilities descend through service context. The
  catalog module curates them, the resolve handler sequences observation, and
  pure module policy owns admission and resolution decisions.

## Interfaces

- `src/client.ts` is the sole public caller face. The private catalog contract
  exposes one `resolve` operation.

## Routing

- [[../AGENTS|Service packages router]]
- [[src/service/modules/catalog/AGENTS|Catalog module router]]

## Validation

- Run `bunx nx run @habitat/service:typecheck`, `:test`, and `:build`.
