# Agent Plugin Package Output Resource Router

## Scope

- Applies to `resources/agent-plugin-package-output/**` until a provider-local
  router narrows the scope.
- This resource owns provider-neutral archive-encoding and package-output
  publication contracts.

## Boundaries

- The semantic owner selects and orders archive entries, output paths, bounds,
  and format controls. This resource performs only encoding and publication
  mechanics.
- Provider libraries, temporary-file strategy, and filesystem implementation
  stay outside `contract.ts`.
- Publication results report mechanical outcomes; they do not select releases
  or grant channel authority.

## Flow

- A consumer supplies canonical archive entries or output bytes; a concrete
  provider encodes or publishes them and returns a converged, verified,
  rejected, or unsettled result.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Cowork v1 Effect Platform Node provider](providers/cowork-v1-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/resource-agent-plugin-package-output:typecheck`.
