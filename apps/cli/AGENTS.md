# CLI Router (`@rawr/cli`)

## Scope

- Applies to `apps/cli/**`.

## Entry Points

- Runtime bootstrap and journaling boundary: `src/index.ts`.
- Command tree root: `src/commands/`.
- Shared command helpers: `src/lib/`.

## Command Topology

- General commands: `src/commands/{doctor,reflect,...}.ts`
- Topic commands: `src/commands/<topic>/*.ts`
- Workspace plugin management: `plugins/cli/plugins/src/commands/plugins/web/*.ts`

## Command Surface Invariant

- Use `rawr plugins web ...` for workspace runtime plugins.
- Reserve `rawr plugins ...` for external CLI plugin channel guidance.

## Routing

- `../../packages/core/AGENTS.md` for `RawrCommand` contract.
- `../../packages/journal/AGENTS.md` for journal persistence/indexing.
- `../../packages/security/AGENTS.md` for security gate/check surfaces.
- `../../packages/state/AGENTS.md` for repo state persistence.
- `../../docs/process/HQ_USAGE.md` for operator-facing command usage.
