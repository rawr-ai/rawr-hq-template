# Stack Drain Research Consolidation

Status: draft preservation bundle copied onto `codex/hyperresearch-codex-parity` before stack drain.

This directory consolidates the research conclusions and core inputs that were previously split across temporary research worktrees and the Hyperresearch/Inngest proof branch. It is a review surface, not canonical architecture authority and not Runtime Realization Lab proof authority.

## How To Read

| Area | Start Here | What It Is For |
|---|---|---|
| Spec landscape | `rawr-spec-landscape/final_report_rawr-spec-landscape.md` | Closed-corpus scan of RAWR specs, missing seams, and P0/P1/P2 spec follow-ups. |
| Architecture/runtime alignment | `runtime-canon-arch-align/final_report_runtime-canon-arch-align.md` | Specific alignment gaps between canonical architecture and runtime realization specs. |
| Hyperresearch/Inngest proof | `hyperresearch-inngest-proof/repaired-proof/final-report.md` | Inngest/plugin-runtime conclusions produced by the Codex Hyperresearch proof run. |
| Draft drain plan | `DRAFT_STACK_DRAIN_PLAN.md` | Current DRA recommendation for preservation, cleanup, and stack drain order. |

## Contents Map

- `rawr-spec-landscape/`
  - Final report, original query, comparisons, source-analysis notes, locus reports, and compact audit files.
  - Use as research input for Phase Four and future spec work.
- `runtime-canon-arch-align/`
  - Final report, original query, comparisons, architecture/runtime source notes, depth investigations, vendor verification notes, and compact audit files.
  - Use to decide architecture-spec updates without moving runtime mechanics into architecture authority.
- `hyperresearch-inngest-proof/`
  - Repaired proof summary, source captures, claim trace, final validation output, official-doc source notes, blocked-proof summary, and parity-boundary notes.
  - Use to extract Inngest workflow-contract lessons into Phase Four planning without treating the Hyperresearch proof branch as runtime architecture authority.

## Deliberately Excluded

The consolidation does not copy local tool state or broad generated scratch:

- `.claude/skills/**`
- `.hyperresearch/**`
- `CLAUDE.md`
- draft A/B/C files
- temporary patch/polish/readability logs
- full database state
- raw command ledgers except for the final validation stdout needed to trace the accepted Inngest proof

Keep the source worktrees until this bundle is reviewed and committed. After that, the `research/*` worktrees and branches can be removed deliberately.
