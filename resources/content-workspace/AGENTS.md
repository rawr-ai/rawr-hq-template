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
- A Git checkout is a versioned-content and inspection input. Its path is not
  controller, provider, release, or executable identity, and this resource does
  not turn it into a repository-sync or symlink channel.
- Remote repository acquisition, source materialization, and ancestry belong
  to the versioned-content resource. This resource may materialize
  caller-supplied exact bytes only at one named child of a caller-owned
  disposable parent. The caller owns that parent and its lifetime.
- Git subprocess and filesystem implementation details stay in concrete
  providers.

## Behavior

- The resource observes caller-selected refs, trees, blobs, indexes, and paths,
  performs a specifically requested workspace transition, or creates a bounded
  stable disposable tree from exact bytes. Tree and staged-index observations
  return closed typed facts; providers own native Git protocol decoding and
  clean only private staging paths. Disposable materialization writes regular
  files rather than links and leaves the caller-owned root intact.

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
  `bunx nx run @habitat-ai/resource-content-workspace:typecheck`.
