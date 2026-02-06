# Packages Router

## Scope

- Applies to `packages/**`.

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
