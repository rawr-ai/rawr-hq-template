# SESSION_019c587a — Information Design Proposal Recommendation B

## Proposal Intent
Structural redesign only. No policy rewrite.

Goal: make the spec corpus standalone-portable with unambiguous canonical authority and better implementation legibility-by-structure.

## Top 5 Recommendations
1. Establish one canonical root path and make every other artifact subordinate by role.
- Keep one normative entrypoint for implementers.
- Prevent “competing authority” between packet root, posture, and review docs.

2. Single-source global invariants and caller matrices.
- Keep normative statements in one canonical location.
- Replace repeated restatements in other files with stable references.

3. Hard-separate normative vs reference vs historical in directory structure.
- Canonical: policy rules and decisions.
- Reference: examples and explanatory integration context.
- Historical: session plans/changelogs/reviews/scratchpads.

4. Convert E2E docs to annex reference role (implementation exemplars, not policy owners).
- Preserve all examples and code.
- Remove policy duplication pressure by referencing canonical rule IDs instead of restating rules.

5. Add portability guardrails to the canonical layer.
- No absolute machine-local path anchors in canonical files.
- Role metadata at top of files (`Role: Canonical|Reference|Historical`).
- Canonical-read path starts at a single index and stays within canonical subtree.

## Proposed Target File Map
### Target structure
```text
docs/projects/flat-runtime-session-review/
  canonical/
    CANONICAL_INDEX.md                        # single normative entrypoint
    ORPC_INGEST_SPEC_PACKET.md                # normative root (current packet root content)
    DECISIONS.md                              # normative decision register
    RULES.md                                  # extracted global invariants + caller matrix (single-source)
    axes/
      AXIS_01_EXTERNAL_CLIENT_GENERATION.md
      AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md
      AXIS_03_SPLIT_VS_COLLAPSE.md
      AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md
      AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md
      AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md
      AXIS_07_HOST_HOOKING_COMPOSITION.md
      AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md
      AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md

  reference/
    POSTURE_OVERVIEW.md                       # explanatory integration narrative
    REDISTRIBUTION_TRACEABILITY.md            # provenance/reference appendix
    examples/
      E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md
      E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md
      E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md
      E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md

  history/
    route-review/
      SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md
      SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_PLAN.md
      SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_SCRATCHPAD.md
    d008-closure/
      SESSION_019c587a_D008_CLOSURE_PLAN_VERBATIM.md
      SESSION_019c587a_D008_CLOSURE_ORCHESTRATOR_SCRATCHPAD.md
      SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md
      SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md
      SESSION_019c587a_AGENT_D008_PLAN_VERBATIM.md
      SESSION_019c587a_AGENT_D008_RECOMMENDATION.md
      SESSION_019c587a_AGENT_D008_SCRATCHPAD.md
```

### Current-to-target mapping (core set)
| Current file | Target path | Role |
| --- | --- | --- |
| `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` | `canonical/ORPC_INGEST_SPEC_PACKET.md` | Canonical |
| `orpc-ingest-spec-packet/DECISIONS.md` | `canonical/DECISIONS.md` | Canonical |
| `orpc-ingest-spec-packet/AXIS_01...09.md` | `canonical/axes/AXIS_01...09.md` | Canonical |
| `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | `reference/POSTURE_OVERVIEW.md` | Reference |
| `orpc-ingest-spec-packet/examples/E2E_01...04.md` | `reference/examples/E2E_01...04.md` | Reference |
| `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md` | `reference/REDISTRIBUTION_TRACEABILITY.md` | Reference/Provenance |
| `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md` | `history/route-review/...` | Historical |
| `SESSION_019c587a_D008_*` + `SESSION_019c587a_AGENT_D008_*` | `history/d008-closure/...` | Historical |

## Canonical vs Annex vs Historical (Explicit)
### Remains canonical
1. Packet root normative policy.
2. Axis normative leaves.
3. Decision register.
4. Single-source global rules/matrix (`RULES.md`, extracted from existing text without semantic change).

### Moves to annex/reference
1. Integrative posture narrative.
2. E2E implementation walkthroughs.
3. Redistribution traceability appendix.

### Moves to historical
1. Session plans/scratchpads/changelogs/final closure reviews.
2. Route review and orchestration artifacts.

## Migration Path (Zero Meaning Loss)
1. Create target folders and `CANONICAL_INDEX.md` first (no content changes).
2. Copy existing canonical docs into `canonical/` with identical content; keep old files as redirect stubs during transition.
3. Move posture + E2Es + redistribution doc into `reference/` unchanged.
4. Move session and D008/route artifacts into `history/` unchanged.
5. Introduce `RULES.md` by extraction-only:
- copy existing invariant and caller-matrix statements verbatim from current canonical docs,
- replace duplicate copies elsewhere with references to `RULES.md` anchors.
6. Replace absolute local paths in canonical docs with relative repo paths.
7. Add verification pass:
- every old anchor still resolves,
- no policy sentence lost,
- canonical index resolves all normative rules and decisions.

## Acceptance Criteria
1. One canonical entrypoint exists and is explicitly labeled.
2. Canonical subtree contains only normative docs.
3. Examples are reference-only and no longer act as policy owners.
4. Session-era artifacts are isolated under `history/`.
5. No absolute machine-local links remain in canonical docs.
6. Every displaced file has a traceable mapping and no semantic loss.

## Implementation Legibility Outcome
After this restructuring, implementers can read in deterministic order:
`CANONICAL_INDEX.md` -> `ORPC_INGEST_SPEC_PACKET.md` -> `RULES.md` -> relevant `axes/*` -> optional `reference/examples/*`.

That sequence improves readability without changing policy semantics.
