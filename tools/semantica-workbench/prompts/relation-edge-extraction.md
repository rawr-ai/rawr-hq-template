# Relation Edge Extraction

Create decision-graph edges from resolved entities and extracted claims.

Return structured JSON matching the supplied schema. Do not include markdown.

Rules:

- Emit only controlled predicates.
- Every edge must reference a source claim ID.
- Every edge subject and object must resolve to canonical or candidate entity IDs.
- Do not emit `mentions` as a decision graph edge.
- Preserve qualifiers such as layer, phase, polarity, authority scope, and source priority when present.
- Prefer fewer precise edges over broad semantic mush.
- If the source has a replacement table, model the canonical target as replacing the stale target.
- If the source has forbidden target text, model the alignment authority as forbidding that stale target.
- If the source defines ownership, model the owner and owned responsibility explicitly.

Allowed predicates:

- `is_authority_for`
- `supersedes`
- `replaces`
- `forbids`
- `owns`
- `does_not_own`
- `declares`
- `implements`
- `selects`
- `derives`
- `compiles_to`
- `provisions`
- `binds`
- `lowers_to`
- `mounts`
- `observes`
- `finalizes`
- `produces`
- `consumes`
- `requires`
- `depends_on`
- `classified_by`
- `located_at`
- `published_as`
- `validates`
- `emits_diagnostic`
- `reserved_for`
- `separate_from`
- `precedes`
