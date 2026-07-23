# Packages Router

## Scope

- Applies to `packages/**`.

## Nx First Hop

- Use Nx to identify package project names, roots, tags, and available targets before reading package-local config by hand:
  - `bunx nx show project <project-name> --json`
- Use Narsil after Nx when the question shifts from package membership to source-level dependencies or symbol usage.

## Boundaries

- `packages/*` may be consumed by `apps/*` and `plugins/*`.
- `packages/*` must not depend on `apps/*`.
- Package-local internals are not cross-package APIs; consumers use declared
  exports.

## Flow

- Reusable capabilities enter through a package's declared public exports.
- Services, plugins, and apps compose those exports without reaching into
  package internals.
- Concrete provider or filesystem behavior belongs behind its owning resource,
  not in a generic package fallback.

## Routing

- [Repository router](../AGENTS.md)
- [Bootgraph package](bootgraph/AGENTS.md)
- [Core package](core/AGENTS.md)
- [Development node package](dev-node/AGENTS.md)
- [HQ SDK package](hq-sdk/AGENTS.md)
- [oRPC client package](orpc-client/AGENTS.md)
- [Runtime context package](runtime-context/AGENTS.md)
- [Test utilities package](test-utils/AGENTS.md)
- [UI SDK package](ui-sdk/AGENTS.md)

## Parent Coverage

- Use this router as the default first hop for package dirs without a local `AGENTS.md` (for example, newly added package folders).
- Canonical process and docs pointers live in the
  [docs router](../docs/AGENTS.md).

## Validation

- Use `bunx nx show project <project-name> --json` to confirm package targets
  and dependency tags.
- Run the owning package's Nx `lint`, `typecheck`, and behavior tests.
- Use the Nx project graph to verify dependency direction when exports or
  cross-package imports change.
