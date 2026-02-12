# Plugins (workspace packages)

## TOC
- [Scope](#scope)
- [Plugin Roots](#plugin-roots)
- [Plugin Ids](#plugin-ids)
- [Manifest Conventions](#manifest-conventions)
- [Build, Test, Lint](#build-test-lint)
- [Security And Enablement](#security-and-enablement)

## Scope
- Applies to everything under `plugins/**`.
- This repo uses **three plugin roots**:
  - `plugins/cli/*` for CLI toolkits (`rawr.kind=toolkit`)
  - `plugins/agents/*` for agent offices (`rawr.kind=agent`)
  - `plugins/web/*` for runtime/web plugins (`rawr.kind=web`)
- Each leaf directory is a workspace package (see root `package.json#workspaces`).

## Plugin Roots
- Leaf directory names must be **globally unique** across all roots.
  - Do not create both `plugins/cli/foo` and `plugins/agents/foo`.
- `package.json#rawr.kind` is the authoritative classification.

## Plugin Ids
- A plugin’s id is either:
  - `package.json#name` (preferred), or
  - the leaf directory name (fallback).
- Workspace runtime enablement uses:
  - `rawr plugins web enable <id>`

## Manifest Conventions
- Always include a `package.json` at the plugin root.
- If the plugin provides **oclif commands**, declare the oclif manifest in `package.json#oclif`:
  - `commands`: built output (match whatever `tsc` emits; commonly `./dist/src/commands`)
  - `typescript.commands`: source commands (typically `./src/commands`)
- TypeScript convention: compile to `dist/**` (Turbo expects `dist/**` outputs).

## Build, Test, Lint
- Workspace-wide:
  - `bun run build`
  - `bun run lint`
  - `bun run test`
- Package-only (Turbo filter examples):
  - `turbo run lint --filter=@rawr/plugin-agent-sync`
  - `turbo run test --filter=@rawr/plugin-agent-sync`
- Unit tests live in `test/**/*.test.ts` and are wired in root `vitest.config.ts`.

## Security And Enablement
- Enablement is an explicit activation boundary:
  - `rawr plugins web enable <id>` runs security gating and persists state.
- Security model reference: `docs/SECURITY_MODEL.md`.
