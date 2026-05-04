# Workstream-Runner Skill Improvements

Status: `active-draft`.
Branch: `workstream-runner-skill-improvements` (stacked on `docs/workstream-runner-skill-improvement-plan`).
DRA: Claude Opus 4.7 (1M context).
Dates: 2026-05-04 -> active.

This minimal record preserves state and handoff context for the bounded workstream that lands the six recommendations from `docs/projects/workstream-runner-skill-improvements/README.md` in-place against `tools/workstream-plugin-pack/skills/workstream-runner/`. It is not the purpose of the workstream.

Sizing: minimal record per the very rubric introduced by Recommendation #6 (single execution phase, ≤ 8 child artifacts, single-worker serial — no full record needed). Decisions and findings live in sibling files; this record is the spine.

## Workstream State

Phase: 0 -> 1 (next).

Selected skills: `habitat:workstream-runner`, `habitat:workstream-review-loops`, `cognition:team-design`, `cognition:perspective`, `cognition:system-design`, `cognition:information-design`.

Selected agents: `habitat:workstream-opening-steward` (Phase 0, complete), `habitat:workstream-closure-steward` (Phase 2). Skipped: `habitat:workstream-proof-ledger-auditor` per decisions D-3.

Selected hooks: none.

## Frame

Objective: land the six recommendations from the brief in-place against the workstream-runner skill, voice-matched and voice-reviewed, producing the canonical workstream artifacts (record + decisions.md + findings/) and a PR ready for user review.

Done means:

- All six recommendations landed at `tools/workstream-plugin-pack/skills/workstream-runner/`.
- ~6 atomic Phase-1 commits + finalize/repair commits on this branch.
- Workstream record + dogfooded `decisions.md` + per-rec findings produced under `docs/projects/workstream-runner-skill-improvements/workstreams/runner-skill-improvements/`.
- Skill-authoring-quality voice review pass with zero unrepaired P1 findings.
- `habitat:workstream-closure-steward` returns pass or warn.
- PR open against the parent branch.
- Next Packet answers the deployed-copy sync question or escalates with concrete data.

Authority inputs:

- `docs/projects/workstream-runner-skill-improvements/README.md` — handoff brief, full authority over scope.
- `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` and existing references — authority over voice/conventions for new content.
- `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/{decisions.md,findings/wave-1-packet.md,findings/lane-1-1-patch.md}` on branch `align-arch-spec-with-runtime-realization` — pattern evidence only, not authority over voice.

Authority order on conflict: brief (`README.md`) > existing skill files (voice/conventions in `SKILL.md` and current references) > pattern-evidence references on `align-arch-spec-with-runtime-realization`. Conflicts resolved by editing the brief first per brief §7, not by reinterpreting the workstream.

Stale / excluded inputs (read-only fenced):

- The cross-branch pattern-evidence references on `align-arch-spec-with-runtime-realization` are pattern evidence only, not authority over voice.
- The deployed plugin copy at `~/.claude/plugins/local/plugins/habitat/` is out-of-scope per Non-goals; sync question dispositioned to Next Packet per decisions D-5.
- Prior session transcript that produced the brief is non-authority; the brief itself supersedes it per brief §7.

Non-goals:

- Restructuring the skill schema.
- Adding `fleet-patterns.md` / `preflight-checklist.md` / `worker-brief-templates.md` (per brief §4).
- Editing companion-steward agent briefs.
- Touching the deployed `~/.claude/plugins/local/plugins/habitat/` copy directly.
- Expanding `workstream-review-loops/` beyond acknowledgment of the new lane pattern.

Stop/escalation conditions:

- Any meta-design pass surfaces a question the brief does not answer → escalate to user before framing.
- Skill-authoring-quality reviewer raises P1 voice findings on more than two of six recs → pause and reconsider whether the brief itself needs refactoring (per brief §5.5).
- Editing `workstream-review-loops/` would exceed light edits → escalate.
- The deployed-copy sync question turns out to require code changes → defer to its own workstream.

## Work

Plan: see `lane-plan.md`.

Outputs: edits in-place to the six target files plus this workstream's artifacts. Full output contract in `lane-plan.md` §Output Contract.

Evidence: per-lane finding records under `findings/`. Voice review under `findings/composed-voice-review.md`. Closure steward under `findings/composed-closure-steward.md`.

Review findings and disposition: see `findings/` and §Review.

Verification:

- Diff per commit matches one rec scope.
- Voice grep against hedge phrases.
- Brittleness-guard verbatim check in `before-you-frame.md`.
- Reference Map / Asset Map / Quality Gate integrity in `SKILL.md`.
- Workflow numbering integrity across `SKILL.md` and references.
- `habitat:workstream-opening-steward` and `habitat:workstream-closure-steward` return pass or warn.

## Outcome

Objective outcome: pending.

Residual objective gaps: pending.

Deferred items: see `deferred.md` if populated; currently none anticipated beyond the sync sub-question.

## Review

Composed lanes (per `workstream-review-loops` Lane Menu):

- `skill-authoring-quality` (custom): voice consistency, conciseness, imperative phrasing, opinionated-where-earned tone, tool-agnostic phrasing.
- `closure-readiness` via `habitat:workstream-closure-steward`.

Skipped:

- `workstream-proof-ledger-auditor` — see decisions.md D-3.

Per-lane leaf reviews are inline in each `findings/lane-LX-finding.md`.

## Next Packet

See `next-packet.md` (populated at closure).
