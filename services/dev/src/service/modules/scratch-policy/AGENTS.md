# Scratch Policy Module Router

## Purpose

- Check whether required planning scratch artifacts are present under the
  configured workspace roots.

## Scope

- Applies to planning-scratch artifact discovery and policy reporting in this
  module directory.

## Boundaries

- The caller may select roots, accepted plan and working-pad filenames, policy
  mode, bypass, and enforcement. The host supplies workspace, path, and
  filesystem mechanics.
- The module reports artifact presence; it does not admit locations, grant
  filesystem permission, remove worktrees, or mutate repository state.

## Behavior

- Unless bypassed or off, the module searches configured roots for accepted
  plan-scratch and working-pad filenames, reports matches and missing artifact
  kinds, and marks the result blocked only for enforced block mode.

## Concepts

- A **scratch root** is a workspace-relative search root. **Plan scratch** and
  **working pad** are the required planning artifact kinds. **Mode**, **bypass**,
  and **enforce** determine whether discovery runs and whether missing artifacts
  produce a blocking result.

## Flow

- The caller submits roots, filename sets, and policy controls; the handler
  searches through host resources; it returns matches, missing artifact kinds,
  and the resulting blocked state.

## Interfaces

- `check` is the caller boundary. Its handler authors against `workspaceRoot`
  plus file and path resources curated by the module for artifact discovery.
  Root construction lanes remain service-internal and are not an operation
  interface.

## Routing

- [Development Operations service router](../../../../AGENTS.md)
- [Worktree cleanup module](../worktree/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/dev:typecheck`.
- Run `bunx nx run @rawr/dev:test` when scratch artifact discovery, modes,
  bypass, or enforcement changes.
