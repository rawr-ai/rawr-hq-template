# SESSION_019c587a — Information Design Agent B Scratchpad

## Mission
Independent second-perspective assessment focused on canonical portability and implementation legibility-by-structure.

Constraints respected:
1. No canonical policy rewrites in this pass.
2. Analysis/proposal only.
3. Full corpus read: packet, all axis docs, all E2E examples, posture spec, route review, D008 closure docs.

## Skill + Workflow Introspection (Required Context)
Reviewed:
- `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/information-design/references/where-defaults-hide.md`
- `/Users/mateicanavra/.codex-rawr/skills/information-design/references/axes.md`
- `/Users/mateicanavra/.codex-rawr/skills/information-design/references/principles.md`
- `/Users/mateicanavra/.codex-rawr/skills/information-design/references/multi-artifact.md`
- `/Users/mateicanavra/.codex-rawr/skills/information-design/references/examples.md`
- `/Users/mateicanavra/.codex-rawr/prompts/info-assess.md`

Applied lens:
- Assess against intended purpose, not generic style.
- Diagnose defaults: flat hierarchy, duplicate scaffolding, weak corpus-level scent, role mixing.
- Separate single-file quality from multi-file system quality.

## Corpus Manifest (Read)
Normative packet set:
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`

Reference/tutorial set:
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

Integrative/explanatory docs:
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`

D008 closure docs:
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D008_PLAN_VERBATIM.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D008_RECOMMENDATION.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_CLOSURE_ORCHESTRATOR_SCRATCHPAD.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_CLOSURE_PLAN_VERBATIM.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md`

## Structural Signals Collected
1. Corpus size sampled: 25 files, ~28.7k words.
2. Axis docs share highly uniform section templates (`In Scope`, `Out of Scope`, `Canonical Policy`, `Why`, `Trade-Offs`, `References`, `Cross-Axis Links`).
3. Repeated policy statements detected in multiple normative files, especially:
- caller/auth matrix semantics,
- D-008 bootstrap order and single-bundle wording,
- plugin-owned workflow/API boundary contracts.
4. Example docs include policy conformance checklists that restate normative rules already present in packet/axis docs.
5. Session-era docs (plans, scratchpads, changelogs, closure reviews) coexist in same project path as canonical packet docs.

## Raw Findings (Unfiltered)
### Strengths
1. Local file-level scent is generally strong (headings and role labels are specific).
2. Normative intent is explicit (`MUST`/`SHOULD`, route semantics, caller matrices).
3. Split control-plane logic is consistently articulated.

### Friction
1. Corpus-level scent is weaker than file-level scent: multiple docs read as authoritative.
2. Role boundaries are leaky:
- Normative policy is in packet + posture.
- Reference/tutorial material repeats policy.
- Historical/session docs sit adjacent and sometimes use normative tone.
3. Duplication risk is non-trivial across packet root, posture overview, axis docs, and E2E conformance sections.
4. Portability friction:
- absolute local file path anchors appear in normative-adjacent docs,
- mixed temporal artifacts are in-path for canonical consumers.

## Role Classification Hypothesis (B)
1. Canonical normative core should be small, explicit, and single-entry.
2. Axis docs should remain normative leaves but stop restating global invariants already defined in core.
3. Posture should be explanatory integration context, not co-equal canonical authority.
4. E2E files should be reference annexes with rule references, not repeated rule text.
5. D008 and route review artifacts should be historical provenance.

## Portability Fitness Hypothesis
Current material is high quality but not yet packaged as a portable canonical bundle because authority is distributed and historical materials are co-located without strict path or metadata fences.

## Design Direction Chosen for B Proposal
Use a 3-layer spec architecture:
1. `canonical/` (normative truth only)
2. `reference/` (examples and explanatory integration)
3. `history/` (session closure, plans, changelogs, review evidence)

No policy change. Only role/placement and link governance changes.

## Migration Safety Principle
Zero meaning loss:
- move/reclassify text, do not delete policy sentences,
- preserve lineage links and redirects,
- convert duplicates to references only after authoritative source is preserved and reachable.
