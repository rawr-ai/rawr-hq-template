# SESSION_019c587a - Agent F Step 3 Plan

## Objective (Step 3 Only)
Reframe API boundary ownership policy so boundary-owned API contract/router is the canonical default, with two explicit paths and clear usage criteria.

## In Scope
1. Rewrite API policy section around canonical default = Path B (boundary-specific contract/router).
2. Preserve Path A reuse exception for high 1:1 overlap and simple reuse.
3. Add explicit “when to use” and “when not to use” criteria for both Path A and Path B.
4. Strengthen anti-pattern guardrails with explicit no extension hell and no tangled multi-layer inheritance language.

## Out of Scope
1. Step 4+ changes.
2. Domain/workflow policy rewrites unrelated to API boundary ownership framing.
3. Implementation/code changes.

## Planned Edits
1. Replace current API policy bullets with two-path structure:
   - Path B (default),
   - Path A (exception).
2. Add criteria blocks for each path (use / do not use).
3. Update guardrails language for inheritance/extension anti-patterns.
4. Keep existing example sections intact unless a minimal wording alignment is required for consistency.

## Step 3 Gate
Both Path A and Path B have explicit, non-overlapping “when to use” and “when not to use” criteria, and boundary-owned API contract/router is clearly canonical default.
