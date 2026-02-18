# SESSION_019c587a ORPC+Inngest Reintegration Orchestrator Scratchpad

## Objective
Execute the approved plan in strict sequence:
1. parallel analysis (Agent O + Agent P),
2. compact + freeze checklists,
3. integration update,
4. packet extraction,
5. cleanup review.

## Canonical Inputs
- Canonical spec: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Recommendation: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## Phase 1 Results (Completed)
- Agent O output: `SESSION_019c587a_AGENT_O_SPEC_PACKET_MODULARIZATION_PROPOSAL.md`
- Agent P output: `SESSION_019c587a_AGENT_P_POSTURE_RECOMMENDATION_INTEGRATION_DIFF.md`

Coordinator synthesis:
1. Canonical spec remains normative source; recommendation content is integrated where conflicts exist.
2. Only direct replacement required: internal package default topology.
3. All other recommendation deltas are additive merges (operations layer, examples, fixtures, adoption exception, scale rule).
4. Packet extraction should map into `docs/system/spec-packet` structure with `SPEC_01...SPEC_08` modular ownership and a thin overview.
5. Integration must be section-targeted (no wholesale rewrite).

## Locked Integration Checklist (Freeze)
1. Update Section 4 with explicit `Adoption Exception` and `Scale Rule` subsections.
2. Update Section 5 inventory + tree to internal layered package default and plugin `operations/*` defaults.
3. Add concise internal package default subsection with complete layered example coverage.
4. Add boundary API plugin default subsection with explicit operations code examples.
5. Add workflow trigger plugin + Inngest split subsection with operation + durable function separation.
6. Add required root fixtures subsection (adapter package, `rawr.hq.ts`, concise host fixture) with pointer to deeper canonical internals.
7. Update Section 6 examples A/B to operation-layer pattern; keep C and mount semantics.
8. Update Section 7 anchors to include integrated recommendation.
9. Append integration change log to Agent P doc.
10. Run contradiction pass: no conflicts with split harness, durability additive-only rule, or canonical host internals.

## Locked Packetization Checklist (Freeze)
1. Create `SPEC_01...SPEC_08` modular docs under `docs/system/spec-packet/`.
2. Keep `FLAT_RUNTIME_SPEC_PACKET.md` as thin entrypoint + navigation index.
3. Keep `DECISIONS.md` as sole decision-closure register.
4. Assign one canonical concern owner per spec doc; eliminate policy duplication.
5. Mark examples doc as non-normative and link every example back to policy owner docs.
6. Ensure explicit cross-links and “if you need X, read Y” routing map.
7. Ensure no contradiction between packet files and updated canonical posture spec.

## Cleanup Guardrail (Locked)
- No deletions until integration + packetization validation passes.
- Delete only files explicitly touched/used and fully superseded.
- Preserve audit artifacts until final review.
