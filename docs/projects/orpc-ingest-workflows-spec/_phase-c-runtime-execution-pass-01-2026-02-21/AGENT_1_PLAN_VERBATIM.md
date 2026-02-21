# Agent 1 Plan (Verbatim)

## Source: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_C_EXECUTION_PACKET.md

### C1 - Cross-Instance Storage-Lock Redesign
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-platform-duty`
- Depends on: `C0`
- Implement:
  1. Make repo state writes collision-safe and deterministic under contention.
  2. Preserve existing caller contracts (`enablePlugin/disablePlugin/getRepoState`) unless additive-only changes are required.
  3. Preserve instance-local default authority and explicit-only global-owner fallback.
- Primary runtime paths:
  - `packages/state/src/repo-state.ts`
  - `packages/state/src/index.ts`
  - `packages/state/src/types.ts`
  - `packages/state/src/orpc/contract.ts` (schema stability assertions only)
  - `packages/hq/src/install/state.ts`
  - `packages/hq/test/install-state.test.ts`
  - `plugins/cli/plugins/test/install-state.test.ts`
- Acceptance:
  1. Concurrent writes do not corrupt `.rawr/state/state.json`.
  2. Default authority remains instance-local.
  3. Global-owner fallback remains explicit-only.

## Source: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_C_IMPLEMENTATION_SPEC.md

### 2.1 C1: State/Lock Interface Delta (Additive-first)
Planned additions:
1. Introduce internal atomic mutation seam:
   - `mutateRepoStateAtomically(repoRoot, mutator, options?)`
   - `RepoStateMutationOptions`
   - `RepoStateMutationResult`
2. Keep public caller entrypoints stable where possible:
   - `getRepoState(repoRoot)`
   - `enablePlugin(repoRoot, pluginId)`
   - `disablePlugin(repoRoot, pluginId)`

Constraints:
1. Preserve persisted `RepoState` schema unless a clearly justified additive evolution is required.
2. Preserve default instance-local authority semantics.
3. Keep global-owner fallback explicit-only.

### 3.1 C1 Implementation Units
1. Core lock and atomic mutation:
   - `packages/state/src/repo-state.ts`
   - `packages/state/src/types.ts`
   - `packages/state/src/index.ts`
   - `scripts/phase-c/verify-storage-lock-contract.mjs` (new)
2. Contract stability checks:
   - `packages/state/src/orpc/contract.ts`
3. Authority behavior regression guards:
   - `packages/hq/src/install/state.ts`
   - `packages/hq/test/install-state.test.ts`
   - `plugins/cli/plugins/test/install-state.test.ts`
4. New contention tests:
   - `packages/state/test/repo-state.concurrent.test.ts` (new)
   - `packages/coordination/test/storage-lock-cross-instance.test.ts` (new)
   - `apps/server/test/storage-lock-route-guard.test.ts` (new)
