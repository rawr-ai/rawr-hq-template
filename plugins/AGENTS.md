# Plugins (workspace packages)

## TOC
- [Scope](#scope)
- [Plugin Ids](#plugin-ids)
- [Manifest Conventions](#manifest-conventions)
- [Build And Test](#build-and-test)
- [Security And Enablement](#security-and-enablement)

## Scope
- Applies to everything under `plugins/**`.
- Each `plugins/<dir>` is a workspace package (see root `package.json#workspaces`).

## Plugin Ids
- A plugin’s id is either:
  - `package.json#name` (preferred), or
  - the directory name under `plugins/` (fallback).
- CLI accepts either form: `rawr plugins enable <id>` (“directory name or package name”).

## Manifest Conventions
- Always include a `package.json` at the plugin root.
- If the plugin provides **oclif commands**, declare the oclif manifest in `package.json#oclif`:
  - `commands`: built output (match whatever `tsc` emits; commonly `./dist/src/commands`)
  - `typescript.commands`: source commands (typically `./src/commands`)
- TypeScript convention: compile to `dist/**` (Turbo expects `dist/**` outputs).

## Build And Test
- Workspace-wide:
  - `bun run build`
  - `bun run test`
- Plugin-only (Turbo filter examples):
  - `turbo run build --filter=@rawr/plugin-hello`
  - `turbo run test --filter=@rawr/plugin-hello`
- Unit tests live in `test/**/*.test.ts` and are wired in root `vitest.config.ts`.

## Security And Enablement
- Enablement is an explicit activation boundary:
  - `rawr plugins enable <id>` runs security gating and persists state.
- Security model reference: `docs/SECURITY_MODEL.md`.
