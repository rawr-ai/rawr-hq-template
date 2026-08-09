# Apps Router

## Purpose

- Own executable application hosts. Habitat platform composition remains
  distinct from downstream product applications awaiting owner transfer.

## Scope

- Applies to `apps/**`.

## Nx First Hop

- Before exploring app code directly, use Nx to confirm the project name, root, tags, and targets:
  - `bunx nx show project <project-name> --json`
- Use the vendored Nx skills when the task is about workspace navigation, project structure, task execution, or generators.

## Runtime Surfaces

- Habitat CLI application and Nx entrypoint: `apps/habitat/`
- CLI runtime and command entrypoint: `apps/cli/`
- Web host shell runtime: `apps/web/`

## Boundaries

- Reuse `@rawr/*` packages; avoid cross-app internal coupling.
- Keep authority boundaries explicit:
  - `habitat plugins ...` manages external Oclif extensions.
  - `rawr agent plugins ...` manages curated agent-plugin lifecycle.
  - server/web app composition consumes declared outputs and owns no lifecycle state.

## Behavior

- An app chooses runtime composition and presentation for its surface while
  delegating domain decisions to the package, service, or plugin that owns
  them.

## Concepts

- A **host shell** supplies process or browser context around declared
  capabilities. A **runtime surface** is one independently executable user or
  operator entrypoint.

## Flow

- Each app assembles declared packages, services, and plugins through its
  public entrypoint.
- The CLI parses operator input and delegates domain work to the owning
  service or package.
- Server and web hosts consume declared runtime capabilities; they do not
  become fallback lifecycle owners.

## Interfaces

- Apps consume public package exports, service clients, and plugin
  contributions; their outputs are process entrypoints, HTTP surfaces, CLI
  rendering, or browser composition.

## Routing

- [Habitat app router](habitat/AGENTS.md) for Habitat provider selection,
  Oclif composition, and the published Nx entrypoint.
- [CLI router](cli/AGENTS.md) for command topology and CLI-specific
  invariants.
- [Web router](web/AGENTS.md) for the web host shell.
- [Packages router](../packages/AGENTS.md) for shared package boundaries.
- [Plugins router](../plugins/AGENTS.md) for plugin contracts consumed by
  apps.

## Validation

- Use `bunx nx show project <project-name> --json` to select the owning app's
  targets.
- Run that app's Nx `lint`, `typecheck`, and behavior tests before broad
  repository checks.
