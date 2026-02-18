# SESSION_019c587a — Agent Z Consistency Plan

## Objective
Run a strict consistency normalization pass across `E2E_01..E2E_04` for the locked conventions only, without re-architecting walkthrough intent.

## Locked Conventions (Scope-Locked)
1. `context.ts` placement for shared context contracts.
2. TypeBox-first artifacts with static types co-located in the same file.
3. `typeBoxStandardSchema as std` alias usage in snippets.
4. Concise capability naming (`invoicing`) and non-redundant domain filenames.
5. Split semantics clarity (`/api/workflows/*` vs `/api/inngest`).
6. Procedure input/output schemas live alongside procedures or boundary contracts, not in domain modules.
7. Domain modules hold domain concepts only (no route/procedure I/O ownership).
8. Request metadata typing belongs to context layer unless it is truly domain-native.

## Non-Goals
1. No architecture redesign.
2. No contract-model reshaping beyond convention alignment.
3. No edits outside owned files.
4. No commit.

## Execution Checklist
- [x] Validate branch/worktree and confirm unrelated edits will be ignored.
- [x] Inspect `E2E_01..E2E_04` for convention drift points.
- [x] Normalize `E2E_01` for split-path clarity and concise capability naming consistency.
- [x] Normalize `E2E_02` for concise capability naming consistency across package/API/workflow snippets.
- [x] Normalize `E2E_03` for explicit package `context.ts` placement and checklist alignment.
- [x] Normalize `E2E_04` for procedure/boundary I/O ownership and context-layer request metadata placement.
- [x] Relocate procedure/boundary I/O schemas out of `domain/*` in walkthroughs that violated the updated canonical rule.
- [x] Keep request metadata ownership explicit in `context.ts` snippets where request metadata appears.
- [x] Record unresolved contradictions that cannot be fixed locally in scratchpad escalations.
- [x] Verify final diffs are limited to owned files.

## Completion Criteria
1. All four E2E docs are convention-consistent on the locked axes.
2. Unique intent of each walkthrough remains intact.
3. Escalations are explicit for any unresolved contradictions beyond local doc edits.
