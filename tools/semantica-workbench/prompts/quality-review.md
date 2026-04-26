# Quality Review

Review the generated authority graph for decision-making readiness.

Return structured JSON matching the supplied schema. Do not include markdown.

Check:

- Every edge and claim has source path, line span, claim ID, and authority rank.
- Every relation subject and object resolves to an entity ID.
- Authority-lock, replacement, and forbidden-term seeds from the alignment authority are represented.
- Runtime component contract rows from the runtime realization spec include owner, placement, producer, consumer, phase, diagnostic, and gate where available.
- Forbidden stale terms are not classified as canonical target architecture.
- Generic `mentions` edges do not appear in the decision graph.
- Low-confidence aliases and candidate entities remain separate from accepted seeded entities.
- Runtime-spec details are not promoted into broad architecture unless the alignment authority requires transfer at an integration boundary.
