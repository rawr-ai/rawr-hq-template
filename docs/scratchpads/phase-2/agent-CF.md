# Agent CF scratchpad — Command Factory

## Ownership
- `apps/cli/src/commands/factory/**`
- `apps/cli/test/factory-*.test.ts` (or similar)

## Notes / decisions

- Factory commands are dry-run friendly and convention-preserving:
  - `rawr factory command new <topic> <name> --description "..."` creates command + test (optionally updates `tools export`).
  - `rawr factory workflow new <name> --description "..."` creates workflow stub + test + snippet emission scaffold.
  - `rawr factory plugin new <dirName> --kind server|web|both` creates a workspace plugin skeleton under `plugins/`.
- Factory mutates the repo; higher-level workflows (`workflow forge-command`) require `--yes` before executing.
