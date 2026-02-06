# Apps Router

## Scope

- Applies to `apps/**`.

## Runtime Surfaces

- CLI runtime and command entrypoint: `apps/cli/`
- Local server runtime: `apps/server/`
- Web host shell runtime: `apps/web/`

## Routing

- `apps/cli/AGENTS.md` for command topology and CLI-specific invariants.
- `../packages/AGENTS.md` for shared package boundaries.
- `../plugins/AGENTS.md` for plugin contracts consumed by server/web.
- `../docs/system/PLUGINS.md` for plugin architecture references.

## Invariants

- Reuse `@rawr/*` packages; avoid cross-app internal coupling.
- Keep command examples aligned with channel split:
  - `rawr plugins ...` (external CLI plugins)
  - `rawr hq plugins ...` (workspace runtime plugins)
