# Worktree Cleanup Module Router

## Purpose

- Identify and remove only development worktrees that satisfy the repository's
  explicit cleanup safety contract.

## Scope

- Applies to worktree cleanup planning and application in this module
  directory.

## Boundaries

- Cleanup must preserve exact basename-prefix, merged-state, and pinned path or
  branch exclusions.
- The module never substitutes an unqualified recursive deletion or implicit
  prune for the declared cleanup operation.

## Behavior

- The module enumerates candidate worktrees, excludes protected or ineligible
  entries, produces a dry plan by default, and reports every requested removal
  and execution failure in apply mode.

## Concepts

- A **cleanup candidate** is a discovered worktree meeting the exact prefix and
  merge policy. A **pinned worktree** is protected by path or branch; a
  **cleanup plan** distinguishes candidates, exclusions, and applied results.

## Flow

- `contract/cleanup.ts` declares the operation boundary and
  `contract/index.ts` composes the module contract.
- `module.ts` curates the Worktree operation context from the service base.
- `router/cleanup.router.ts` authors candidate admission, planning, and
  removal behavior.
- Module-root `router.ts` composes the completed operation for the service
  router.

## Interfaces

- `cleanup` is the caller operation. Its handler authors against the workspace
  root, process and path resources, and the service-owned scratch policy
  checker curated by the module. Root construction lanes remain
  service-internal and are not an operation interface.
- Module-root `router.ts` is composition only. Operation logic remains in the
  named router leaf.

## Routing

- [Development Operations service router](../../../../AGENTS.md)
- [Scratch policy module](../scratch-policy/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/rawr-dev:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-dev:test` for strict-prefix selection, pinned and
  merged exclusions, plan mode, and removal failures.
