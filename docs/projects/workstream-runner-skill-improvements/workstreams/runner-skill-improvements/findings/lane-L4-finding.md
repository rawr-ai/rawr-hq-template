# Lane L4 — Recommendation #3 (DRA Finalize step)

Lane: L4.
Rec: #3 — Add an explicit "DRA Finalize" step before closure stewards fire.
Files touched:
- `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (new Step 8 inserted between previous Step 7 "Review and repair" and previous Step 8 "Close or hand off"; previous Step 8 renumbered to Step 9).
- `tools/workstream-plugin-pack/skills/workstream-runner/references/closure.md` (new paragraph reinforcing the rec at the end of the file).

## Self-check

- **Voice match.** New Step 8 follows verb-first imperative pattern ("Stage and commit...", "Update...", "Populate...", "Then invoke..."). Closure reinforcement paragraph uses flat assertion ("The closure-readiness stewards audit what the DRA has finalized; they do not substitute for finalization") matching the existing skill's opinionated-where-earned voice.
- **Hedge-language grep.** None in new content.
- **Rec scope.** New step inserted; one paragraph added to closure.md. No scope creep into Reference Map / Asset Map / Quality Gates / Step 5 (lanes) / Step 7 (review loops).
- **Cross-references.** Closure.md's new paragraph cites "Step 8 (DRA finalize)" — points at the new step, post-renumbering. Verified.
- **Tool-agnostic phrasing.** Step uses "stage and commit" (the verb, not `git`/`gt`); "decisions register," "deferrals," "finding records" — all generic vocabulary; "workstream record header" not a tool-specific format.
- **L4 step-numbering integrity (load-bearing check).** Default Workflow now reads 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 contiguously (verified by `grep -nE "^[0-9]+\."`). Two `Step N` cross-references exist outside SKILL.md:
  - `references/before-you-frame.md:13` cites "Step 1" — correct (capture meta-design output before "Ground the workstream").
  - `references/closure.md:17` cites "Step 8 (DRA finalize)" — correct (introduces the new step by name and number).
  No orphan references. **PASS.**

## Disposition recommendation

Self-disposition: **accepted, no repair needed.** Voice review at Phase 2 will grade.
