# Scratchpad — Agent B (CLI)

## Scope

- `apps/cli/**`
- `packages/core/**`

## Notes / decisions

- Introduced a `RawrCommand` base in `@rawr/core` with shared flags (`--json`, `--dry-run`, `--yes`) and a structured result shape.
- Added CLI stubs: `tools export`, `plugins list/enable`, `security check/report`.
- Security integration is intentionally thin; it calls into `@rawr/security` and does not persist enablement state yet.

## Open items

- Persist enablement decisions + overrides under `.rawr/security/` (owned by security slice).
- Expand `tools export` to a real command catalog (later).

