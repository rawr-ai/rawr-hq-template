# Lane Plan — Workstream-Runner Skill Improvements

This file enumerates the six Phase-1 lanes, their inputs, allowed edit surfaces, expected outputs, gates, and atomicity rules. It is the durable execution scaffold; the worker brief at execution time cites this file rather than copy-pasting it.

## Phase shape

Three phases: Phase 0 (Frame, this commit), Phase 1 (Execute, six lanes), Phase 2 (Review + DRA Finalize + Close).

## Lanes

| Lane | Rec | Files (allowed edit surface) | Depends on |
|---|---|---|---|
| L1 | #4 | `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (Step 1 expansion only) | none |
| L2 | #1 | `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (new Step 0 only) + `tools/workstream-plugin-pack/skills/workstream-runner/references/before-you-frame.md` (new) | L1 |
| L3 | #2 | `tools/workstream-plugin-pack/skills/workstream-runner/assets/decisions.md` (new) + `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (Asset Map row + new Quality Gate + Step 4 mention of decisions.md as sibling) | L2 |
| L4 | #3 | `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (new "DRA Finalize" step between current 7 and 8) + `tools/workstream-plugin-pack/skills/workstream-runner/references/closure.md` (reinforcement) | L3 |
| L5 | #5 | `tools/workstream-plugin-pack/skills/workstream-runner/references/coordination-patterns.md` (new) + `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (Reference Map row) | L4 |
| L6 | #6 | `tools/workstream-plugin-pack/skills/workstream-runner/references/records-and-packets.md` (sizing rubric expansion) | none — could parallelize with L5 |

Lanes are sequenced by SKILL.md write order so step renumbering is correct on first write. L5 and L6 are SKILL.md-conflict-free; if speed pressure surfaces, L6 can run in parallel with L5. Default: serial.

## Inputs (shared across lanes)

- Brief: `docs/projects/workstream-runner-skill-improvements/README.md`.
- Existing skill: `tools/workstream-plugin-pack/skills/workstream-runner/{SKILL.md, references/*, assets/*}` for voice match.
- Working references on branch `align-arch-spec-with-runtime-realization`:
  - `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/decisions.md` (shape model for Rec #2's `assets/decisions.md`).
  - `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/findings/wave-1-packet.md` (cross-phase state reference for Rec #5 Pattern A).
  - `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/findings/lane-1-1-patch.md` (lane-X-patch reference for Rec #5 Pattern B).
- This workstream's record + decisions.md.

## Forbidden scope (across all lanes)

- Restructuring the skill schema (existing section ordering, frontmatter, file naming).
- Adding files outside the brief's enumerated targets.
- Editing companion-steward agent briefs at `tools/workstream-plugin-pack/agents/`.
- Touching `~/.claude/plugins/local/plugins/habitat/` directly.
- Editing `workstream-review-loops/` beyond a one-line acknowledgment row in `references/review-lanes.md`, and only if Decision D-4 resolves to do so.
- Subject-matter changes to existing references / assets that are not enumerated in the lane (e.g., L4 may reinforce `closure.md` for Rec #3's DRA Finalize step but may not edit unrelated guidance).

## Atomicity rule

One commit per landed lane. Commit message format:

```
feat(workstream-runner): <short rec summary>

Apply Recommendation #<N> from the workstream-runner-skill-improvements brief
(docs/projects/workstream-runner-skill-improvements/README.md §3.<N>).

<one-paragraph what + why>
```

The DRA stages and commits, not the worker.

## Per-lane expected output

- **L1 (Rec #4):** Step 1 in `SKILL.md` reads "Ground the workstream" + bullet list of preflight categories (repo state, repo conventions, authority inputs, project-local quarantine/archive directories). Tool-agnostic phrasing (no `gt`, no `npm`, no `bun` by name; "stacking convention" not "Graphite"). One commit.
- **L2 (Rec #1):** new Step 0 in `SKILL.md` Default Workflow named "Before you frame." References `references/before-you-frame.md`. New `references/before-you-frame.md` covers the four meta-design passes (team design, perspective cycling, system design, information assessment) as mandatory, with the brittleness-guard verbatim from brief §3.1. One commit (single rec, two files).
- **L3 (Rec #2):** new `assets/decisions.md` template + new Asset Map row in `SKILL.md` + new Quality Gate ("Every borderline call has explicit rationale recorded in `decisions.md` or in a finding record") + Step 4 mention of `decisions.md` as a sibling artifact (not buried in the workstream record). Template shape models the prior workstream's decisions.md (question / options / chosen / rationale / downstream effect). One commit.
- **L4 (Rec #3):** new "DRA Finalize" step in `SKILL.md` Default Workflow inserted between current Step 7 (Review and repair) and current Step 8 (Close or hand off) — total step count grows from 8 to 10 (counting new Step 0). Reinforcement paragraph in `references/closure.md`: closure-steward catches what the DRA missed; DRA Finalize precedes the steward. One commit.
- **L5 (Rec #5):** new `references/coordination-patterns.md` with Pattern A (cross-phase state propagation via `decisions.md` live-state header + worker brief slot) and Pattern B (parallel-lane patches via `findings/lane-X-patch.md` BEFORE/AFTER blocks + DRA serialization). Cite working-reference paths verbatim. New Reference Map row in `SKILL.md`. One commit.
- **L6 (Rec #6):** expansion in `references/records-and-packets.md` adding the three-question rubric (delegation? multi-phase? ≥ 5 child artifacts?). Replaces the current binary "minimal-vs-full" implicit framing without renaming or restructuring the file. One commit.

## Per-lane self-check (leaf review)

Worker writes one paragraph in `findings/lane-LX-finding.md` per lane confirming:

- Voice matches existing skill (concise, imperative, opinionated-where-earned, tool-agnostic).
- No hedge language (`consider whether`, `you might want to`, `it may be useful to`).
- Rec scope honored (no scope creep into adjacent recs).
- Cross-references to other skill files use the `references/...` or `assets/...` path form already established.
- For Rec #1: brittleness-guard wording matches brief §3.1 verbatim.

## Phase-2 review lanes

Composed lanes (per `workstream-review-loops` Lane Menu, smallest covering set):

1. **`skill-authoring-quality` (custom).** Concern: voice consistency, conciseness, imperative phrasing, opinionated-where-earned tone, tool-agnostic phrasing. Evidence base: existing `SKILL.md` + `references/primitive-boundary.md` + `references/input-and-scratch-discipline.md` read first; then grade each rec's new content. Forbidden scope: subject correctness of recommendations, schema changes. Required output per rec: pass / warn / fail + specific quotes + suggested rephrase. Spawn via general-purpose Agent with tightly-scoped prompt. Output to `findings/composed-voice-review.md`.
2. **`closure-readiness`** via `habitat:workstream-closure-steward`. Output to `findings/composed-closure-steward.md`.

Skipped: `workstream-proof-ledger-auditor` (Decision D-3).

## DRA Finalize (Phase 2)

Before invoking `workstream-closure-steward`:

1. Stage and commit any pending edits (decisions register updates, finding records, deferred inventory if any).
2. Update record.md header (status → `closed`, current branch/commit pointer, dates).
3. Populate record.md §Outcome (Objective outcome + Residual gaps + verification results), §Review (final disposition for every finding).
4. Populate `next-packet.md` with the deployed-copy sync question and concrete data per Decision D-5.
5. Then invoke `workstream-closure-steward`.

This step dogfoods Recommendation #3 — the very ordering fix being added by L4. If the executing DRA forgets it, that itself is the highest-value evidence the rec lands correctly.

## Output contract

Files at closure:

- Edits in-place to:
  - `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md`.
  - `tools/workstream-plugin-pack/skills/workstream-runner/references/before-you-frame.md` (new).
  - `tools/workstream-plugin-pack/skills/workstream-runner/references/coordination-patterns.md` (new).
  - `tools/workstream-plugin-pack/skills/workstream-runner/references/closure.md` (edited).
  - `tools/workstream-plugin-pack/skills/workstream-runner/references/records-and-packets.md` (edited).
  - `tools/workstream-plugin-pack/skills/workstream-runner/assets/decisions.md` (new).
- Optional, per Decision D-4: light edit to `tools/workstream-plugin-pack/skills/workstream-review-loops/references/review-lanes.md`.
- Workstream artifacts at `docs/projects/workstream-runner-skill-improvements/workstreams/runner-skill-improvements/`:
  - `record.md` (this workstream's minimal record).
  - `decisions.md` (this workstream's dogfooded decisions register).
  - `lane-plan.md` (this file).
  - `findings/lane-L{1..6}-finding.md` (per-lane self-check).
  - `findings/composed-voice-review.md` (Phase 2 voice review).
  - `findings/composed-closure-steward.md` (Phase 2 closure-steward verdict).
  - `next-packet.md` (zero-context continuation, populated at closure).
- PR open against `docs/workstream-runner-skill-improvement-plan` (or `main` if user prefers; record in decisions.md before submission).

## Branch and stack

This workstream sits on branch `workstream-runner-skill-improvements`, stacked on parent `docs/workstream-runner-skill-improvement-plan`. All branch and stack operations use `gt` per `docs/process/GRAPHITE.md`.
