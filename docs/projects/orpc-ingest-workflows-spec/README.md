# ORPC + Inngest Workflows Specification Packet

## Scope
This directory is the canonical packet for ORPC + Inngest workflow architecture posture in this initiative. It keeps one integrative policy source while preserving leaf-policy depth and reference examples.

## Document Role Boundaries
1. `README.md` — packet entrypoint, inventory, and read order.
2. `ARCHITECTURE.md` — normative integrative architecture policy (global invariants + canonical caller/auth matrix authority).
3. `DECISIONS.md` — normative decision register (locked/open decision status and authority IDs).
4. `axes/*.md` — normative leaf policy slices by concern.
5. `CANONICAL_EXPANSION_NAV.md` — concern-based expansion router (D-013/D-014/D-015/D-016, downstream update routing).
6. `examples/*.md` — reference walkthroughs (non-normative).
7. `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` — implementation-adjacent downstream update contract.
8. `PHASE_A_EXECUTION_PACKET.md` — canonical Phase A execution entrypoint (slice order, ownership, gates, exit criteria).
9. `PHASE_A_IMPLEMENTATION_SPEC.md` — deep Phase A implementation specification (architecture context, file structures, seam examples).
10. `PHASE_EXECUTION_WORKFLOW.md` — reusable multi-phase execution loop (agent prep, verification/fix loops, drift guards).
11. `PHASE_B_PLANNING_RUNBOOK_DRAFT.md` — draft runbook lineage (superseded by finalized Phase B planning packet docs).
12. `PHASE_B_EXECUTION_PACKET.md` — canonical Phase B execution entrypoint.
13. `PHASE_B_IMPLEMENTATION_SPEC.md` — deep Phase B implementation specification.
14. `PHASE_B_ACCEPTANCE_GATES.md` — Phase B gate cadence and exit contract.
15. `PHASE_B_WORKBREAKDOWN.yaml` — machine-readable Phase B slice/owner/file/gate map.
16. `PHASE_B_REVIEW_DISPOSITION.md` — planning review disposition and kickoff conditions (pre-implementation lineage).
17. `_phase-b-runtime-execution-pass-01-2026-02-20/*` — runtime execution closure artifacts (review disposition, cleanup manifest, readiness, execution report, handoff).
18. `PHASE_C_PLANNING_RUNBOOK_DRAFT.md` — historical prep runbook lineage for Phase C planning.
19. `PHASE_C_EXECUTION_PACKET.md` — canonical Phase C execution entrypoint.
20. `PHASE_C_IMPLEMENTATION_SPEC.md` — deep Phase C implementation specification.
21. `PHASE_C_ACCEPTANCE_GATES.md` — Phase C gate cadence and exit contract.
22. `PHASE_C_WORKBREAKDOWN.yaml` — machine-readable Phase C slice/owner/file/gate map.
23. `PHASE_C_REVIEW_DISPOSITION.md` — planning review disposition and readiness decision for runtime kickoff.
24. `PHASE_C_PLANNING_HANDOFF.md` — planning-to-runtime handoff contract for Phase C execution.
25. `_phase-c-runtime-execution-pass-01-2026-02-21/*` — runtime execution closure artifacts (execution report, review disposition, cleanup manifest, readiness, final handoff).
26. `PHASE_D_PLANNING_RUNBOOK_DRAFT.md` — prep runbook for the upcoming Phase D planning pass.
27. `PHASE_D_EXECUTION_PACKET.md` — canonical Phase D execution entrypoint.
28. `PHASE_D_IMPLEMENTATION_SPEC.md` — deep Phase D implementation specification.
29. `PHASE_D_ACCEPTANCE_GATES.md` — Phase D gate cadence and exit contract.
30. `PHASE_D_WORKBREAKDOWN.yaml` — machine-readable Phase D slice/owner/file/gate map.
31. `PHASE_D_REVIEW_DISPOSITION.md` — planning review disposition and readiness decision for runtime kickoff.
32. `PHASE_D_PLANNING_HANDOFF.md` — planning-to-runtime handoff contract for Phase D execution.
33. `_phase-d-runtime-execution-pass-01-2026-02-21/*` — runtime execution closure artifacts (D4/D5/D5A dispositions and final closure outputs).

The canonical caller/auth matrix is defined in `ARCHITECTURE.md` only; matrix variants in leaf docs are contextual views.

## If You Need X, Read Y
- Canonical locked subsystem posture and caller/auth matrix: `ARCHITECTURE.md`
- Open vs closed decisions and decision IDs: `DECISIONS.md`
- Concern-based D-013/D-014/D-015/D-016 routing: `CANONICAL_EXPANSION_NAV.md`
- Phase A execution order and operator view: `PHASE_A_EXECUTION_PACKET.md`
- Phase A deep implementation detail: `PHASE_A_IMPLEMENTATION_SPEC.md`
- Phase A landed runtime status + review/docs closure snapshots: `PHASE_A_EXECUTION_PACKET.md` ("As-Landed Snapshot"), `PHASE_A_IMPLEMENTATION_SPEC.md` ("Current Runtime Reality (as-landed)")
- Reusable phase workflow and drift controls: `PHASE_EXECUTION_WORKFLOW.md`
- Phase B canonical execution entrypoint: `PHASE_B_EXECUTION_PACKET.md`
- Phase B deep implementation contract: `PHASE_B_IMPLEMENTATION_SPEC.md`
- Phase B gate cadence and exit contract: `PHASE_B_ACCEPTANCE_GATES.md`
- Phase B slice/owner/file map: `PHASE_B_WORKBREAKDOWN.yaml`
- Phase B planning kickoff disposition (historical): `PHASE_B_REVIEW_DISPOSITION.md`
- Phase B landed runtime closure artifacts (`B0..B6`): `_phase-b-runtime-execution-pass-01-2026-02-20/`
- Phase C kickoff readiness output from B6: `_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md`
- Phase C planning prep runbook draft: `PHASE_C_PLANNING_RUNBOOK_DRAFT.md`
- Phase C canonical execution entrypoint: `PHASE_C_EXECUTION_PACKET.md`
- Phase C deep implementation spec: `PHASE_C_IMPLEMENTATION_SPEC.md`
- Phase C gates contract: `PHASE_C_ACCEPTANCE_GATES.md`
- Phase C work breakdown map: `PHASE_C_WORKBREAKDOWN.yaml`
- Phase C planning review disposition: `PHASE_C_REVIEW_DISPOSITION.md`
- Phase C planning handoff to runtime: `PHASE_C_PLANNING_HANDOFF.md`
- Phase C landed runtime closure artifacts (`C1..C7`): `_phase-c-runtime-execution-pass-01-2026-02-21/`
- Phase D planning prep runbook draft: `PHASE_D_PLANNING_RUNBOOK_DRAFT.md`
- Phase D canonical execution entrypoint: `PHASE_D_EXECUTION_PACKET.md`
- Phase D deep implementation spec: `PHASE_D_IMPLEMENTATION_SPEC.md`
- Phase D gates contract: `PHASE_D_ACCEPTANCE_GATES.md`
- Phase D work breakdown map: `PHASE_D_WORKBREAKDOWN.yaml`
- Phase D planning review disposition: `PHASE_D_REVIEW_DISPOSITION.md`
- Phase D planning handoff to runtime: `PHASE_D_PLANNING_HANDOFF.md`
- Phase D runtime closure artifacts (`D1..D7`): `_phase-d-runtime-execution-pass-01-2026-02-21/`
- Full leaf-policy by concern: `axes/*.md` (see axis index below)
- Example walkthroughs only (non-normative): `examples/*.md`

## Axis Index (Normative Leaf Policy)
1. `axes/01-external-client-generation.md`
2. `axes/02-internal-clients.md`
3. `axes/03-split-vs-collapse.md`
4. `axes/04-context-propagation.md`
5. `axes/05-errors-observability.md`
6. `axes/06-middleware.md`
7. `axes/07-host-composition.md`
8. `axes/08-workflow-api-boundaries.md`
9. `axes/09-durable-endpoints.md`
10. `axes/10-legacy-metadata-and-lifecycle-simplification.md`
11. `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`
12. `axes/12-testing-harness-and-verification-strategy.md`
13. `axes/13-distribution-and-instance-lifecycle-model.md`

## Reference Walkthroughs (Non-Normative)
1. `examples/e2e-01-basic-package-api.md`
2. `examples/e2e-02-api-workflows-composed.md`
3. `examples/e2e-03-microfrontend-integration.md`
4. `examples/e2e-04-context-middleware.md`

## Source Preservation Note
This packet is a clarity/authority reshape. Policy meaning is preserved from:
- `ARCHITECTURE.md` (integrative canonical source)
- `DECISIONS.md` (decision register source)
- `../_archive/orpc-ingest-workflows-spec/session-lineage-from-ongoing/redistribution-traceability.md` (lineage/provenance map)
