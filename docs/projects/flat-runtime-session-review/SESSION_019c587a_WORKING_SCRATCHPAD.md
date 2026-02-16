# Session 019c587a Working Scratchpad

## Purpose
Live working notes, references, and synthesis checkpoints while constructing:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`

## Branch + Worktree
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- Graphite branch: `codex/session-019c587a-arch-reconstruction`

## Source Lock
- Transcript: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md`
- Canonical latest proposal set: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/...`
- Today codebase set: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/{apps/server,packages/core/docs}`

## Active Notes
- Duplicate user prompts are frequent; dedupe by exact text before tension categorization.
- Proposal-vs-primary divergence is real for `AXIS_03_END_TO_END_EXAMPLES.md` (different file length + hash).
- Primary codebase today still has no `rawr.hq.ts`, and runtime surfaces are currently split as `plugins/cli`, `plugins/web`, `plugins/agents`.

## Evidence Snippets To Reuse
- Transcript question index extraction with Q01..Q84 and line anchors.
- Proposal anchors for `rawr.hq.ts`, `RawrHqManifest`, metadata minimization, and deferred decisions.
- Current-state anchors from `apps/server/src/rawr.ts`, `apps/server/src/orpc.ts`, `apps/server/src/plugins.ts`, `docs/SYSTEM.md`, `docs/system/PLUGINS.md`.

## Open Synthesis Items
- Build a clean phase timeline that explains proposal evolution without over-indexing on duplicate turns.
- Convert proposal-vs-current mismatch into Add/Change/Remove/Reshuffle matrix.
- Add critical pass: keep/remove/missing/simplify recommendations with concrete impact.
- Produce explicit standalone direction verdict + trade-off table.

## Progress Notes (Current)
- Confirmed transcript prompt blocks: `total=84`, `unique=42`, `duplicates=42`.
- Strong pivot markers in transcript:
  - Steward decision line: `914`.
  - Locked model marker: `2559`.
  - Committed structure marker: `3852`.
  - Spec-packet plan marker: `4176`.
  - Packet rewrite acknowledgement: `4831`.
- Proposal-vs-current mismatch anchors collected with line references from:
  - `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`
  - `docs/system/spec-packet/*`
  - `apps/server/src/*`
  - `docs/SYSTEM.md`
  - `docs/system/PLUGINS.md`
  - `packages/hq/src/workspace/plugins.ts`
  - `plugins/cli/plugins/src/lib/workspace-plugins.ts`

## Critical divergence anchor
- `AXIS_03_END_TO_END_EXAMPLES.md` primary vs proposal worktree diverge materially:
  - Primary: 418 lines, sha `bf91d437...`
  - Proposal worktree: 721 lines, sha `2a1f9963...`

## Delivery Checkpoint
- Final reconstruction doc authored:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`
- Includes required sections:
  - Source lock
  - Question lineage/tension map
  - Assistant evolution map
  - Latest-proposal decode
  - Landed-vs-today diff matrix
  - Critical pass (remove/missing/legacy/simplify)
  - Complexity/churn/scope estimates + dependency ordering
  - Standalone direction verdict + trade-offs
  - Acceptance/rejection criteria
  - Evidence index + explicit unknowns
