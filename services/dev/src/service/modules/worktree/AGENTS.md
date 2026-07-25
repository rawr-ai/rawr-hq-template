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

- The caller supplies repository scope, expected prefix, pins, and apply
  posture; the module evaluates worktree facts and either returns the plan or
  executes only its admitted removals.

## Interfaces

- `cleanup` is the caller operation. Repository and process resources supply
  worktree observations and exact removal commands.

## Routing

- [Development Operations service router](../../../../AGENTS.md)
- [Scratch policy module](../scratch-policy/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/dev:typecheck`.
- Run `bunx nx run @rawr/dev:test` for strict-prefix selection, pinned and
  merged exclusions, plan mode, and removal failures.
