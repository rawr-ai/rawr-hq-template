# SESSION_019c587a — Agent 1 Archive Sweep Plan (Verbatim)

## Assignment
Perform an analysis-only documentation archive sweep for `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal` with primary scope on `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system` and supplemental context from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects`.

## Hard Constraints Applied
1. Analysis-only: do not move/delete/rename/edit canonical docs content.
2. Create only:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_ARCHIVE_SWEEP_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_ARCHIVE_SWEEP_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_DOCS_ARCHIVE_SWEEP_MATRIX.md`
3. Use absolute paths in references.
4. Stay on `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal` branch `codex/pure-package-e2e-convergence-orchestration`.
5. Follow Graphite + git-worktrees conventions from:
- `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/git-worktrees/SKILL.md`

## Method
1. Validate worktree path, branch, and clean status in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`.
2. Enumerate every file under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system` (must be 100% covered in matrix rows).
3. Capture staleness signals per file:
- filesystem mtime
- explicit context flags in file content (for example: proposal/history/locked baseline language)
4. Read canonical-entry docs for current architecture framing:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/DOCS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/SYSTEM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/PLUGINS.md`
5. Read supplemental session context in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review` to determine canonical-source collisions and supersession signals.
6. Build a classification matrix with required columns:
- `Path`
- `Current Role`
- `Canonical Now? (Y/N)`
- `Session Relevance (High/Medium/Low/None)`
- `Staleness Signal (mtime/context)`
- `Conflict Type (none|duplicate|superseded|policy-violating)`
- `Recommended Action (keep|move-to-project|move-to-project-archive|deprecate-note)`
- `Target Path`
- `Reason`
- `Risk if moved`
- `Dependencies / blockers`
7. Apply policy target in recommendations:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system` should retain only canonical-as-of-now system docs.
- Proposal/spec/history artifacts are move candidates unless explicitly canonical.
- Archive recommendations use `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/<project-name>/...`.
8. Add rollups in matrix footer:
- safe-to-move-now
- needs-merge-first
- must-remain-canonical

## Quality Gates
1. Every file currently under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system` appears exactly once in the matrix.
2. No row has unclassified fields.
3. Recommended actions are policy-consistent and path-complete.
4. No commits.
