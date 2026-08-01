# Source Inventory Resource Router

## Purpose

- Give semantic owners one provider-neutral, bounded view of local visible
  entry paths.

## Scope

- Applies to `resources/source-inventory/**` until a provider-local router
  narrows the scope.
- This resource owns only observation requests, canonical path inventories,
  tracked non-file facts, and typed mechanical failures.

## Boundaries

- Filesystem kind interpretation, structure policy, blueprints,
  applications, lanes, diagnostics, and lifecycle meaning belong to consuming
  services.
- Provider selection and lifetime belong to application composition.
- Concrete source-control processes and wire formats stay in nested providers.

## Behavior

- A caller supplies one local root and entry bound; a provider returns sorted,
  unique visible entry paths and the tracked symlink/Gitlink subset.
- Empty inventories are valid.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Local-Git Effect Platform Node provider](providers/git-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint`,
  `bunx nx run @habitat-ai/resource-source-inventory:typecheck`,
  `bunx nx run @habitat-ai/resource-source-inventory:test`, and
  `bunx nx run provider-source-inventory-git-effect-platform-node:test`.
