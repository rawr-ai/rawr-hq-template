# Node Development Resources Router (`@rawr/dev-node`)

## Scope

- Applies to the Node resource implementation in `packages/dev-node/**`.

## Boundaries

- Owns Node filesystem, path, process, clock, and test-fixture implementations
  for the contracts exported by `@rawr/dev`.
- Owns translation of environment and Git configuration into the neutral
  scratch-policy input; policy decisions remain in `@rawr/dev`.
- Process execution must stay argument-based, bounded by timeout, and explicit
  about working directory and environment.

## Flow

- A caller creates Node resources and supplies them to the package that owns
  the operation or policy.
- Scratch-policy input resolves from an explicit bypass, environment mode, or
  repository Git configuration, then returns neutral input to `@rawr/dev`.
- Tests may select the declared command fixture; ordinary execution delegates
  to the Node process adapter.

## Routing

- [Packages router](../AGENTS.md)
- [Development operations service](../../services/dev/AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/dev-node:typecheck`
- `bunx nx run @rawr/dev-node:test`
- `bunx nx run @rawr/dev-node:build`
