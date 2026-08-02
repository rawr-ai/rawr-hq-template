# Agent Plugin Package Output Resource Router

## Purpose

- Separate deterministic archive encoding and output publication mechanics
  from the lifecycle policy that chooses what should be packaged.

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

## Behavior

- The resource encodes caller-ordered entries or publishes caller-supplied
  bytes, then reports a verified mechanical outcome without selecting a
  release or channel.

## Concepts

- **Archive entries** are the canonical ordered packaging input. A
  **publication outcome** distinguishes converged, rejected, and unsettled
  mechanics from semantic release success.

## Flow

- A consumer supplies canonical archive entries or output bytes; a concrete
  provider encodes or publishes them and returns a converged, verified,
  rejected, or unsettled result.

## Interfaces

- Semantic owners submit entries, bytes, paths, and bounds through the neutral
  contract; providers return encoded output or typed publication results.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Cowork v1 Effect Platform Node provider](providers/cowork-v1-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @habitat-ai/rawr-resource-agent-plugin-package-output:typecheck`.
