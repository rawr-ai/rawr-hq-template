# Agent Q1 Refactor Review (Targeted)

Date: 2026-02-21
Branch: `codex/phase-a-a7-review-closure`
Scope: targeted review-only pass for:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts`

## Summary
- Structural intent is correct: the delta closes the RPC caller-surface test drift and collapses duplicated CLI workspace/install logic into package-owned shared modules.
- Targeted verification run is green:
  - `apps/server/test/orpc-handlers.test.ts`
  - `plugins/cli/plugins/test/workspace-plugins-discovery.test.ts`
  - `plugins/cli/plugins/test/install-state.test.ts`
- No blocking/high defects found.

## Findings (Severity-Ranked)

### 1. Medium: `workspace-plugins` shim now exports low-level parser surface, widening API seam unnecessarily
- Evidence:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts:11`
- Why this matters:
  - The refactor goal is consolidation behind shared package-owned contracts. Exporting `parseWorkspacePluginManifest` from the CLI shim broadens the CLI-local API and increases the chance future callsites parse manifests directly from CLI layer rather than staying on higher-level discovery APIs.
- Recommendation:
  - Prefer keeping this shim’s public surface to `findWorkspaceRoot`, `listWorkspacePlugins`, `filterPluginsByKind`, and `resolvePluginId` only, unless there is a current consumer requiring parser export.

### 2. Low: no explicit anti-regression guard for `install-state` shim centralization
- Evidence:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts:1`
- Why this matters:
  - This file is now a clean pass-through, which is correct. But unlike workspace parser centralization, there is no explicit static assertion that protects against re-introducing duplicated install-state logic in CLI layer.
- Recommendation:
  - Add a small static test/guard that asserts this file continues sourcing from `@rawr/hq/install` (same pattern used for shared parser boundary checks).

### 3. Low: test-only RPC caller fixture is duplicated across server test files
- Evidence:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts:8`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts:15`
- Why this matters:
  - The fix is correct, but policy constants duplicated in tests can drift again if caller-surface contract evolves.
- Recommendation:
  - Optional: extract a shared `FIRST_PARTY_RPC_HEADERS` test helper.

## Disposition
`approve_with_changes`

Rationale:
- No blocking/high issues.
- Refactor direction is structurally aligned with spec posture (shared package ownership, reduced duplicated logic, corrected caller-surface RPC expectations).
- The medium/low items are near-term drift hardening opportunities, not release blockers.
