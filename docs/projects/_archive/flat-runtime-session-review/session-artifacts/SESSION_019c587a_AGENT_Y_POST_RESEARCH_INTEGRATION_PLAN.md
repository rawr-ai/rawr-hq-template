# SESSION_019c587a — Agent Y Post-Research Integration Plan

## Scope
Integrate Agent X context+middleware research into the ORPC+Inngest packet docs without changing locked split architecture posture.

## Required Inputs
1. `SESSION_019c587a_AGENT_X_CONTEXT_MIDDLEWARE_RESEARCH_FINDINGS.md`
2. `orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
3. Owned packet/posture docs listed in handoff.

## Guardrails
1. Keep split architecture posture unchanged while enforcing the locked schema ownership rule:
   - procedure I/O schemas live with procedures or boundary contracts,
   - `domain/*` owns transport-independent concepts only,
   - request/correlation/principal/network metadata contracts belong in `context.ts`.
2. Avoid unrelated edits and do not touch non-owned files.
3. Add source anchors only where policy language was strengthened.
4. No commit in this phase.

## Execution Checklist
- [x] Add `E2E_04` to packet/posture walkthrough navigation.
- [x] Clarify two context envelopes in Axis 04 (boundary context vs runtime context).
- [x] Clarify middleware control-plane separation in Axis 06.
- [x] Add middleware dedupe caveats in Axis 06 (built-in constraints + explicit context-cached pattern).
- [x] Strengthen split path enforcement in Axis 08.
- [x] Apply priority correction lock for schema/context ownership across policy text and snippets.
- [x] Refresh `DECISIONS.md` with post-research open questions (extended traces order, dedupe mandate level, finished-hook guardrail).
- [x] Record rationale/checkpoints in Agent Y scratchpad.

## Primary Source Anchors Used
- https://orpc.dev/docs/context
- https://orpc.dev/docs/procedure
- https://orpc.dev/docs/contract-first/define-contract
- https://orpc.dev/docs/middleware
- https://orpc.dev/docs/best-practices/dedupe-middleware
- https://www.inngest.com/docs/reference/serve
- https://www.inngest.com/docs/reference/functions/create
- https://www.inngest.com/docs/reference/functions/step-run
- https://www.inngest.com/docs/reference/middleware/lifecycle
- https://www.inngest.com/docs/reference/typescript/extended-traces
