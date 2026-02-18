# Session 019c587a — Agent O Spec Packet Plan (Verbatim)

## Scope

Produce an analysis-only, decision-complete modularization proposal for the flat runtime spec packet.
No canonical spec doc edits in this phase.

## Inputs (Required)

1. `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
2. `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`
3. `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`
4. `docs/system/spec-packet/DECISIONS.md`

## Skills Baseline Applied

- `architecture` for packet decomposition and decision-ordering discipline.
- `orpc`, `inngest`, `typebox`, `elysia` for runtime-harness boundary correctness.

## Work Plan

1. Extract locked decisions and invariants from current canonical packet docs.
2. Extract normative harness boundaries from posture + integrated recommendation docs.
3. Build a modular packet topology that separates:
   - baseline architecture,
   - harness-specific policy,
   - composition contract,
   - cross-cutting placement,
   - migration/validation,
   - examples.
4. Define anti-duplication placement rules for cross-cutting concerns.
5. Produce a navigation map (`if you need X, read Y`) for operators, implementers, and reviewers.
6. Define in-scope / out-of-scope boundaries for every proposed packet doc.
7. Add extraction-ready mapping from current source docs into proposed packet docs.

## Decision Rules Used

1. Keep current, target, and transition concerns separated.
2. Keep one canonical home per policy concern.
3. Keep examples non-normative; link to policy docs instead of repeating policy text.
4. Keep external API contract policy and durable workflow policy explicitly split.
5. Preserve existing closed/deferred decision IDs without rewording intent.

## Deliverables

1. `SESSION_019c587a_AGENT_O_SPEC_PACKET_PLAN_VERBATIM.md` (this file)
2. `SESSION_019c587a_AGENT_O_SPEC_PACKET_SCRATCHPAD.md`
3. `SESSION_019c587a_AGENT_O_SPEC_PACKET_MODULARIZATION_PROPOSAL.md`

## Acceptance Criteria

1. Proposed topology includes file-level responsibilities and cross-links.
2. Bubble-up overview structure covers ORPC + Inngest + package/plugin dynamic.
3. Cross-cutting placement rules are explicit and non-overlapping.
4. Navigation map supports fast routing for common implementation questions.
5. Each proposed packet doc has clear in-scope and out-of-scope boundaries.
6. Proposal is implementation-ready for the extraction phase without new architectural ambiguity.
