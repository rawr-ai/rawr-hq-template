# Channel A: CLI Command Plugin

## Use when

Use Channel A when you want CLI command extensions managed by oclif plugin manager.

## Command surface

- Use `rawr plugins ...` only.

## Package skeleton

- `plugins/cli/<dir>/package.json`
- `plugins/cli/<dir>/tsconfig.json`
- `plugins/cli/<dir>/src/commands/*.ts`
- `plugins/cli/<dir>/test/*.test.ts`
- `plugins/cli/<dir>/README.md`

## Required manifest contracts

`package.json#oclif` must include:
- `commands` -> built output (commonly `./dist/src/commands`)
- `typescript.commands` -> source commands (`./src/commands`)

## Build and wire

1. Build plugin package.
2. Link plugin: `rawr plugins link <absolute-path> --install`.
3. Inspect discovery: `rawr plugins inspect <plugin-id> --json`.
4. Execute command and verify expected behavior.

## Typical failure modes

- Linked plugin not showing commands due to wrong oclif paths.
- Install using plain filesystem path instead of `file://` where install path requires URI.
