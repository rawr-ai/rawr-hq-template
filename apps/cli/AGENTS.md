# CLI Router (`@rawr/cli`)

## Scope

- Applies to `apps/cli/**`.

## Entry Points

- Installed controller bootstrap and dispatch boundary: `src/index.ts`.
- Command tree root: `src/commands/`.
- Shared command helpers: `src/lib/`.

## Command Topology

- General commands: `src/commands/{doctor,reflect,...}.ts`
- Topic commands: `src/commands/<topic>/*.ts`
- External extension projections: `src/commands/plugins/**`
- Curated agent-plugin lifecycle projections: `src/commands/agent/plugins/**`

## Command Surface Invariant

- `rawr plugins ...` manages external Oclif extensions only.
- `rawr agent plugins ...` manages curated agent-plugin lifecycle only.
- App composition does not install, release, reconcile, or repair either channel.
- Production/operational proof uses a materialized installed controller, not the
  source entrypoint.

## Routing

- `../../packages/core/AGENTS.md` for `RawrCommand` contract.
- `../../packages/journal/AGENTS.md` for journal persistence/indexing.
- `../../packages/security/AGENTS.md` for security gate/check surfaces.
- `../../services/state/AGENTS.md` for repo state persistence.
- `../../docs/process/HQ_USAGE.md` for operator-facing command usage.
