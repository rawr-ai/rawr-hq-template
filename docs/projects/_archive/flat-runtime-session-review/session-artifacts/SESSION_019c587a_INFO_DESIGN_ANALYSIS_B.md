# SESSION_019c587a — Information Design Analysis B

## Assessment Scope
This is an independent second-perspective information-design assessment of the flat-runtime ORPC/Inngest corpus, optimized for canonical portability and legibility-by-structure.

Corpus evaluated:
1. Packet root + all axis docs + decisions + redistribution traceability.
2. E2E example set (`E2E_01`..`E2E_04`).
3. Integrative posture spec.
4. Route review + D008 closure artifacts (for role separation and historical leakage checks).

## Purpose and Axes (Current vs Target)
| Axis | Current posture | Target posture for portable canonical spec | Assessment |
| --- | --- | --- | --- |
| Purpose | Mixed normative + explanatory + provenance in same neighborhood | Precision-first canonical core with explicit supporting layers | Misaligned at corpus level |
| Density | High overall; code-heavy examples and repeated policy text | Concentrated normative density + separate deep reference density | Misaligned |
| Linearity | Multiple possible “entry points” to authority | One normative entrypoint, then guided branching | Misaligned |
| Audience | Expert-focused, but role distinctions assumed not enforced | Expert-focused with explicit role labels for implementers/readers | Partially aligned |
| Scope | Multi-artifact with strong local files but soft system boundaries | Multi-artifact with explicit role partitions and navigation contracts | Misaligned |
| Temporality | Timeless policy and time-bound closure docs coexist nearby | Timeless canonical layer + explicit historical/provenance layer | Misaligned |

## Information Hierarchy Evaluation
### What works
1. Internal hierarchy inside axis docs is predictable and scannable.
2. Local headings generally have strong scent and purpose.
3. Packet has a clear “axis map” pattern and navigation cues.

### Where hierarchy breaks at system level
1. Authority hierarchy is ambiguous:
- packet root (`ORPC_INGEST_SPEC_PACKET.md`),
- posture spec (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`),
- decision register (`DECISIONS.md`),
can all be interpreted as top-level authority.
2. Tutorials/reference (`examples/`) include policy-checklist language that reads normative.
3. Historical closure docs carry highly assertive policy language, increasing risk of accidental canonical interpretation.

## Information Scent Evaluation
### Strong scent
1. Axis titles and section labels are explicit.
2. Route and caller matrices are concrete and findable.

### Weak scent
1. Role scent at file path level is weak.
- Session/provenance docs and canonical docs share adjacent location and naming style.
2. “Where to start for canonical truth” is inferable, not enforced.
3. Some docs use absolute machine-local anchors, weakening portable scent.

## Role Separation Evaluation (Normative vs Reference vs Historical)
### Normative (should remain canonical)
1. Packet root policy definitions.
2. Axis-level normative policies.
3. Decision register state.

### Reference (should be non-normative annex)
1. E2E implementation walkthroughs.
2. Redistribution traceability (useful reference/provenance hybrid).
3. Integrative posture explanation (if retained as narrative synthesis).

### Historical (should be fenced)
1. D008 closure plan/changelog/review docs.
2. Route-review and agent scratch/plan artifacts.
3. Session-specific bridge and execution logs.

### Separation quality today
Partially explicit in prose, insufficiently explicit in structure/pathing. This is the main architecture problem.

## Duplication Risk Assessment
### High duplication zones
1. Caller/auth matrix semantics repeated across posture + packet + multiple axis docs + examples.
2. D-008 bootstrap and control-plane ordering repeated across decision, packet, posture, axis, and E2E docs.
3. Workflow/API boundary ownership repeated in several normative leaves and overview docs.

### Risk impact
1. Change amplification: one policy tweak requires synchronized edits across many files.
2. Drift opportunity: minor wording divergence can create policy ambiguity.
3. Review burden: implementers must triangulate repeated statements instead of trusting one source.

## Portability Fitness Assessment
### Current fitness: Medium
Why not high:
1. Canonical material is strong, but portable extraction boundary is unclear.
2. Historical/session artifacts are co-located near canonical packet materials.
3. Absolute local file references appear in corpus and reduce portability cleanliness.

### Required for high portability
1. Single canonical entrypoint plus canonical role-tagged subtree.
2. Strict annex/reference and history segregation.
3. Relative-link and ID-based references for normative rules.

## What Should Stay vs Move (Role-Based)
### Stay canonical
1. `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
2. `orpc-ingest-spec-packet/AXIS_01...AXIS_09`
3. `orpc-ingest-spec-packet/DECISIONS.md`

### Move to annex/reference
1. `orpc-ingest-spec-packet/examples/E2E_01...E2E_04`
2. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (explanatory integrative narrative)
3. `orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md` (reference/provenance appendix)

### Move to historical/provenance
1. `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`
2. `SESSION_019c587a_D008_*` set
3. `SESSION_019c587a_AGENT_D008_*` set
4. Related plan/scratch/final-review session docs

## Independent B Conclusion
The corpus is content-strong but architecture-ambiguous. The highest-leverage fix is not policy editing; it is role architecture: one canonical center, explicit annex/reference lanes, and fenced historical provenance. This yields better portability and clearer implementation legibility with zero meaning loss.
