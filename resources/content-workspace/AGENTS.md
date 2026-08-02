# Content Workspace Resource Router

## Purpose

- Expose exact, bounded Git and workspace facts to semantic owners without
  assigning release meaning to repository mechanics.

## Scope

- Applies to `resources/content-workspace/**` until a provider-local router
  narrows the scope.
- This resource owns provider-neutral contracts for exact local Git and content
  workspace observation plus bounded workspace mutation mechanics.

## Boundaries

- The contract exposes raw repository, blob, ordinary workspace evidence, and
  filesystem facts plus typed regular-file tree entries and typed staged-index
  facts.
  Eligibility, release policy, provenance meaning, and content interpretation
  belong to the consuming service.
- A repository path is a locator, not executable identity or code-sharing
  authority.
- Remote repository acquisition, source materialization, and ancestry belong
  to the versioned-content resource. This resource may materialize
  caller-supplied exact bytes only as a fresh child of a caller-owned local
  parent whose lifetime is bound to the surrounding Effect scope.
- Git subprocess and filesystem implementation details stay in concrete
  providers.

## Behavior

- The resource observes caller-selected refs, trees, blobs, indexes, and paths,
  performs a specifically requested workspace transition, or creates a bounded
  invocation-scoped local tree from exact bytes. Tree and staged-index
  observations return closed typed facts; providers own their native Git
  protocol decoding and scoped filesystem cleanup.

## Concepts

- A **content-workspace locator** identifies a checkout. A **Git object
  identity** pins immutable content; a **workspace observation** reports raw
  repository and filesystem facts for later interpretation.

## Flow

- A semantic owner supplies a locator or parent, refs, admitted paths, exact
  bytes, and bounds; a provider returns exact observations or performs an
  explicitly requested bounded transition with typed failures.

## Interfaces

- Semantic owners provide locators, object identities, admitted paths, and
  bounds through the contract; providers return exact typed observations,
  transition receipts, or typed failures.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Git Effect Platform Node provider](providers/git-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @habitat-ai/rawr-resource-content-workspace:typecheck`.
