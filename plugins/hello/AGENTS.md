# `@rawr/plugin-hello`

- Minimal oclif plugin example (one command: `hello`).
- Source command: `src/commands/hello.ts` (default export extends `@oclif/core` `Command`).
- Build output is path-preserving; ensure `package.json#oclif.commands` matches emitted `dist/**` layout if/when loaded by an oclif plugin loader.

## Next
- `src/commands/hello.ts` — the command implementation
- `package.json` — oclif manifest (`oclif.typescript.commands`, `oclif.commands`)
- `test/` — plugin tests (`vitest --project plugin-hello`)
- `../AGENTS.md` — workspace plugin conventions + enablement boundary
