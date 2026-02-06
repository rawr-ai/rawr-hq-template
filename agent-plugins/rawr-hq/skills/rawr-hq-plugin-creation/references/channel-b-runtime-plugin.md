# Channel B: Workspace Runtime Plugin

## Use when

Use Channel B when capability should run as workspace runtime behavior (server/web) without oclif plugin-manager wiring.

## Command surface

- Use `rawr hq plugins ...` only.

## Package skeleton

- `plugins/<dir>/package.json`
- `plugins/<dir>/tsconfig.json`
- `plugins/<dir>/src/server.ts` and/or `plugins/<dir>/src/web.ts`
- `plugins/<dir>/test/*.test.ts`
- `plugins/<dir>/README.md`

## Required manifest contracts

`package.json#exports` should include stable runtime entrypoints:
- `./server` -> compiled server module
- `./web` -> compiled web module

`package.json#rawr` metadata should reflect intended role/channel posture.

## Build and activate

1. Build plugin package.
2. Discover plugin ids: `rawr hq plugins list --json`.
3. Enable plugin: `rawr hq plugins enable <id> --risk <policy>`.
4. Verify state: `rawr hq plugins status --json`.

## Runtime behavior

- Enabled set persists in `.rawr/state/state.json`.
- Server/web mounting consumes enabled set.
