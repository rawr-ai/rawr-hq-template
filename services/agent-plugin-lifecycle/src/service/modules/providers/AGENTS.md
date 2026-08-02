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
  content-workspace and native-provider resources in their oRPC handlers. They
  do not delegate selection, observation, or mutation to an exported runner,
  resolver, engine, narrowed port, dependency bag, or workspace branch.
- A native-provider session remains local to the operation that acquired it.
  Pure module policy receives TypeBox-admitted capabilities, inventory, file
  observations, and command outcomes; it returns assessments, bounded plans,
  postconditions, and public result classifications without retaining a
  session or performing an Effect.
- TypeBox request, result, issue, and fact schemas live with their Provider DTO
  meanings. The module contract imports those authorities directly; no parallel
  schema facade or barrel may create a second public model face.
- Aggregate result classification, rejected-target projection, issue
  collection, and target ordering are module policy. A router leaf authors an
  oRPC operation; it is not a destination for detached result helpers.
- Native-provider sessions supply observation and mutation mechanics; they are
  not a competing authority.
- Disposable test convergence never retires unrelated installed content;
  canonical sync may retire omitted targets according to its declared policy.
- Disposable tests materialize one complete provider-native marketplace from
  exact Git bytes below the caller's disposable root. The content-workspace
  resource owns that scoped filesystem lifetime; no checkout path, receipt,
  handle, or persisted projection becomes native desired state.

## Behavior

- The module resolves and canonicalizes its invocation-local desired content,
  revalidates exact Git content, directly inspects native inventory, classifies
  drift or blockers, and performs an admitted bounded transition before
  returning an aggregate result.

## Concepts

- A **provider target** binds a native provider and home. A reviewed record
  declares desired membership, while **selected content** supplies its exact
  Git bytes. **Convergence** means native inventory matches that selection;
  **drift** and **blockers** explain why it does not.

## Flow

- Status performs one complete governed channel selection from the ready
  content-workspace resource. Sync repeats that complete selection only when
  mutation may be required. Test selects exact local Git bytes, materializes
  one full marketplace closure for the surrounding Effect scope, and repeats
  selection against the same scoped root before mutation. Targeted mode narrows
  native actions, not the catalog bytes named by its exact manifests. A
  mutating operation reacquires every target for one final all-target preflight,
  then reuses only that final session for ordered mutation and immediate
  confirmation.

## Interfaces

- The `status`, `test`, and `sync` operations are caller boundaries. Status and
  sync consume current-main; test consumes an explicit workspace. The ready
  content-workspace and native-provider resources are mechanics handoffs, not
  competing authorities.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Current-main governance module](../governance/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-agent-plugin-lifecycle:test` for selection, status,
  disposable test, sync, revalidation, and native convergence behavior.
