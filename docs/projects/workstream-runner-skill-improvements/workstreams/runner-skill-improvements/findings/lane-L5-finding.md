# Lane L5 — Recommendation #5 (coordination patterns reference)

Lane: L5.
Rec: #5 — Add a `references/coordination-patterns.md` reference.
Files touched:
- `tools/workstream-plugin-pack/skills/workstream-runner/references/coordination-patterns.md` (new).
- `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` (new Reference Map row).

## Self-check

- **Voice match.** Reference opens with the imperative-rule pattern of `primitive-boundary.md` and `input-and-scratch-discipline.md` ("Use when...", "Both patterns sit inside one workstream..."). Each pattern has a flat-assertion principle ("Copy-paste of decision content into briefs is forbidden") matching the existing skill's opinionated voice.
- **Hedge-language grep.** None in new content. ("When neither pattern fits" is conditional language about *applicability*, not about whether to apply the pattern when it fits — distinct from hedge.)
- **Rec scope.** New reference + one Reference Map row. No SKILL.md Default Workflow change; no other reference touched. Patterns A and B both ship — no over-decomposition into a third pattern.
- **Cross-references.** Both working-reference paths cited verbatim. Both point at `findings/` artifacts on `align-arch-spec-with-runtime-realization` (the prior workstream's pattern evidence).
- **Tool-agnostic phrasing.** "DRA serializes application via the editor" — names the role, not a specific tool. "Dedicated lane branches that the DRA merges in order" — describes the pattern, not `git`/`gt`/`graphite`.
- **Canonicality boundary (DR2-style check).** Pattern A talks about *artifacts and serialization* (`decisions.md`, worker brief slot, copy-paste invalidation signal). Pattern B talks about *artifacts and serialization* (patch files, BEFORE/AFTER blocks, DRA-applied edits). Neither imports role/agent vocabulary that belongs in team-design (no role definitions, no model tier guidance, no coordination *between humans*). The brittleness check from decisions.md D-3 system-design failure mode is honored.
- **L4 step-numbering integrity.** L5 changes nothing about Default Workflow numbering. SKILL.md steps remain 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

## Disposition recommendation

Self-disposition: **accepted, no repair needed.** Voice review at Phase 2 will grade.
