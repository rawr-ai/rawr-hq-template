# SESSION_019c587a — Inngest vs oRPC Debate (Orchestrator Scratchpad)

## Mission
Produce an integrated recommendation for a single standardized direction, after adversarial agent research:
- Agent A: Keep split API plugin + workflows plugin; harden to one standard.
- Agent B: Collapse to one API plugin surface; prove or refute.
- Agent C: Internal-calling/package/workflow placement standardization.

## Required Axes (must be used by each agent)
1. External client generation standard (single way across system).
2. Internal clients / internal calling standard (single way or explicit clean combo rule).
3. Context creation and propagation model (oRPC vs Inngest vs composition boundary).
4. Errors, logging, observability model (avoid double instrumentation).
5. Middleware/cross-cutting concerns placement.

## Overlap Scope
Focus overlap/special case where workflows are exposed as API surface. Not all endpoints are workflows.

## Research Requirements
- Mandatory skill introspection: orpc, inngest, elysia, typebox, typescript, architecture, web-search.
- Web research required: official docs + repo sources; citations mandatory.
- Keep plan doc + scratchpad per agent before final report.

## Deliverables
- A/B/C final docs
- Integrated comparison matrix + recommendation (by orchestrator)
- Clear decision: primary harness + additive harness boundaries + one standardized authoring path.

## Notes Log
- [pending] agent launches
- [pending] evidence ingestion
- [pending] integrated decision

## Integration Status Update
- Agent I complete: split/harden recommendation generated.
- Agent J complete: collapse tested and rejected.
- Agent K complete: internal-calling/package boundary recommendation generated.
- Integrated synthesis written to:
  - `SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md`

## Explicit later-integration reminder
- Agent H DX simplification review remains review-only and is not yet merged into canonical E2E doc.
- Agent I/J/K recommendations are also not yet merged into canonical E2E doc.
