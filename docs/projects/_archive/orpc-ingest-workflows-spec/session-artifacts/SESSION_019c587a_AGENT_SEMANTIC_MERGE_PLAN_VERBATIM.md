# Plan — SESSION_019c587a Agent Semantic Merge

## Orientation
- Worktree `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal` on branch `codex/pure-package-e2e-convergence-orchestration` under Graphite + git-worktree rules.
- Skills already introspected: `orpc`, `inngest`, `elysia`, `typebox`, `architecture`, `graphite`, `git-worktrees` (log kept in the scratchpad per requirement).
- Mission: analyze semantic overlap between the old `/docs/system` flat-runtime packet and the authoritative ORPC/Inngest packet family, and plan a single authoritative packet composition without touching canonical docs now.

## Steps
1. Survey authoritative baseline docs (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`, `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`, the `AXIS_*` docs, and `DECISIONS.md`) to capture their axis/policy structure.
2. Review required context matrices (`ORIGINAL_TO_ORPC_INGEST_ALIGNMENT_MATRIX`, `DOCS_ARCHIVE_SWEEP_MATRIX`, `CLEANUP_INTEGRATION_SYNTHESIS`, `LOOP_CLOSURE_BRIDGE`) for existing mapping of keep/replace/merge decisions and authority guidance.
3. Compare with old family docs under `/docs/system` (proposal, spec packet, axis docs, decisions) to spot unique concerns, overlaps, and policy drift.
4. Draft semantic merge map that explicitly lists: keep-unique content, replace-by-authoritative content, and sections needing merge-alignment, anchored to specific source docs.
5. Diagnose the contextual confusion reasons (taxonomy mismatches, authority ambiguity, etc.) and propose final authoritative packet composition approach, including file responsibilities/ownership boundaries.
6. Outline concrete execution order for producing the single authoritative packet when editing is allowed.
7. Record the work plan/scaffold in the required artifacts (this plan file, ongoing scratchpad, final analysis doc). Maintain the scratchpad with notes as reasoning progresses.

## Deliverables
- `SESSION_019c587a_AGENT_SEMANTIC_MERGE_PLAN_VERBATIM.md` (this file).
- `SESSION_019c587a_AGENT_SEMANTIC_MERGE_SCRATCHPAD.md` (active reasoning log).
- `SESSION_019c587a_SEMANTIC_CONTEXTUAL_MERGE_ANALYSIS.md` (final analysis with semantic merge map, diagnosis, composition plan, execution order).
