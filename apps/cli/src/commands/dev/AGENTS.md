# `rawr dev …`

- Dev-stack helpers (currently: `rawr dev up`).
- `dev up` spawns `bun run dev` in the workspace root (server + web via Turborepo).
- Supports `--json`/`--dry-run` (prints the underlying command instead of running it).

## Next
- `up.ts` — starts `bun run dev`
- `../../lib/workspace-plugins.ts` — workspace root detection

