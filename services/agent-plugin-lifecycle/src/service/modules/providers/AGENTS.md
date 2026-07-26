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
  policy, its narrowed content-workspace read port, resolution, provider
  operation DTOs, handlers, results, issues, and admitted mutation policy.
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

- Status, test, or sync resolves desired content from the ready host
  content-workspace capability, preflights target sessions, and either reports
  observations or performs module-admitted mutations after exact-source
  revalidation.

## Interfaces

- The `status`, `test`, and `sync` operations are caller boundaries.
  Selected-content resolution consumes current-main or an explicit workspace;
  the narrowed content-workspace port and native sessions are mechanics
  handoffs, not competing authorities.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Current-main governance module](../governance/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` for selection, status,
  disposable test, sync, revalidation, and target reconciliation behavior.
