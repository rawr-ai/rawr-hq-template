# Portable Canonical Spec Information Redesign — Agent-Orchestrated Execution Plan

## Summary
Redesign the ORPC/Inngest specification set into a **standalone, portable canonical spec system** that is easy to implement from, without turning docs into an execution plan.  
This plan uses a **synthesis-first, parallel-redesign, integrator-final** model with strict file ownership to avoid conflicts.

Key strategy:
1. Create one authoritative **converged direction** doc first.
2. Run parallel redesign agents by subsystem/doc-role.
3. Run one integrator + one steward pass for final coherence.
4. Archive superseded scratch/notes after final integration.

---

## Agent Team (6 total, role-separated)
1. **Agent S (Synthesis Owner)** — builds the converged direction doc.
2. **Agent C (Canonical Core Owner)** — root normative docs only.
3. **Agent A (Annex Owner)** — axis docs only.
4. **Agent R (Reference Owner)** — posture + examples + reference framing.
5. **Agent I (Integrator Owner)** — cross-doc composition and final consistency.
6. **Agent V (Steward/Validator)** — independent information-design quality gate.

No agent may edit outside assigned ownership except Integrator and Steward (and only in their designated phases).

---

## Mandatory Context Shaping for Every Agent
Before any edits, each agent must:
1. Introspect `information-design` skill and references (including `info:assess` workflow intent).
2. Read **all current spec docs** in:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
3. Read converged direction doc (once created) and treat it as binding design guidance.
4. Maintain a scratchpad while working.

---

## Phase 0 — Setup and Inputs Lock
## Outputs
- `.../SESSION_019c587a_INFO_DESIGN_REDESIGN_PLAN_VERBATIM.md`
- `.../SESSION_019c587a_INFO_DESIGN_REDESIGN_ORCHESTRATOR_SCRATCHPAD.md`
- `.../SESSION_019c587a_INFO_DESIGN_CONTEXT_PACKET.md`

## Context packet must lock
- Objective: portable canonical spec, implementation-legible by structure.
- Non-goal: converting docs into implementation plans.
- Canonical policy remains unchanged (no architecture policy invention in this redesign pass).
- Role taxonomy (introduced below) is mandatory.

---

## Phase 1 — Converged Direction (Agent S, single-threaded first)
Use existing analyses as inputs:
- `.../SESSION_019c587a_INFO_DESIGN_ANALYSIS.md`
- `.../SESSION_019c587a_INFO_DESIGN_PROPOSAL_RECOMMENDATION.md`
- `.../SESSION_019c587a_INFO_DESIGN_ANALYSIS_B.md`
- `.../SESSION_019c587a_INFO_DESIGN_PROPOSAL_RECOMMENDATION_B.md`

## Output (comprehensive synthesis)
- `.../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`

## Required content
1. Canonical authority model (single normative center).
2. Artifact role taxonomy:
   - `Normative Core`
   - `Normative Annex`
   - `Reference`
   - `Historical/Provenance`
3. Single-source ownership map (what is defined once vs referenced).
4. Portable-linking rules (no machine-local absolute paths in canonical layer).
5. Migration blueprint from current state to target state.
6. “What remains unchanged” (architectural policies preserved).

After this doc exists, it becomes the design source for all subsequent agent work.

---

## Phase 2 — Parallel Redesign (Agents C, A, R)
All three run in parallel after Phase 1.

## Shared deliverables per agent
- `<agent>_PLAN_VERBATIM.md`
- `<agent>_SCRATCHPAD.md`
- Edited docs in assigned ownership only.

### Agent C — Canonical Core Owner
## Owns
- `/.../orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- `/.../orpc-ingest-spec-packet/DECISIONS.md`
- Create:
  - `/.../orpc-ingest-spec-packet/CANONICAL_ROLE_CONTRACT.md`
  - `/.../orpc-ingest-spec-packet/CANONICAL_READ_PATH.md`

## Responsibilities
- Make one unambiguous canonical entrypoint and read order.
- Single-source global invariants and caller/transport matrices.
- Add explicit role metadata blocks to core docs.

### Agent A — Annex Owner
## Owns
- `/.../orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `/.../orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `/.../orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
- `/.../orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `/.../orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
- `/.../orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `/.../orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `/.../orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `/.../orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`

## Responsibilities
- Convert each axis doc to true annex behavior:
  - explicit dependency on core sections,
  - axis-specific deltas only,
  - remove duplicated global policy restatements (replace with references).

### Agent R — Reference Owner
## Owns
- `/.../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `/.../orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
- `/.../orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- `/.../orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- `/.../orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- `/.../orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`

## Responsibilities
- Fence examples as `Reference` (non-normative unless explicitly tagged).
- Preserve all detail, but improve signal-to-noise and mapping to canonical invariants.
- Reframe posture doc as integration overview/reference (not competing canonical core).
- Normalize portability (remove absolute local path anchors from canonical/reference docs where applicable).

---

## Phase 3 — Integration Composition (Agent I)
Runs after C/A/R finish.

## Owns
- Cross-file link coherence and doc-system composition.
- May touch any redesigned spec file only for integration fixes.

## Creates
- `.../SESSION_019c587a_INFO_DESIGN_INTEGRATION_CHANGELOG.md`
- `.../SESSION_019c587a_INFO_DESIGN_FILE_ROLE_MATRIX.yaml`

## Responsibilities
1. Merge parallel outputs into one cohesive set.
2. Resolve cross-agent conflicts without changing architectural meaning.
3. Ensure read path works from canonical entrypoint through annexes and references.
4. Validate role taxonomy is consistently applied.

---

## Phase 4 — Independent Steward Review (Agent V)
Runs after Integrator.

## Creates
- `.../SESSION_019c587a_INFO_DESIGN_FINAL_REVIEW.md`

## Required gates (all must pass)
1. One clear canonical entrypoint exists.
2. Every doc has explicit role (`Normative Core/Annex/Reference/Historical`).
3. Global invariants are single-sourced.
4. Annexes avoid policy duplication and point back to core.
5. Examples are reference-fenced and still comprehensive.
6. No canonical docs rely on machine-local absolute paths.
7. Reader can identify “what is policy” vs “what is illustration” in first screen of each document.
8. No architecture policy drift introduced.

Steward may apply minimal safe fixes only.

---

## Phase 5 — Cleanup / Archive (post-review only)
Move superseded notes/scratch artifacts to existing archive location:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/session-artifacts/`

## Keep active
- Canonical redesigned packet docs
- Converged direction doc
- Final integration changelog
- Final steward review

## Archive candidates
- Info-design scratchpads
- Interim analysis/proposal drafts superseded by converged direction + integrated final set

---

## Important Changes to Public Interfaces / Types
No runtime APIs/types change.  
Documentation interface changes introduced:
1. **Role metadata contract** for each spec doc (`Core/Annex/Reference/Historical`).
2. **Single canonical read path contract** (`CANONICAL_READ_PATH.md`).
3. **Single-source invariant ownership contract** (core defines, annex/reference links).

---

## Test Cases and Scenarios
1. **Portable Canonical Test**
- Copy canonical packet folder into another repo; core read path and links still work.
2. **Authority Clarity Test**
- Reader can identify canonical source within 30 seconds.
3. **Duplication Drift Test**
- Any global policy statement appears once in core; annex copies are replaced by references.
4. **Example Boundary Test**
- E2E docs provide implementation clarity without becoming policy authority.
5. **Historical Isolation Test**
- Session/provenance docs are discoverable but do not compete with canonical read path.

---

## Assumptions and Defaults
1. Keep current filesystem root and packet location; redesign is role-based first (no mandatory directory renames in this pass).
2. Architectural policy content from D-005..D-010 remains intact unless clarifying language is needed for information design.
3. Existing two independent info-design assessments are sufficient input for convergence.
4. Integrator is the sole conflict-resolver for cross-agent overlap.
5. This pass is documentation-only and can be committed in staged Graphite commits by phase.
