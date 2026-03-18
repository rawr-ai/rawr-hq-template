# Packages Router

## Scope

- Applies to `packages/**`.

## Nx First Hop

- Use Nx to identify package project names, roots, tags, and available targets before reading package-local config by hand:
  - `bunx nx show project <project-name> --json`
- Use Narsil after Nx when the question shifts from package membership to source-level dependencies or symbol usage.

## Dependency Direction

- `packages/*` may be consumed by `apps/*` and `plugins/*`.
- `packages/*` must not depend on `apps/*`.

## Routing

- `core/AGENTS.md`
- `journal/AGENTS.md`
- `security/AGENTS.md`
- `state/AGENTS.md`
- `ui-sdk/AGENTS.md`
- `test-utils/AGENTS.md`

## Parent Coverage

- Use this router as the default first hop for package dirs without a local `AGENTS.md` (for example, newly added package folders).
- Canonical process/docs pointers live in `../docs/AGENTS.md`.
