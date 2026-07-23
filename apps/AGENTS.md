# Apps Router

## Scope

- Applies to `apps/**`.

## Nx First Hop

- Before exploring app code directly, use Nx to confirm the project name, root, tags, and targets:
  - `bunx nx show project <project-name> --json`
- Use the vendored Nx skills when the task is about workspace navigation, project structure, task execution, or generators.

## Runtime Surfaces

- CLI runtime and command entrypoint: `apps/cli/`
- HQ application shell: `apps/hq/`
- Local server runtime: `apps/server/`
- Web host shell runtime: `apps/web/`

## Boundaries

- Reuse `@rawr/*` packages; avoid cross-app internal coupling.
- Keep authority boundaries explicit:
  - `rawr plugins ...` manages external Oclif extensions.
  - `rawr agent plugins ...` manages curated agent-plugin lifecycle.
  - server/web app composition consumes declared outputs and owns no lifecycle state.

## Flow

- Each app assembles declared packages, services, and plugins through its
  public entrypoint.
- The CLI parses operator input and delegates domain work to the owning
  service or package.
- Server and web hosts consume declared runtime capabilities; they do not
  become fallback lifecycle owners.

## Routing

- [CLI router](cli/AGENTS.md) for command topology and CLI-specific
  invariants.
- [HQ app router](hq/AGENTS.md) for the HQ application shell.
- [Server router](server/AGENTS.md) for the local server runtime.
- [Web router](web/AGENTS.md) for the web host shell.
- [Packages router](../packages/AGENTS.md) for shared package boundaries.
- [Plugins router](../plugins/AGENTS.md) for plugin contracts consumed by
  apps.

## Validation

- Use `bunx nx show project <project-name> --json` to select the owning app's
  targets.
- Run that app's Nx `lint`, `typecheck`, and behavior tests before broad
  repository checks.
