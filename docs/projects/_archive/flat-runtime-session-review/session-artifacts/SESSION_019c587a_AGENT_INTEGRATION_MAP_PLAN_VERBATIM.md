# SESSION_019c587a — Agent 2 Integration Map Plan (Verbatim)

## Mission
Produce an analysis-only alignment map from the original flat-runtime packet/proposal lineage to the authoritative ORPC/Inngest packet, with explicit disposition per section.

## Locked Constraints
1. Analysis-only. No edits/moves/renames/deletes to canonical docs.
2. Only three new artifacts may be created:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_INTEGRATION_MAP_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_INTEGRATION_MAP_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORIGINAL_TO_ORPC_INGEST_ALIGNMENT_MATRIX.md`
3. Worktree/branch lock:
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
- Branch: `codex/pure-package-e2e-convergence-orchestration`
4. Overlap rule: authoritative ORPC/Inngest packet wins on overlap.
5. Preserve unique non-overlapping original concerns as `keep-unique`.

## Skill-Constrained Workflow
- Graphite workflow reference:
`/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
- Git worktree workflow reference:
`/Users/mateicanavra/.codex-rawr/skills/git-worktrees/SKILL.md`

## Method
1. Build section inventory from original lineage docs and authoritative packet docs.
2. Classify each original section into one disposition:
- `keep-unique`
- `replace`
- `merge-align`
- `retire`
3. Require explicit latest anchors for all `Y` overlap rows.
4. Require explicit downstream dependency and confidence for every row.
5. Validate quality gates before completion.

## Required Matrix Columns
| Column |
| --- |
| Original Source Path + Section |
| Concern/Axis |
| Latest Authoritative Coverage? (Y/N) |
| Latest Source Anchor(s) |
| Disposition (keep-unique\|replace\|merge-align\|retire) |
| Why |
| Required Change for Original Packet |
| Downstream Dependency |
| Confidence |

## Quality Gates
1. Every section in original `DECISIONS` and all original spec-packet axis docs is mapped.
2. No unclassified rows.
3. Final rollups are present for:
- `keep-unique`
- `replace`
- `merge-align`
- `retire`
4. Final output remains analysis-only.

## Output Contract
Primary deliverable:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORIGINAL_TO_ORPC_INGEST_ALIGNMENT_MATRIX.md`

Supporting artifacts:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_INTEGRATION_MAP_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_INTEGRATION_MAP_SCRATCHPAD.md`
