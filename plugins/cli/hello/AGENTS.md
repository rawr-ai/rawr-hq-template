# @rawr/plugin-hello

## TOC
- [Scope](#scope)
- [What This Plugin Is](#what-this-plugin-is)
- [Manifest](#manifest)
- [Build And Test](#build-and-test)
- [Layout](#layout)

## Scope
- Applies to `plugins/cli/hello/**`.

## What This Plugin Is
- Minimal **oclif plugin** example.
- Provides an oclif command at `src/commands/hello.ts`.

## Manifest
- Declared via `package.json#oclif`:
  - Source commands: `./src/commands`
- Note: `tsc` currently emits commands to `dist/src/commands/**` (path-preserving).
  - If/when this plugin is loaded via oclif’s plugin loader, align `package.json#oclif.commands` with the emitted directory.
- Keep command files as default exports extending `@oclif/core` `Command`.

## Build And Test
- From repo root:
  - `bunx nx run @rawr/plugin-hello:build`
  - `bunx nx run @rawr/plugin-hello:test`
- From this package:
  - `bun run build`
  - `bun run test`

## Layout
- `src/commands/**`: oclif commands (TypeScript source)
- `test/**`: Vitest tests
- `dist/**`: compiled output (checked by Nx build flows + ignored by tests)
