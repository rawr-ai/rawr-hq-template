# Agent 2 Plan Verbatim (C2 Telemetry Contract Expansion)

## Metadata
- Slice: Phase C / C2
- Branch: `codex/phase-c-c2-telemetry-contract-expansion`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`
- Timestamp: 2026-02-21 04:33:37 -0500

## Objective
Implement telemetry/diagnostics contract expansion so required lifecycle telemetry is structural and hard-fail verified, while preserving existing runtime route-family semantics.

## Non-negotiable execution steps
1. Ground implementation against required phase docs (README, ARCHITECTURE, DECISIONS, PHASE_EXECUTION_WORKFLOW, Phase C packet/spec/gates).
2. Inspect current C2 target surfaces:
   - `packages/coordination-observability/src/events.ts`
   - `packages/coordination-observability/test/observability.test.ts`
   - `scripts/phase-a/verify-gate-scaffold.mjs`
   - `package.json`
3. Identify telemetry contract deltas needed for structural + hard-fail enforcement without changing route-family policy behavior.
4. Implement source changes and tests for required lifecycle telemetry contracts.
5. Update verification/gate scaffolding so required telemetry contract failures fail fast.
6. Run impacted quick/full gate commands (including baseline phase-a gates).
7. Produce evidence-backed final report at required path with:
   - Skills Introspected
   - Evidence Map (absolute paths + line anchors)
   - Assumptions
   - Risks
   - Unresolved Questions

## Guardrails
- Do not alter runtime route-family semantics.
- Do not revert unrelated workspace edits.
- Keep changes scoped to C2 acceptance and impacted gate chain only.
- Maintain scratchpad with timestamped activity log throughout execution.
