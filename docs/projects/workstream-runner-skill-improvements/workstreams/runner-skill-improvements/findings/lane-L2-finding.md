# Lane L2 — Recommendation #1 (Before You Frame)

Lane: L2.
Rec: #1 — Add a non-optional "Before You Frame" meta-design pass.
Files touched:
- `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (new Step 0 in Default Workflow + new Reference Map row).
- `tools/workstream-plugin-pack/skills/workstream-runner/references/before-you-frame.md` (new).

## Self-check

- **Voice match.** New Step 0 follows the "verb-first imperative + reference pointer" pattern of existing steps. New reference uses concise imperative throughout (`Run four meta-design passes...`, `Decide roles...`, `Walk the workstream...`).
- **Hedge-language grep.** None of `consider whether`, `you might want to`, `it may be useful to` appear in the new content.
- **Rec scope.** Step 0 added; Reference Map row added; new reference file created. No scope creep into Step 1 (already complete from L1), Asset Map (L3's lane), or Quality Gates (L3's lane).
- **Cross-references.** Step 0 cites `references/before-you-frame.md` using the established `references/...` form.
- **Tool-agnostic phrasing.** New reference says "skills implementing these (e.g., team design / perspective / system design / information assessment skills)" — names categories, not specific skill IDs. Brittleness-guard paragraph reinforces.
- **Brittleness-guard verbatim check (Rec #1 strict-equality).** `grep -F "the four passes are still mandatory"` against `references/before-you-frame.md` returns the load-bearing sentence. Verbatim wording from brief §3.1 reproduced as its own paragraph. **PASS.**
- **L4 step-numbering integrity.** Default Workflow now reads 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 contiguously (verified by `grep -nE "^[0-9]+\."`). No orphan step references in `references/closure.md` or other references; existing references named "Step 1" etc. continue to match. Will re-verify at L4 (insertion of DRA Finalize between current 7 and 8).

## Disposition recommendation

Self-disposition: **accepted, no repair needed.** Voice review at Phase 2 will grade.
