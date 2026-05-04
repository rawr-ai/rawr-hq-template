# Lane L3 — Recommendation #2 (decisions.md as core canonical artifact)

Lane: L3.
Rec: #2 — Promote `decisions.md` to a core canonical artifact.
Files touched:
- `tools/workstream-plugin-pack/skills/workstream-runner/assets/decisions.md` (new template).
- `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (new Asset Map row + new Quality Gate + Step 4 mention of decisions.md as sibling artifact).

## Self-check

- **Voice match.** Template opens with imperative declaration ("This document is the canonical decisions register..."); per-decision entry block uses bold field labels matching `assets/finding-record.md` style. Quality Gate bullet matches existing bullet voice. Step 4 sentence matches the imperative ("Open `assets/decisions.md` as a sibling artifact...").
- **Hedge-language grep.** None in new content.
- **Rec scope.** Asset created; one Asset Map row; one Quality Gate bullet; one sentence in Step 4. No scope creep into Step 0 / Step 1 / DRA Finalize step (L4's lane).
- **Cross-references.** Step 4 cites `assets/decisions.md` in established `assets/...` form. No cross-reference into `references/before-you-frame.md` from the asset itself; the brief does not require it (the asset is for any decisions, not just meta-design output).
- **Tool-agnostic phrasing.** Template names "DRA," "user-decision items," "execution-scope choices" — generic vocabulary. No tool names.
- **Sibling-artifact framing.** Step 4 explicitly says "decisions do not live inside the record" — captures the brief's "not buried inside the workstream record" requirement.
- **Quality Gate placement.** New bullet inserted between "output contract is satisfied" and "review findings are dispositioned" — follows logical workflow order (output contract → rationale captured → findings dispositioned). Total Quality Gates count grew from 7 to 8.
- **L4 step-numbering integrity.** Default Workflow remains 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (verified by `grep -nE "^[0-9]+\."`). No step inserted; only inline edits to existing Step 4. Will re-verify at L4.

## Disposition recommendation

Self-disposition: **accepted, no repair needed.** Voice review at Phase 2 will grade.
