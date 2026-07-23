# Content Workspace Resource Router

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

## Flow

- A semantic owner supplies a locator, refs, admitted paths, and bounds; a
  provider returns exact observations or performs an explicitly requested
  capture and write transition with typed failures.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Git Effect Platform Node provider](providers/git-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/resource-content-workspace:lint` and
  `bunx nx run @rawr/resource-content-workspace:typecheck`.
