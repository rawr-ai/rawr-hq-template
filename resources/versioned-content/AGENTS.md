# Versioned Content Resource Router

## Purpose

- Expose exact, bounded facts from caller-selected versioned content without
  assigning product meaning to remote repository mechanics.

## Scope

- Applies to `resources/versioned-content/**` until a provider-local router
  narrows the scope.
- This resource owns the provider-neutral contract for remote tree
  observation, materialization, and commit ancestry.

## Boundaries

- The contract reports repository, ref, tree, blob, mode, and ancestry facts
  only. Vendor identity, update admission, payload equivalence, and authoring
  policy belong to the consuming semantic owner.
- Provider selection and lifetime belong to application/runtime composition.
- Git subprocess, temporary repository, and filesystem mechanics stay in
  concrete providers.

## Behavior

- The resource observes or materializes one exact caller-selected remote tree,
  or answers one exact ancestry query, within caller-supplied bounds.

## Concepts

- A **versioned-content source** is a repository locator plus full ref and
  repository-relative tree path. A **materialized tree** adds exact blob bytes
  to the observed immutable Git identities.

## Flow

- A semantic owner supplies a repository locator, ref, path, object identities,
  and bounds; a provider acquires the remote facts and returns them or a typed
  resource failure.

## Interfaces

- Provider-neutral requests and exact Git facts cross the contract; provider
  acquisition, cleanup, process execution, and configuration inheritance do
  not.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Git Effect Platform Node provider](providers/git-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @habitat-ai/resource-versioned-content:typecheck`.

