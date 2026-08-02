# Repository Operations Module Router

## Purpose

- Plan and perform a guarded synchronization of a development repository with
  its selected upstream branch.

## Scope

- Applies to repository upstream synchronization in this module directory.

## Boundaries

- The module owns readiness, ordering, and plan/apply semantics; Git and
  Graphite execution remain host resource mechanics.
- It does not own cross-repository content transfer, release policy, stack
  draining, or worktree removal.

## Behavior

- Repository sync resolves the requested remote and branch, verifies required
  refs and Graphite readability before mutation, builds an ordered command
  plan, and reports each applied step and failure.

## Concepts

- An **upstream target** is the explicit remote branch to integrate. A
  **preflight** proves required repository facts; a **sync plan** is the
  ordered, inspectable set of commands used in plan or apply mode.

## Flow

- `contract/sync-upstream.ts` declares the operation boundary and
  `contract/index.ts` composes the module contract.
- `module.ts` curates the Repo operation context from the service base.
- `router/sync-upstream.router.ts` authors target resolution, admission,
  planning, and ordered execution.
- Module-root `router.ts` composes the completed operation for the service
  router.

## Interfaces

- `syncUpstream` is the caller operation. Its handler authors against the
  workspace root, process and clock resources, and the service-owned scratch
  policy checker curated by the module. Root construction lanes remain
  service-internal and are not an operation interface.
- Module-root `router.ts` is composition only. Operation logic remains in the
  named router leaf.

## Routing

- [Development Operations service router](../../../../AGENTS.md)
- [Graphite stack module](../stack/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-dev:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-dev:test` for target resolution, missing refs,
  Graphite preflight, plan mode, and applied failure reporting.
