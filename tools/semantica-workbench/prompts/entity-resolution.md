# Entity Resolution

Resolve extracted claim mentions against the seeded RAWR architecture entity catalog.

Return structured JSON matching the supplied schema. Do not include markdown.

Rules:

- Prefer seeded canonical entity IDs when a mention matches a seed name or alias.
- Do not silently redefine seeded entities.
- Mark unmatched but relevant architecture mentions as `candidate`.
- Preserve source path, line span, authority rank, and authority scope.
- Keep layer-specific meanings distinct. For example, a forbidden public target term may still appear as a lower-layer runtime concept only when the source explicitly says so.
- Do not create generic entities such as "architecture", "system", or "document" unless the seed catalog already contains them.

Resolution statuses:

- `seeded`
- `candidate`
- `new`
- `rejected`
