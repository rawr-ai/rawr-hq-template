# Native Provider Convergence Module Router

## Purpose

- Compare reviewed selected content with live native provider state and
  perform bounded convergence when an explicit operation admits mutation.

## Scope

- Applies to provider test, status, and sync capabilities in this module
  directory.

## Boundaries

- Personal's reviewed record owns desired membership, exact Git objects own the
  selected bytes, and native inventory owns installed state.
- The service model owns the current-main and release meanings that genuinely
  cross modules. This module owns selected-content DTOs, native marketplace
  policy, source-interface classification, selected-content projection,
  native-state policy, provider operation DTOs, handlers, results, issues, and
  admitted mutation policy.
- Status, sync, and disposable test directly consume the ready
  content-workspace resource in their oRPC handlers. They do not delegate
  source selection to an exported runner, resolver, narrowed port, dependency
  bag, or workspace branch. Native observation and mutation still use the
  module's existing reconciliation functions until their separate
  operation-authorship cut.
- Native-provider sessions supply observation and mutation mechanics; they are
  not a competing authority.
- Disposable test convergence never retires unrelated installed content;
  canonical sync may retire omitted targets according to its declared policy.

## Behavior

- The module resolves and canonicalizes its invocation-local desired content,
  revalidates exact Git content, inspects native inventory, classifies drift
  or blockers, and optionally reconciles each target before returning an
  aggregate result.

## Concepts

- A **provider target** binds a native provider and home. A reviewed record
  declares desired membership, while **selected content** supplies its exact
  Git bytes. **Convergence** means native inventory matches that selection;
  **drift** and **blockers** explain why it does not.

## Flow

- Status performs one complete governed channel selection from the ready
  content-workspace resource. Sync repeats that complete selection only when
  mutation may be required. Test performs complete local source selection,
  repeats it before mutation, and preserves omitted members.

## Interfaces

- The `status`, `test`, and `sync` operations are caller boundaries. Status and
  sync consume current-main; test consumes an explicit workspace. The ready
  content-workspace and native-provider resources are mechanics handoffs, not
  competing authorities.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Current-main governance module](../governance/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` for selection, status,
  disposable test, sync, revalidation, and target reconciliation behavior.
