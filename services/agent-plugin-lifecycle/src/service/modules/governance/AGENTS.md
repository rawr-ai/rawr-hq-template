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
- Exact-content mechanics enter the selection operation through module
  middleware projected from service context rather than direct filesystem or
  Git access.

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
  applies the shared record policy or projected current-main reader; the typed
  result returns through the service contract.

## Interfaces

- `currentMainRecord` and `currentMainSelection` are the operation boundaries.
  Selection middleware contributes the current-main reader without becoming an
  ownership boundary. Native oRPC context remains additive, so exact handler
  context stays open at the service root.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Provider convergence module](../providers/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` for current-main record,
  selection, schema-boundary, and context-boundary behavior.
