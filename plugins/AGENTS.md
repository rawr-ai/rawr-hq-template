# Plugins (workspace packages)

## TOC
- [Scope](#scope)
- [Plugin Roots](#plugin-roots)
- [Plugin Ids](#plugin-ids)
- [Manifest Conventions](#manifest-conventions)
- [Boundaries](#boundaries)
- [Flow](#flow)
- [Routing](#routing)
- [Validation](#validation)

## Scope
- Applies to everything under `plugins/**`.
- This repo uses **six plugin roots**:
  - `plugins/cli/commands/*` for host-composed Oclif command capabilities
  - `plugins/agents/*` for agent offices (`rawr.kind=agent`)
  - `plugins/web/*` for runtime/web plugins (`rawr.kind=web`)
  - `plugins/server/api/*` for server/API runtime adapters (`rawr.kind=api`)
  - `plugins/async/workflows/*` for workflow runtime adapters (`rawr.kind=workflows`)
  - `plugins/async/schedules/*` for recurring trigger runtime adapters (`rawr.kind=schedules`)
- Each leaf directory is a workspace package (see root `package.json#workspaces`).

## Nx First Hop

- Use Nx first to identify plugin project names, roots, tags, and runnable targets:
  - `bunx nx show projects --projects "plugins/**"`
  - `bunx nx show project <project-name> --json`
- Use the vendored Nx skills for plugin workspace navigation and task execution before falling back to manual repo exploration.

## Plugin Roots
- Leaf directory names must be **globally unique** across all roots.
  - Do not create both `plugins/cli/commands/foo` and `plugins/agents/foo`.
- Root placement is authoritative for Oclif command-plugin classification. Do
  not add a second metadata identity for packages under `plugins/cli/commands`.
- Other plugin families use the metadata declared by their owning plugin kind;
  no cross-family metadata field may create a second identity.

## Plugin Ids
- A plugin’s id is either:
  - `package.json#name` (preferred), or
  - the leaf directory name (fallback).
- Package identity does not grant lifecycle authority. External Oclif extensions
  and curated agent plugins are separate closed channels.

## Manifest Conventions
- Always include a `package.json` at the plugin root.
- If the plugin provides **oclif commands**, declare the oclif manifest in `package.json#oclif`:
  - `commands`: `./dist/commands`
  - `typescript.commands`: `./src/commands`
- Command plugins compile source-only from `src` to `dist`, generate
  `oclif.manifest.json` with the official Oclif tool under Bun, and typecheck
  tests separately without emitting them.

## Boundaries

- External Oclif extensions use `rawr plugins ...` and native Oclif state only.
- Curated agent plugins use `rawr agent plugins ...`; one reviewed Personal
  Git channel record selects exact Git objects, while native provider inventory
  is installed-state truth.
- Template owns no persistent agent-plugin release store or competing provider
  state.
- Authoring changes source only. It never triggers build, export, provider
  convergence, or retirement automatically.
- App, web, and runtime composition are outside both lifecycle channels.
- [Security model](../docs/system/SECURITY_MODEL.md)

## Flow

- Source enters through the plugin package that owns its declared kind.
- Nx builds and tests that package; Oclif composes command plugins through
  their package manifests.
- Curated agent content reaches its lifecycle only through the qualified agent
  plugin surface; authoring never performs provider mutation.

## Routing

- [Repository router](../AGENTS.md)
- [HQ agent plugin](agents/hq/AGENTS.md)
- [ChatGPT Corpus command plugin](cli/commands/chatgpt-corpus/AGENTS.md)
- [DevOps command plugin](cli/commands/devops/AGENTS.md)
- [Hello command plugin](cli/commands/hello/AGENTS.md)
- [Hyperresearch command plugin](cli/commands/hyperresearch/AGENTS.md)
- [Session Tools command plugin](cli/commands/session-tools/AGENTS.md)
- [Example API plugin](server/api/example-todo/AGENTS.md)

## Validation

- Use `bunx nx show project <project-name> --json` to confirm the owning
  plugin's kind and targets.
- Run the owning plugin's Nx `lint`, `typecheck`, and behavior tests.
- Run Oclif manifest or command-boundary checks when a command plugin's public
  surface changes.
- Unit tests live in `test/**/*.test.ts` and are wired in root
  `vitest.config.ts`.
