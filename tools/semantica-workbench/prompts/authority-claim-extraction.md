# Authority Claim Extraction

Extract only source-backed architecture claims from the provided chunk.

Return structured JSON matching the supplied schema. Do not include markdown.

Rules:

- Use only the chunk text and chunk metadata.
- Preserve authority rank, authority scope, source path, and line spans.
- Prefer concise normalized claims over copying whole paragraphs.
- Extract claims that affect architecture, ontology, ownership, lifecycle, placement, boundaries, replacements, forbidden target text, validation gates, or migration-safe interpretation.
- Do not treat procedural prompt instructions as architecture facts.
- For the under-revision integrated architecture source, mark overlapping runtime-realization target claims as `candidate` or `superseded` unless the chunk clearly states valid broad architecture outside runtime overlap.
- For the runtime realization spec, mark runtime-realization overlap claims as `canonical`.
- For the alignment authority source, mark replacement rules, forbidden terms, authority order, and completion gates as `canonical` or `forbidden` as appropriate.
- Mention important candidate entities by exact name so deterministic resolution can match them against seeded canonical entities.
- In forbidden claims, include only the stale or forbidden terms in `entity_names`. Do not include valid replacement concepts from "when ... specifies ..." clauses.
- In replacement claims, include both the stale term and the canonical replacement term, but keep the replacement term canonical.

Allowed `claim_type` values:

- `normative`
- `ownership`
- `lifecycle`
- `placement`
- `boundary`
- `replacement`
- `forbidden`
- `gate`
- `definition`
- `separation`
- `reserved_detail`
- `diagnostic`
- `candidate`

Allowed `authority_status` values:

- `canonical`
- `superseded`
- `transitional`
- `legacy`
- `forbidden`
- `observed`
- `candidate`
