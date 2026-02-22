# SESSION_019c587a — Information Design Converged Direction

## Purpose
Establish one portable, implementation-legible canonical spec system for the ORPC/Inngest packet without changing architectural policy meaning.

This direction is structural. It does not introduce new runtime behavior, new policy scope, or execution-plan workflow semantics.

## 1) Canonical Authority Model (Single Normative Center)
The canonical authority center is the `orpc-ingest-spec-packet` normative core, with one required entrypoint:
1. `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` is the sole canonical read start and normative index.
2. `orpc-ingest-spec-packet/DECISIONS.md` is the normative decision-state ledger referenced by that index.

Authority contract:
1. If a policy statement appears outside the normative core, it is subordinate unless explicitly marked as a direct quote with a back-reference to core ownership.
2. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` is integration-oriented reference context, not a competing policy root.
3. Examples and session artifacts never become policy owners by tone, detail, or placement.

Why this model:
1. It removes competing “centers of truth.”
2. It preserves existing policy content while making ownership explicit.
3. It keeps portability high because consumers can start in one deterministic place.

## 2) Role Taxonomy
Every artifact in this subsystem declares one role at the top of the file.

### Role definitions
| Role | Authority | Allowed content | Not allowed |
| --- | --- | --- | --- |
| Normative Core | Highest | global invariants, canonical caller/transport matrix, ownership boundaries, decision state | tutorial-first framing, duplicate policy mirrors in other roles |
| Normative Annex | Binding within delegated axis scope | axis-specific deltas, constraints, edge semantics linked to core invariants | re-owning global invariants, redefining caller matrix |
| Reference | Non-normative by default | explanations, walkthroughs, examples, integration orientation | independent policy ownership |
| Historical/Provenance | Record only | plans, reviews, changelogs, traceability lineage | current normative authority |

### Required role header (minimum)
Each spec artifact should include, in the first screen:
1. `Role`
2. `Authority`
3. `Owns`
4. `Depends on`
5. `Last validated against` (for reference/historical layers)

## 3) Single-Source Ownership Map
Policy concepts are owned once and referenced everywhere else.

| Concept / policy surface | Single owner | Consumers |
| --- | --- | --- |
| Canonical read path, subsystem invariants, packet-wide caller/route defaults | `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` | all axis docs, posture doc, examples |
| Decision status and change-control state (including D-005..D-010 posture/state) | `orpc-ingest-spec-packet/DECISIONS.md` | core, annexes, reference docs |
| Axis-specific normative constraints | `orpc-ingest-spec-packet/AXIS_01...AXIS_09` (each owns only its axis) | core index, posture doc, examples |
| Integrative explanation of how parts fit together | `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Reference) | onboarding and implementation readers |
| End-to-end implementation illustrations | `orpc-ingest-spec-packet/examples/E2E_01...E2E_04.md` (Reference) | implementers |
| Redistribution lineage | `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md` (Historical/Provenance or provenance-tagged reference appendix) | maintainers/auditors |
| Session plans/reviews/changelogs/scratchpads | `SESSION_019c587a_*` operational artifacts (Historical/Provenance) | maintainers only |

Ownership rule:
1. Global policy belongs to core once.
2. Annexes contain deltas and constraints, not mirrored global policy blocks.
3. Reference content illustrates policy and links back to owners.

## 4) Portable-Linking Rules
Portable canonical behavior requires stable link discipline.

1. Canonical layer (`Normative Core` and `Normative Annex`) must use repo-relative links and stable section anchors only.
2. Machine-local absolute paths (for example `/Users/...`) are forbidden in canonical layer.
3. Reference layer may cite concrete local paths only when marked as environment-specific implementation evidence, never as canonical anchors.
4. Historical/provenance artifacts may preserve historical absolute paths only as archival evidence, and must not be required for canonical interpretation.
5. Prefer concept anchors over brittle line anchors when linking across normative docs.
6. Each reference doc section that states a rule must include an explicit back-link to the owning normative artifact.

## 5) Migration Blueprint (Current -> Target)
Migration is role-first and meaning-preserving.

### Phase A — Authority declaration (no content relocation)
1. Add role headers to core, annex, reference, and historical artifacts.
2. Declare `ORPC_INGEST_SPEC_PACKET.md` as sole canonical entrypoint.

Exit: first-screen authority is unambiguous in every file.

### Phase B — Ownership normalization
1. Keep global invariants and canonical matrices in core ownership.
2. Replace mirrored invariant text in annexes with concise references to core anchors.
3. Keep axis docs focused on axis deltas and edge semantics.

Exit: no duplicated global-policy ownership across layers.

### Phase C — Reference and historical fencing
1. Mark posture doc and E2E docs as Reference, non-normative by default.
2. Mark session/changelog/review artifacts as Historical/Provenance.
3. Ensure canonical read path does not depend on historical artifacts.

Exit: policy vs illustration vs history is obvious in first screen.

### Phase D — Portability normalization
1. Remove machine-local absolute anchors from canonical docs.
2. Convert canonical cross-links to repo-relative links and stable anchors.
3. Keep any local-path evidence only in reference/historical docs with explicit caveats.

Exit: canonical packet is copy-portable without link breakage.

### Phase E — Validation gate
1. One canonical entrypoint test.
2. Single-source ownership test for global invariants.
3. Role-taxonomy compliance test.
4. Policy/illustration boundary test.
5. D-005..D-010 meaning-preservation check.

Exit: packet is structurally converged and policy-stable.

## 6) Explicit Unchanged Architecture-Policy Boundaries
This redesign does not alter architecture policy meaning. The following remain unchanged:

1. D-005: workflow trigger route convergence remains manifest-driven and capability-first; `/api/workflows/<capability>/*` remains caller-facing and `/api/inngest` remains runtime-only ingress.
2. D-006: workflow/API boundary contract ownership remains plugin-owned; packages remain transport-neutral and do not own workflow boundary trigger/status contracts.
3. D-007: caller transport/publication boundaries remain fixed (`/rpc` internal first-party, OpenAPI surfaces externally published, `/api/inngest` runtime-only).
4. D-008: baseline traces bootstrap order, single runtime-owned Inngest bundle, and explicit mount/control-plane ordering remain locked.
5. D-009: middleware dedupe marker guidance remains open/non-blocking `SHOULD`, not promoted to stricter policy.
6. D-010: Inngest `finished` hook side-effect guidance remains open/non-blocking and idempotency-oriented.

Additional unchanged boundary:
1. No runtime code change requirement is introduced by this converged direction.
2. No new architecture policy is introduced; this is information-architecture convergence only.
