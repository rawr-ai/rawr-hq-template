# Verification Sweep Plan (schema-helper rewrite)

Date: 2026-02-17
Worktree: /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal

## Goals

1. Confirm no regressions back to split `InputSchema`/`OutputSchema` naming where unified schema-helper conventions should apply.
2. Confirm policy/checklist text matches current examples (including inline-IO guidance).
3. Confirm no TypeBox->Zod drift in docs, examples, or implementation guidance where TypeBox-only is the intended stance.

## Execution Order

1. Discover relevant docs/code locations for schema-helper, policies, examples, and checklists.
2. Run targeted searches for:
   - `InputSchema` and `OutputSchema`
   - inline-IO rule wording (`inline`, `io`, `input/output`, `I/O`)
   - `TypeBox` and `Zod` mentions
3. Validate each hit for intended/allowed usage vs drift/regression.
4. Apply smallest possible edits to align policy/example/checklist text and examples.
5. Re-run search checks and summarize evidence.
6. Commit only if edits are made.

## Acceptance Criteria

1. No unintended split-schema guidance remains in active policy/example/checklist paths.
2. Inline-IO rule text is consistent across policy + examples.
3. TypeBox-only guidance is consistent and no accidental Zod references remain in affected surfaces.
4. Repo state is clean after commit (or unchanged if no fixes were needed).
