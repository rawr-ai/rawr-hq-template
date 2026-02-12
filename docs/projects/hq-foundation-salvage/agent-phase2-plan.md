# Agent Phase 2 Plan

## Scope
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-hq-foundation-salvage-template`
- Branch: `codex/hq-template-promotion-phase2-full-hq-port`
- Objective: promote full template-managed HQ/plugin domain and keep command-surface normalization (`rawr plugins ...` and `rawr plugins web ...` only).

## File-Level Promotion Matrix

| Path / Domain | Action | Slice | Decision | Notes |
|---|---|---|---|---|
| `scripts/githooks/template-managed-paths.txt` | Narrow/expand manifest according to ownership | A | Done | Replaced `packages/**` with explicit shared packages; excluded `packages/dev/**`; promoted full `plugins/agents/hq/**` |
| `AGENTS_SPLIT.md` | Update ownership policy contract | A | Done | Full template ownership for `plugins/agents/hq/**`; explicit template package list; `packages/dev/**` remains personal-owned |
| `docs/process/CROSS_REPO_WORKFLOWS.md` | Align cross-repo workflow ownership and command surface | A | Done | HQ/plugin-management ownership now references full `plugins/agents/hq/**` + `plugins/cli/plugins/**` + explicit package list |
| `docs/system/PLUGINS.md` | Align plugin architecture/ownership and command surface | A | Done | Ownership summary now matches full HQ domain promotion and `packages/dev/**` personal ownership |
| `docs/process/*` (related consistency docs) | Patch only if directly needed | A/C | In progress | No additional direct edits required yet |
| `plugins/agents/hq/**` | Full promotion + reconcile with template conventions | B | In progress | Will sync full tree from personal repo and ensure command-surface normalization |
| `plugins/cli/plugins/**` | Additive, non-regressive template-owned deltas | C | Pending | Port personal deltas while preserving target-only non-regressive command surfaces |
| `packages/dev/**` | Preserve personal ownership | A | Locked | Enforced through explicit manifest narrowing and docs contract |

## Execution Plan
1. Baseline audit of current target files and command-surface wording.
2. Slice A: manifest narrowing + ownership docs contract.
3. Slice B: full `plugins/agents/hq/**` promotion/reconciliation.
4. Slice C: `plugins/cli/plugins/**` additive deltas + tests/docs alignment.
5. Verification suite (install, typecheck, vitest, grep gates).
6. Report: file summary by slice, SHAs/messages, outputs, blockers.

## Constraints
- Ignore unrelated edits from others; do not modify/revert them.
- Never introduce legacy `rawr hq plugins ...` text.
- Use Graphite commit flow for each slice.
