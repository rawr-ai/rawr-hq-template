# Agent S Scratchpad

## Session
- Session ID: `SESSION_019c587a`
- Role: `Agent S (Synthesis Owner)`

## Live Notes
- Scratchpad created. Context gathering in progress.

## Info-Design Skill Notes (`info:assess`)
- Default workflow to enforce: Assess -> Diagnose -> Design -> Shape -> Check.
- Mandate checks to run before delivery: logic test, skim test, swap test, noise test, scent test.
- Axis posture expected for this deliverable:
  - Purpose: precision/reference (normative policy clarity)
  - Density: moderate (principal-level prose, no execution churn)
  - Linearity: hybrid (readable sequence + random-access sections)
  - Audience: expert (cross-agent/spec maintainers)
  - Scope: multi-artifact system (canonical spec + annex/reference/history)
  - Temporality: mixed (canonical stable layer + migration/history layers)
- High-risk anti-patterns to avoid:
  - flat taxonomy of equal-weight sections
  - role blur between policy/normative/reference/history
  - redundant scaffolding and generic headings
  - machine-local linking in canonical layer
- Multi-artifact principles to enforce:
  - one concept, one location (single normative center)
  - explicit scope boundaries per artifact role
  - standalone-yet-coherent design with minimum viable context
  - cross-reference taxonomy (prereq/elaboration/related/supersession)

## Input Synthesis Anchors (Plan + Context + A/B Analysis)
- Convergence across A/B: primary problem is authority/role architecture, not policy quality.
- Stable target pattern across inputs:
  - single canonical normative center
  - explicit role taxonomy per artifact
  - single-source global invariants + caller/transport matrix
  - example fencing as non-normative reference unless tagged
  - portability cleanup (no machine-local absolute anchors in canonical layer)
- Primary tensions to resolve in final convergence doc:
  1. Whether to prescribe directory moves now vs role-first in-place migration.
  2. Whether to introduce new file (`RULES.md`) or keep policy ownership consolidated in existing core docs.
  3. How to classify posture doc and redistribution traceability (reference vs hybrid provenance).
- Non-negotiable constraints from context packet:
  - preserve D-005..D-010 meaning
  - docs-only, no runtime or architecture redesign
  - keep policy vs illustration boundary obvious in first screen

## Full Corpus Read Notes (Posture + Packet + Axes + Examples)
- Confirmed repeated authority language across:
  - `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
  - `orpc-ingest-spec-packet/DECISIONS.md`
  This is the main authority ambiguity to resolve by role model, not policy rewrite.
- Confirmed duplication hotspots:
  - caller/auth matrices repeated in posture + root + multiple axes
  - split-route invariants repeated across axis docs and examples
  - naming/context/schema posture repeated across many leaves
- Confirmed portability leaks in canonical orbit:
  - many `References` sections use machine-local absolute paths (`/Users/...`)
  - some path references in axis docs include full machine path anchors even for canonical guidance
- Confirmed examples are rich but highly policy-adjacent; they need explicit reference fencing while preserving detail.

## D-005..D-010 Meaning Preservation Checklist
- D-005 (workflow trigger route convergence): preserve split semantics and manifest-driven capability-first workflow routing.
- D-006 (workflow contract ownership): preserve plugin-owned boundary contracts; packages remain transport-neutral.
- D-007 (caller transport/publication): preserve `/rpc` first-party internal + OpenAPI external + `/api/inngest` runtime-only.
- D-008 (bootstrap traces + mount order + single runtime bundle): preserve baseline traces first and explicit mount/control-plane ordering.
- D-009 (middleware dedupe markers): preserve as open/non-blocking SHOULD guidance, not upgraded to MUST.
- D-010 (finished hook guardrail): preserve as open/non-blocking idempotent/non-critical guidance.

## Convergence Direction Decisions (working)
1. Canonical normative center remains in packet core (root + decisions as governed core set), with posture downgraded to reference integration overview.
2. Role taxonomy becomes explicit metadata contract across artifacts: Normative Core / Normative Annex / Reference / Historical.
3. Single-source ownership map should assign global invariants and canonical matrices to one normative owner; annexes hold axis deltas; examples illustrate only.
4. Portable linking rules must ban machine-local absolute anchors in canonical layer and prefer repo-relative links + stable IDs.
5. Migration should be phased role-first before any structural relocation; directory split may be optional target stage, not required first move.
6. Unchanged architecture-policy boundaries section must explicitly state no semantic changes to D-005..D-010.

## Completion Notes
- Converged direction authored at `SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.
- Output includes all required sections: authority model, role taxonomy, ownership map, portability linking rules, migration blueprint, unchanged policy boundaries.
- D-005..D-010 semantic preservation explicitly locked in section 6.
