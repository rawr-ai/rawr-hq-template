# ORPC + Inngest Canonical Spec Reintegration and Packetization Plan

## Summary
We will do this in two execution waves with agent orchestration:
1. **Analysis-only wave** (parallel): identify packet structure and precise integration diff.
2. **Implementation wave** (sequenced): apply integration to canonical spec first, then split into modular spec packet.

No code/runtime edits are in scope; this is documentation architecture convergence.

## Canonical Source of Truth (Locked)
- Canonical spec to update:  
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Recommendation to integrate:  
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## Orchestration Plan (Written Verbatim First)
First action in execution mode:
- Write this plan verbatim to:  
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INGEST_SPEC_REINTEGRATION_PLAN_VERBATIM.md`
- Maintain coordinator scratchpad at:  
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INGEST_REINTEGRATION_ORCHESTRATOR_SCRATCHPAD.md`

## Phase 1 — Parallel Analysis Agents (No Canonical Doc Edits Yet)

### Agent A (Spec Packet / Modularization Proposal)
Ownership:
- Analyze canonical long spec and propose modular packet design.

Inputs:
- Canonical spec doc (above)
- Recommendation doc (above)
- Existing packet conventions in `docs/system/spec-packet/*`
- Relevant skills: `orpc`, `inngest`, `typebox`, `elysia`, `architecture`

Required artifacts:
- Plan verbatim:  
`SESSION_019c587a_AGENT_O_SPEC_PACKET_PLAN_VERBATIM.md`
- Scratchpad:  
`SESSION_019c587a_AGENT_O_SPEC_PACKET_SCRATCHPAD.md`
- Analysis output:  
`SESSION_019c587a_AGENT_O_SPEC_PACKET_MODULARIZATION_PROPOSAL.md`

Deliverable requirements:
- Proposed packet topology (files + responsibilities + cross-links)
- “Bubble-up” overview doc structure tying ORPC + Inngest + package/plugin dynamics
- Rules for where cross-cutting concerns live (to avoid duplication)
- Navigation map (“if you need X, read Y”) for agent/human usability

### Agent B (Integration Diff + Carryover Plan)
Ownership:
- Compute exact integration delta from recommendation -> canonical spec.

Inputs:
- Canonical spec doc (above)
- Recommendation doc (above)
- Relevant related docs only when needed for evidence anchors

Required artifacts:
- Plan verbatim:  
`SESSION_019c587a_AGENT_P_INTEGRATION_PLAN_VERBATIM.md`
- Scratchpad:  
`SESSION_019c587a_AGENT_P_INTEGRATION_SCRATCHPAD.md`
- Analysis output:  
`SESSION_019c587a_AGENT_P_POSTURE_RECOMMENDATION_INTEGRATION_DIFF.md`

Deliverable requirements:
- Matrix: `Area | Current Spec | Recommendation | Action | Keep/Replace/Merge | Evidence`
- Conflict resolution rule application:
  - Recommendation authoritative on conflicts
  - Non-conflicting canonical content retained
- Explicit carryover list of unique examples/snippets/fixtures that must be integrated
- “Do not rewrite whole spec” guardrail with targeted edit plan by section

## Phase 2 — Coordinator Review + Agent Compaction
After both analyses:
1. Coordinator synthesizes both analyses into one execution brief in orchestrator scratchpad.
2. Compact Agent A and Agent B.
3. Freeze a “locked integration checklist” and “locked packetization checklist” before edits begin.

## Phase 3 — Integration Implementation (Agent B First, Compacted)
Agent B executes first, editing only canonical spec:
- Target file:  
`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Scope:
  - Integrate recommendation-layer updates into canonical spec
  - Preserve complementary non-conflicting content
  - Ensure all introduced concepts have code/example or explicit explanation
  - Keep hosting/composition details aligned with canonical scope
- Output:
  - Updated canonical spec
  - Brief “integration change log” section appended to Agent B analysis doc (or new short completion note)

## Phase 4 — Spec Packet Extraction (Agent A Second, Compacted)
After canonical spec is updated, Agent A performs packetization.

Proposed packet location:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/`

Proposed files:
- `ORPC_INGEST_SPEC_PACKET.md` (overview / bubble-up doc)
- `AXIS_01_INTERNAL_PACKAGE_LAYERING.md`
- `AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md`
- `AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md`
- `AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md`
- `AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md`
- `DECISIONS.md` (only if packet-specific unresolved/closed decisions are needed)

Packetization rules:
- Canonical truths come from updated canonical spec
- No contradictory restatements
- Cross-file references must be explicit
- Each file has clear “in scope / out of scope”

## Cleanup Constraint and Process
Cleanup happens only after integration + packetization validation.

Deletion policy:
1. Delete only files we explicitly touched/used in this workflow.
2. Delete only if fully superseded and no unique content remains unintegrated.
3. Never delete unseen/unreviewed files.

Initial cleanup candidates (review-gated):
- `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md` (only after all its unique content is integrated into canonical spec/packet)
- Temporary agent analysis artifacts from Agent O/P only if no longer needed for audit

## Important Interface/Type/Contract Changes to Carry Into Canonical Spec
Documentation-level canonicalization to enforce:
- Internal package authoring shape: `Domain / Service / Procedures / Router+Client+Errors / Index`
- Boundary plugin default: `contract.ts + operations/* + router.ts + index.ts`
- Explicit boundary operation code expectations (no hand-waving)
- Adoption exception policy (high-overlap 1:1 only, explicitly documented)
- Scale rule (split handlers before contracts)
- Clear split semantics: `/api/workflows/...` vs `/api/inngest`
- Required root fixtures and where full internals are defined

## Test Cases and Acceptance Scenarios
1. Canonical spec reflects recommendation where conflict existed.
2. No non-conflicting canonical content was accidentally removed.
3. Every newly introduced file/concept has concrete snippet or explicit explanation.
4. Boundary plugin operations are explicitly illustrated in code.
5. No contradictory statements between canonical spec and packet docs.
6. Packet overview can route readers to the right axis doc in one hop.
7. Cleanup only removes confirmed-superseded docs from encountered set.

## Assumptions and Defaults
1. Canonical leaf spec is `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`.
2. Recommendation doc remains authoritative for conflicting points until integrated.
3. Worktree/branch for execution:  
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal` on `codex/pure-package-e2e-convergence-orchestration`.
4. Analysis phase is non-mutating for canonical docs; only agent scratch/analysis artifacts are created.
5. Implementation sequence is fixed: **Integrate first, packetize second**.
