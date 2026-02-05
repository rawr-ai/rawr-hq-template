# `@rawr/plugin-session-tools`

Session listing/search/extraction commands for the RAWR CLI.

## Local dev

- Link the plugin:
  - From repo root (runs with cwd = `apps/cli`): `bun run rawr plugins link ../../plugins/session-tools`
  - Or explicitly: `cd apps/cli && bun src/index.ts plugins link ../../plugins/session-tools`
- Run commands:
  - `bun run rawr sessions list --table`
  - `bun run rawr sessions resolve <id>`
  - `bun run rawr sessions search --query-metadata oclif`
  - `bun run rawr sessions extract <id> --format markdown`
