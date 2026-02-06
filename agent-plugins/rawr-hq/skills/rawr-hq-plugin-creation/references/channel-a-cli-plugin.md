# Channel A: CLI Command Plugin

## Use when

Use Channel A when you want CLI command extensions managed by oclif plugin manager.

## Command surface

- Use `rawr plugins ...` only.

## Package skeleton

- `plugins/<dir>/package.json`
- `plugins/<dir>/tsconfig.json`
- `plugins/<dir>/src/commands/*.ts`
- `plugins/<dir>/test/*.test.ts`
- `plugins/<dir>/README.md`

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
