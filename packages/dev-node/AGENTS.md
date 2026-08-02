# Node Development Resources Router (`@habitat-ai/rawr-dev-node`)

## Purpose

- Supply Node-backed mechanics for development operations while preserving the
  host-neutral policy boundary owned by `@habitat-ai/rawr-dev`.

## Scope

- Applies to the Node resource implementation in `packages/dev-node/**`.

## Boundaries

- Owns Node filesystem, path, process, clock, and test-fixture implementations
  for the contracts exported by `@habitat-ai/rawr-dev`.
- Owns translation of environment and Git configuration into the neutral
  scratch-policy input; policy decisions remain in `@habitat-ai/rawr-dev`.
- Process execution must stay argument-based, bounded by timeout, and explicit
  about working directory and environment.

## Behavior

- The package translates an explicit development request into bounded Node
  filesystem, path, process, or clock effects and returns neutral observations
  to the service that decides policy.

## Concepts

- A **Node resource** is a concrete satisfier of a development-service
  contract. **Scratch-policy input** is an environment and Git observation,
  not the decision about whether scratch work is allowed.

## Flow

- A caller creates Node resources and supplies them to the package that owns
  the operation or policy.
- Scratch-policy input resolves from an explicit bypass, environment mode, or
  repository Git configuration, then returns neutral input to `@habitat-ai/rawr-dev`.
- Tests may select the declared command fixture; ordinary execution delegates
  to the Node process adapter.

## Interfaces

- `@habitat-ai/rawr-dev` resource contracts are the inbound capability interface; Node
  results and neutral scratch observations are the outbound handoff to service
  policy.

## Routing

- [Packages router](../AGENTS.md)
- [Development operations service](../../services/dev/AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr-dev-node:typecheck`
- `bunx nx run @habitat-ai/rawr-dev-node:test`
- `bunx nx run @habitat-ai/rawr-dev-node:build`
