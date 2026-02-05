# Agent SE scratchpad — State Enablement

## Ownership
- `packages/state/**`
- `apps/cli/src/commands/plugins/**` (enable persistence + disable/status)
- `apps/server/**` state endpoint + enabled plugin mounting filter

## Notes / decisions

- Implemented repo-local state at `.rawr/state/state.json` (gitignored) via `packages/state`.
- CLI persists enablement on `rawr plugins enable <id>` after security gate passes.
- Added `rawr plugins disable <id>` and `rawr plugins status --json` for persistent visibility.
- Server reads enabled plugin ids, mounts enabled-only, and exposes `GET /rawr/state`.
