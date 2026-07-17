# Plugins (workspace packages)

## TOC
- [Scope](#scope)
- [Plugin Roots](#plugin-roots)
- [Plugin Ids](#plugin-ids)
- [Manifest Conventions](#manifest-conventions)
- [Build, Test, Lint](#build-test-lint)
- [Lifecycle Boundaries](#lifecycle-boundaries)

## Scope
- Applies to everything under `plugins/**`.
- This repo uses **six plugin roots**:
  - `plugins/cli/*` for CLI toolkits (`rawr.kind=toolkit`)
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
  - Do not create both `plugins/cli/foo` and `plugins/agents/foo`.
- `package.json#rawr.kind` is the authoritative classification.

## Plugin Ids
- A plugin’s id is either:
  - `package.json#name` (preferred), or
  - the leaf directory name (fallback).
- Package identity does not grant lifecycle authority. External Oclif extensions
  and curated agent plugins are separate closed channels.

## Manifest Conventions
- Always include a `package.json` at the plugin root.
- If the plugin provides **oclif commands**, declare the oclif manifest in `package.json#oclif`:
  - `commands`: built output (match whatever `tsc` emits; commonly `./dist/src/commands`)
  - `typescript.commands`: source commands (typically `./src/commands`)
- TypeScript convention: compile to `dist/**` (Nx build/test flows consume emitted output where applicable).

## Build, Test, Lint
- Workspace-wide:
  - `bun run build`
  - `bun run lint`
  - `bun run test`
- Package-only (Nx project examples):
  - `bunx nx run @rawr/plugin-hq:lint`
  - `bunx nx run @rawr/plugin-hello:test`
- Unit tests live in `test/**/*.test.ts` and are wired in root `vitest.config.ts`.

## Lifecycle Boundaries
- External Oclif extensions use `rawr plugins ...` and native Oclif state only.
- Curated agent plugins use `rawr agent plugins ...` and immutable release records only.
- Authoring changes source only. It never triggers build, export, provider
  convergence, or retirement automatically.
- App, web, and runtime composition are outside both lifecycle channels.
- Security model reference: [[docs/system/SECURITY_MODEL]].
