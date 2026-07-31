# Plugins

## TOC
- [Purpose](#purpose)
- [Scope](#scope)
- [Plugin Roots](#plugin-roots)
- [Plugin Ids](#plugin-ids)
- [Manifest Conventions](#manifest-conventions)
- [Boundaries](#boundaries)
- [Behavior](#behavior)
- [Concepts](#concepts)
- [Flow](#flow)
- [Interfaces](#interfaces)
- [Routing](#routing)
- [Validation](#validation)

## Purpose

- Extend RAWR through explicitly classified command, web, API, workflow, and
  schedule capabilities without collapsing their distinct
  composition or lifecycle models.

## Scope
- Applies to everything under `plugins/**`.
- This repo uses **five plugin roots**:
  - `plugins/cli/commands/*` for host-composed Oclif command capabilities
  - `plugins/web/*` for runtime/web plugins (`rawr.kind=web`)
  - `plugins/server/api/*` for server/API runtime adapters (`rawr.kind=api`)
  - `plugins/async/workflows/*` for workflow runtime adapters (`rawr.kind=workflows`)
  - `plugins/async/schedules/*` for recurring trigger runtime adapters (`rawr.kind=schedules`)
- Command-plugin leaves are workspace packages. API server plugins are
  package-less Nx projects composed from source through their public `api.ts`
  and `client.ts` faces.

## Nx First Hop

- Use Nx first to identify plugin project names, roots, tags, and runnable targets:
  - `bunx nx show projects --projects "plugins/**"`
  - `bunx nx show project <project-name> --json`
- Use the vendored Nx skills for plugin workspace navigation and task execution before falling back to manual repo exploration.

## Plugin Roots
- Leaf directory names must be **globally unique** across all roots.
- Root placement is authoritative for Oclif command-plugin classification. Do
  not add a second metadata identity for packages under `plugins/cli/commands`.
- Other plugin families use the metadata declared by their owning plugin kind;
  no cross-family metadata field may create a second identity.

## Plugin Ids
- A command plugin's id is `package.json#name`.
- A package-less API plugin's Nx project name is its repository identity; its
  leaf directory names the capability.
- Package identity does not grant lifecycle authority. External Oclif
  extensions and the curated agent-plugin lifecycle are separate closed
  channels.

## Manifest Conventions
- Oclif command-plugin packages include `package.json`. Package-less API server
  plugins do not.
- If the plugin provides **oclif commands**, declare the oclif manifest in `package.json#oclif`:
  - `commands`: `./dist/commands`
  - `typescript.commands`: `./src/commands`
- Command plugins compile source-only from `src` to `dist`, generate
  `oclif.manifest.json` with the official Oclif tool under Bun, and typecheck
  tests separately without emitting them.

## Boundaries

- External Oclif extensions use `rawr plugins ...` and native Oclif state only.
- The curated agent-plugin lifecycle uses `rawr agent plugins ...`; one
  reviewed Personal Git channel record selects exact Git objects, while native
  provider inventory is installed-state truth.
- Personal alone owns curated agent-plugin content. Template owns the generic
  lifecycle mechanics behind the qualified command.
- Template owns no persistent agent-plugin release store or competing provider
  state.
- Authoring changes source only. It never triggers build, export, provider
  convergence, or retirement automatically.
- App, web, and runtime composition are outside both lifecycle channels.
- [Security model](../docs/system/SECURITY_MODEL.md)

## Behavior

- A plugin is admitted by its root and identity, validated as its own project,
  and composed only by the host or lifecycle channel responsible for that
  plugin kind.

## Concepts

- A **plugin kind** determines placement and composition. A **plugin id**
  identifies one globally unique leaf. A **lifecycle channel** governs how a
  plugin reaches executable or provider state and is not inferred from content
  alone.

## Flow

- Source enters through the plugin project that owns its declared kind.
- Nx checks that project; Oclif composes command plugins through package
  manifests while app hosts compose package-less API plugins through their
  public source faces.

## Interfaces

- Oclif manifests expose command plugins; API, workflow, schedule, and web
  plugins expose declared host contribution faces.

## Routing

- [Repository router](../AGENTS.md)
- [ChatGPT Corpus command plugin](cli/commands/chatgpt-corpus/AGENTS.md)
- [DevOps command plugin](cli/commands/devops/AGENTS.md)
- [Hello command plugin](cli/commands/hello/AGENTS.md)
- [Hyperresearch command plugin](cli/commands/hyperresearch/AGENTS.md)
- [Session Tools command plugin](cli/commands/session-tools/AGENTS.md)
- [Habitat command plugin](cli/commands/habitat/AGENTS.md)
- [Example API plugin](server/api/example-todo/AGENTS.md)

## Validation

- Use `bunx nx show project <project-name> --json` to confirm the owning
  plugin's kind and targets.
- Run the owning plugin's Nx `lint`, `typecheck`, and behavior tests.
- Run Oclif manifest or command-boundary checks when a command plugin's public
  surface changes.
- Unit tests live in `test/**/*.test.ts` and are wired in root
  `vitest.config.ts`.
