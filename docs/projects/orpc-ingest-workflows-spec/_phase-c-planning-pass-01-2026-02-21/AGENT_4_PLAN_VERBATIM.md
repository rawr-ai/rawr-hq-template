# AGENT 4 Plan Verbatim

Role: P4 (Phase C steward / arbitration reviewer)
Mode: Review-only (no alternate plan tracks)
Goal: Decide whether the Phase C packet is execution-ready and drift-safe.

## Verbatim Plan
1. Complete mandatory introspection of required skills and prompts, then lock review criteria from those artifacts.
2. Read the full baseline corpus (README, architecture/decisions/workflow, axis doc, Phase B readiness) to establish authoritative intent and constraints.
3. Read integrated Phase C planning docs (execution packet, implementation spec, acceptance gates, workbreakdown YAML) and evaluate internal consistency, scope control, and decision completeness.
4. Read specialist inputs (Agent 1-3 outputs) and verify whether integrated docs faithfully absorb their required constraints and recommendations.
5. Build an evidence-backed findings list with severity ranking (`blocking`, `high`, `medium`, `low`), each item including impacted file(s), precise anchor lines, risk, and concrete correction.
6. Produce a final disposition (`approve` | `approve_with_changes` | `not_ready`) based on execution readiness and drift safety.
7. Write required deliverables:
   - `AGENT_4_SCRATCHPAD.md` (timestamped notes throughout review)
   - `AGENT_4_REVIEW_REPORT.md` (Skills Introspected, Evidence Map, Assumptions, Risks, Unresolved Questions, severity-ranked actionable findings, disposition).

## Review Standard
- No silent gaps between target-state requirements and planned work.
- Acceptance gates must be executable, measurable, and ownership-scoped.
- Sequencing must prevent unsafe intermediate states and reduce drift risk.
- Information design must support implementer pickup with minimal ambiguity.
