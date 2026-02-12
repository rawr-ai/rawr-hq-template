# Channel B: Workspace Runtime Plugin

## Use when

Use Channel B when capability should run as workspace runtime behavior (server/web) without oclif plugin-manager wiring.

## Command surface

- Use `rawr plugins web ...` only.

## Package skeleton

- `plugins/web/<dir>/package.json`
- `plugins/web/<dir>/tsconfig.json`
- `plugins/web/<dir>/src/server.ts` and/or `plugins/web/<dir>/src/web.ts`
- `plugins/web/<dir>/test/*.test.ts`
- `plugins/web/<dir>/README.md`

## Required manifest contracts

`package.json#exports` should include stable runtime entrypoints:
- `./server` -> compiled server module
- `./web` -> compiled web module

`package.json#rawr` metadata should reflect intended role/channel posture.

## Build and activate

1. Build plugin package.
2. Discover plugin ids: `rawr plugins web list --json`.
3. Enable plugin: `rawr plugins web enable <id> --risk <policy>`.
4. Verify state: `rawr plugins web status --json`.

## Runtime behavior

- Enabled set persists in `.rawr/state/state.json`.
- Server/web mounting consumes enabled set.
