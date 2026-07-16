# Apps Router

## Scope

- Applies to `apps/**`.

## Nx First Hop

- Before exploring app code directly, use Nx to confirm the project name, root, tags, and targets:
  - `bunx nx show project <project-name> --json`
- Use the vendored Nx skills when the task is about workspace navigation, project structure, task execution, or generators.

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
- Keep authority boundaries explicit:
  - `rawr plugins ...` manages external Oclif extensions.
  - `rawr agent plugins ...` manages curated agent-plugin lifecycle.
  - server/web app composition consumes declared outputs and owns no lifecycle state.
