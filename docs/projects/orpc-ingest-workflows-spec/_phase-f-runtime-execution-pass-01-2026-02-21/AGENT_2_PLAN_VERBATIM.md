# Agent 2 Plan Verbatim (F2 Interface/Policy Hardening)

## Role
I2 execution scope for `F2` interface/policy hardening on `codex/phase-f-f2-interface-policy-hardening`.

## Required Skills Introspection
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`

## Grounding
1. Runtime packet/order/invariants:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_F_PREP_NOTE.md`
2. F2 planning packet sources (from planning branch via `git show`):
- `codex/phase-f-planning-packet:docs/projects/orpc-ingest-workflows-spec/PHASE_F_EXECUTION_PACKET.md`
- `codex/phase-f-planning-packet:docs/projects/orpc-ingest-workflows-spec/PHASE_F_IMPLEMENTATION_SPEC.md`
- `codex/phase-f-planning-packet:docs/projects/orpc-ingest-workflows-spec/PHASE_F_ACCEPTANCE_GATES.md`
- `codex/phase-f-planning-packet:docs/projects/orpc-ingest-workflows-spec/PHASE_F_WORKBREAKDOWN.yaml`
3. F1 runtime outcome context:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_1_FINAL_F1_RUNTIME_LIFECYCLE_SEAMS.md`

## Scope Lock (F2 Only)
1. Tighten interface/policy contract surfaces with additive posture.
2. No route-family drift.
3. No manifest-authority drift.
4. No channel semantics drift.
5. No architecture pivot.

## Target Paths
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/ids.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/types.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/contract.ts` (no change expected unless routing metadata requires)
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/runtime-router.ts`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/test/orpc-contract-drift.test.ts`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/test/workflow-trigger-contract-drift.test.ts`

## Execution Plan
1. Centralize coordination ID policy constants/normalization in `packages/coordination/src/ids.ts`.
2. Thread ID aliasing into coordination public types in `packages/coordination/src/types.ts` without breaking additive compatibility.
3. Encode ID policy into TypeBox contract schemas in `packages/coordination/src/orpc/schemas.ts`:
- canonical persisted ID schema (`CoordinationIdSchema`)
- trim-compatible input schema (`CoordinationIdInputSchema`)
4. Keep route and operation topology unchanged in coordination contracts.
5. Add additive state contract field for F1 seam observability (`authorityRepoRoot`) in `packages/state/src/orpc/contract.ts` and wire it in `packages/core/src/orpc/runtime-router.ts`.
6. Tighten drift tests to assert F2 policy behavior via established schema-validation path (TypeBox standard schema adapter).
7. If `bun run typecheck` fails due F2 deltas outside targeted files, apply minimal type-safe adjustment only.

## Required Verification Commands
1. `bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts packages/core/test/workflow-trigger-contract-drift.test.ts`
2. `bunx vitest run --project core packages/core/test/runtime-router.test.ts`
3. `bun run typecheck`

## Required Runtime Artifacts
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_2_PLAN_VERBATIM.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_2_SCRATCHPAD.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/AGENT_2_FINAL_F2_INTERFACE_POLICY_HARDENING.md`
