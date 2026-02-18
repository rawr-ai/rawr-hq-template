# SESSION_019c587a_AGENT_REFERENCE_RESHAPE_EXEC_PLAN_VERBATIM

## Role and Ownership
- Agent role: Reference/example reshape execution.
- Owned output files only:
  - `docs/projects/flat-runtime/examples/*.md`
  - `docs/projects/flat-runtime/_session-lineage/README.md`
- Additional mandatory control artifacts:
  - This plan file
  - `SESSION_019c587a_AGENT_REFERENCE_RESHAPE_EXEC_SCRATCHPAD.md`

## Mission Lock
Reshape and reword for clarity only. Preserve implementation-legible examples. Do not introduce policy/spec drift. Do not edit outside owned scope.

## Required Inputs Read
1. Skills:
   - `information-design`
   - `docs-architecture`
   - `architecture`
   - `deep-search`
   - `decision-logging`
2. Official spec corpus:
   - `orpc-ingest-spec-packet/*.md`
   - `orpc-ingest-spec-packet/examples/*.md`
   - `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
3. Reshape inputs:
   - `RESHAPE_PROPOSAL.md`
   - `CANONICAL_ASSESSMENT.md`
   - `_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
   - `_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
   - `_RESHAPE_PLAN_PACKET_INTERIOR.md`
   - `SESSION_019c587a_AGENT_RESHAPE_REVIEW_A.md`
   - `SESSION_019c587a_AGENT_RESHAPE_REVIEW_B.md`

## Execution Steps
1. Create target directories:
   - `docs/projects/flat-runtime/examples/`
   - `docs/projects/flat-runtime/_session-lineage/`
2. Generate renamed examples from legacy E2E sources:
   - `E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` -> `e2e-01-basic-package-api.md`
   - `E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md` -> `e2e-02-api-workflows-composed.md`
   - `E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md` -> `e2e-03-microfrontend-integration.md`
   - `E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md` -> `e2e-04-context-middleware.md`
3. Apply clarity-only reshape improvements in examples:
   - Add `Key Axes Covered` section near the top of each example.
   - Add bridge notes indicating what the next example adds (E2E_01->02, 02->03, 03->04).
   - Replace full file tree blocks in E2E_02/E2E_03/E2E_04 with diff-view trees and explicit pointer to E2E_01 full tree.
   - Keep code snippets implementation-legible and semantically unchanged.
4. Create `docs/projects/flat-runtime/_session-lineage/README.md`:
   - Mark directory as non-normative history/context.
   - Explain how to use lineage docs without treating them as policy authority.
5. Verify no-drift safety:
   - Headings and bridge notes must not introduce new requirements.
   - Route/auth/ownership policy statements remain descriptive of existing canonical policy.
   - Code-fence parity check spot-validation against source E2Es.

## Acceptance Criteria
- All owned files exist and are populated.
- Example docs are clearer to navigate while preserving code utility.
- No policy language changes beyond neutral reference framing.
- Deliverable includes mapping table and explicit no-drift risk notes.

## Boundaries
- No edits to axis docs, architecture docs, decisions docs, or non-owned lineage files.
- No archive/move operations outside generated owned outputs.
