# SESSION_019c587a Information Design Proposal and Recommendation

## Recommendation Summary
Adopt a layered canonical-spec architecture that preserves current policy intent while making authority and portability explicit.

Design goal ordering:
1. Standalone portable canonical spec.
2. High implementation clarity.
3. Minimal disruption to current packet content.

## Proposed Target Information Architecture

## Layer 1: Primary Canonical Spec (single normative center)
Primary file role:
- One explicit canonical root for subsystem policy and invariants.

Recommended contents:
1. Scope and non-goals.
2. Normative vocabulary and actor model.
3. Single authoritative caller/route/transport matrix.
4. Normative invariants (`MUST`, `MUST NOT`, `SHOULD`) single-sourced.
5. Ownership boundaries (package/plugin/host/runtime).
6. Conformance profile/checklist.
7. Pointers to annexes and decision register.

Candidate root:
- `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` (promoted and tightened as sole canonical entry).

## Layer 2: Normative Annexes (axis deltas, not policy restatement mirrors)
Annex role:
- Preserve axis decomposition, but scope each axis to its unique incremental policy.

Annex behavior:
1. Start with `Depends on canonical root sections: ...`.
2. Include only axis-specific rules and edge semantics.
3. Replace repeated global invariants with links to canonical root.
4. Keep code snippets only when needed to clarify the rule itself.

Applies to:
- `AXIS_01` through `AXIS_09`.

## Layer 3: Reference Examples (non-normative implementation patterns)
Reference role:
- Provide concrete patterns, anti-patterns, and guardrails.

Reference behavior:
1. Explicit label at top: `Non-normative example unless explicitly tagged`.
2. Keep narrative-first explanation.
3. Move long code blocks to appendices when possible.
4. Map each example section to canonical invariants with link IDs.

Applies to:
- `examples/E2E_01`..`E2E_04`.

## Layer 4: Historical Provenance and Review Artifacts
Historical role:
- Preserve rationale, review lineage, and closure evidence without competing for canonical authority.

Applies to:
- `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`
- `SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md`
- `SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md`
- `REDISTRIBUTION_TRACEABILITY.md` (can be hybrid: provenance appendix referenced by canonical root)

## Explicit Keep / Restructure / Merge / Split Decisions

## Keep
1. Axis decomposition model (`AXIS_01`..`AXIS_09`).
2. Decision-ID discipline in `DECISIONS.md`.
3. Caller/auth and route matrices.
4. Cross-axis link strategy.
5. E2E walkthrough family as learning and validation references.

## Restructure
1. Make one file the unambiguous canonical root.
2. Add explicit role labels at top of every packet artifact: `Normative Core`, `Normative Annex`, `Reference`, `Historical`.
3. Move repeated invariants from annexes/examples into canonical root and back-link.
4. Replace absolute local filesystem anchors with repo-relative or role-relative references.

## Merge
1. Merge duplicated global invariant statements into the canonical root (single-source policy text).
2. Consolidate repeated caller/transport matrices into one authoritative matrix, referenced elsewhere.

## Split
1. Split reference examples into:
   - concise narrative and policy mapping section,
   - optional code appendix section.
2. Split historical/session review material from normative packet reading path.

## Primary vs Appendix Classification

Primary normative:
1. Canonical root (`ORPC_INGEST_SPEC_PACKET.md`, tightened).
2. `DECISIONS.md` (normative decision registry).
3. Axis annexes (`AXIS_01`..`AXIS_09`, delta-scoped).

Appendix/reference:
1. E2E example docs.
2. Redistribution mapping.

Historical/provenance:
1. Session review.
2. D-008 changelog.
3. Closure final review.

## Migration Blueprint (Minimal Disruption)

1. Role-tag pass (no content rewrite).
- Add a role block at top of each artifact declaring one of: Core, Annex, Reference, Historical.

2. Canonical-center lock pass.
- Declare `ORPC_INGEST_SPEC_PACKET.md` as sole canonical entry and demote competing “overview authority” language to supportive context.

3. Single-source invariant pass.
- Create canonical invariant IDs in root; replace duplicate statements in annexes/examples with references.

4. Matrix consolidation pass.
- Keep one authoritative caller/transport matrix; convert other copies to local deltas or links.

5. Portability normalization pass.
- Remove absolute machine-local path anchors from canonical layer.

6. Example role-fencing pass.
- Add non-normative disclaimer and policy-link mapping in each E2E file.

7. Historical separation pass.
- Fence session/changelog/closure docs as provenance and exclude from canonical read path.

8. Conformance gate pass.
- Validate the acceptance checklist below and treat it as packet quality gate.

## Acceptance Checklist: Portable Canonical Spec Readiness

1. One and only one artifact is declared canonical root.
2. Every artifact has an explicit role label.
3. Global invariants are single-sourced in canonical root.
4. Axis docs contain only axis-specific additions/constraints.
5. Decision IDs are resolvable from canonical root.
6. Caller/route/transport matrix exists once as authoritative source.
7. Example docs are explicitly non-normative by default.
8. Every example links to the invariant(s) it illustrates.
9. Historical/session docs are clearly separated from normative path.
10. No absolute local filesystem paths remain in canonical layer.
11. Cross-links between root, annexes, decisions, and examples resolve cleanly.
12. Terminology is consistent for caller classes, route families, and ownership boundaries.
13. “What is policy” vs “what is illustration” is unambiguous in first screen of each doc.
14. Canonical root can be copied to another repo with intact semantics and reference integrity.
15. Packet can be read in role order (`Core -> Annexes -> References`) without requiring session-history docs.

## Top-Level Recommendation
Use the split-doc output pattern for ongoing maintenance:
- Analysis artifact (diagnosis).
- Proposal artifact (target IA + migration blueprint + readiness gate).

This keeps strategic rationale and structural prescription distinct, while preserving current canonical policy intent.

