# Axis Info-Design Review Team Plan (Pass 01)

## Objective
Run a specialized information-design review across the full ORPC+Inngest spec packet (all canonical docs and axes), with emphasis on:
1. policy clarity,
2. axis-level comprehensibility,
3. reducing cognitive overload from long canonical policy lists,
4. evaluating whether each axis needs a clear introductory framing section,
5. using Axis 12 patterns as reference quality.

## Team Design and Management Model
- Small, parallel, independent reviewers with explicit ownership and overlapping scope only where needed for quality challenge.
- Each reviewer has autonomy and judgment authority; instructions define goals/constraints, not rigid steps.
- Deliverables are structured and comparable to avoid synthesis ambiguity.
- Orchestrator performs contradiction arbitration and outputs a single integrated recommendation.

## Team Topology
- Agent IDR-1 (Primary): Full-packet information architecture audit; identifies structure problems and proposes concrete structural remediations.
- Agent IDR-2 (Independent challenger): Re-reads full packet independently; validates/challenges IDR-1, with focus on policy grouping, intro framing, and readability at scan-time.

## Mandatory Agent Protocol
For each agent:
1. Write plan immediately and verbatim.
2. Maintain timestamped scratchpad continuously.
3. Introspect required skills before substantive analysis.
4. Read full packet (canonical docs + all axes + examples) before final conclusions.
5. Final report includes: Skills Introspected, Evidence Map, Assumptions, Risks, Unresolved Questions.

## Required Skills (both agents)
- information-design
- solution-design
- system-design
- domain-design
- api-design
- docs-architecture

## Pass Artifacts
- ORCHESTRATOR_PLAN_VERBATIM.md
- ORCHESTRATOR_SCRATCHPAD.md
- INTEGRATED_INFO_DESIGN_REVIEW.md
- AXIS_INTRO_TEMPLATE.md
- PRIORITIZED_REWRITE_PLAN.md
- REVIEW_DISPOSITION.md

## Agent Outputs
- AGENT_IDR_1_PLAN_VERBATIM.md
- AGENT_IDR_1_SCRATCHPAD.md
- AGENT_IDR_1_FINAL_INFO_DESIGN_AUDIT.md
- AGENT_IDR_2_PLAN_VERBATIM.md
- AGENT_IDR_2_SCRATCHPAD.md
- AGENT_IDR_2_FINAL_REVIEW_CHALLENGE.md
