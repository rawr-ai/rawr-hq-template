# Agent Plugin Governance Module Router

## Purpose

- Expose current-main record and selection operations without relocating the
  authorities or shared model that those operations use.

## Scope

- Applies to the governance capability in this module directory.

## Boundaries

- Personal's reviewed record owns desired plugin membership; exact Git objects
  own the selected bytes. Governance does not become either authority.
- The service model owns shared selection representation and policy. This
  module owns its operation DTOs, handlers, results, issues, and operation
  policy.
- Exact-content mechanics enter through the module-projected content-workspace
  resource. The selection handler sequences that resource directly rather than
  receiving a reader or repository facade.

## Behavior

- The module encodes or validates versioned record input and uses the shared
  selection model to resolve an explicit content locator against exact Git
  content, returning the operation result or issues.

## Concepts

- A **current-main record** is Personal's versioned declaration of desired
  membership. A **content locator** identifies the reviewed record to resolve;
  a **selection** binds that declaration to exact Git content for lifecycle
  policy.

## Flow

- A caller submits record bytes, a record body, or a locator; the handler
  applies shared pure policy to typed content-workspace observations; the typed
  result returns through the service contract.

## Interfaces

- `currentMainRecord` and `currentMainSelection` are the operation boundaries.
  Module middleware contributes only the ready content-workspace resource;
  the selection handler owns observation order and policy application.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Provider convergence module](../providers/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` for current-main record,
  selection, schema-boundary, and context-boundary behavior.
