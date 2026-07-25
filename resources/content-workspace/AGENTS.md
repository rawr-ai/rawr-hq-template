# Content Workspace Resource Router

## Purpose

- Expose exact, bounded Git and workspace facts to semantic owners without
  assigning release meaning to repository mechanics.

## Scope

- Applies to `resources/content-workspace/**` until a provider-local router
  narrows the scope.
- This resource owns provider-neutral contracts for exact Git and content
  workspace observation plus bounded workspace mutation mechanics.

## Boundaries

- The contract exposes raw repository, tree, blob, index, and filesystem facts.
  Eligibility, release policy, provenance meaning, and content interpretation
  belong to the consuming service.
- A repository path is a locator, not executable identity or code-sharing
  authority.
- Git subprocess and filesystem implementation details stay in concrete
  providers.

## Behavior

- The resource observes caller-selected refs, trees, blobs, indexes, and paths
  or performs a specifically requested workspace transition while preserving
  bounds and identity.

## Concepts

- A **content-workspace locator** identifies a checkout. A **Git object
  identity** pins immutable content; a **workspace observation** reports raw
  repository and filesystem facts for later interpretation.

## Flow

- A semantic owner supplies a locator, refs, admitted paths, and bounds; a
  provider returns exact observations or performs an explicitly requested
  capture and write transition with typed failures.

## Interfaces

- Semantic owners provide locators, object identities, admitted paths, and
  bounds through the contract; providers return exact observations,
  transition receipts, or typed failures.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Git Effect Platform Node provider](providers/git-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/resource-content-workspace:typecheck`.
