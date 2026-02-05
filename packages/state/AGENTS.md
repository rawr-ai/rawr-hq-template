# `@rawr/state`

- Repo-local state persistence under `.rawr/state/state.json` (currently: enabled plugins + timestamps).
- Treat `.rawr/` as disposable local state; code must handle missing/corrupt state defensively.
- Consumed by both CLI and server to agree on “enabled plugins”.

## Next
- `src/index.ts` — public exports
- `src/repo-state.ts` — load/save + enable/disable helpers
- `src/types.ts` — state types
- `../../apps/cli/src/commands/plugins/AGENTS.md` — enable/disable UX
- `../../apps/server/AGENTS.md` — server consumes enabled-plugin ids

