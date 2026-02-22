# Phase E Execution Packet

## Start Here (Single Entrypoint)
This is the canonical Phase E execution packet.

Execute in this order:
1. `E0 -> E1 -> E2 -> E3 -> E4 -> E5 -> E5A -> E6 -> E7`
2. Do not start a slice until dependency slices are green.
3. Forward-only posture: fix failing slices in place; no rollback track.
4. `E4` is mandatory decision closure with explicit triggered/deferred disposition.
5. `E5` independent review/fix closure is mandatory before structural/docs closure.
6. `E5A` structural assessment is mandatory before docs/cleanup.

## Objective
Evidence-close D-009 and D-010 now by landing concrete middleware/finished-hook hardening, cleanup-safe evidence gates, and explicit decision closure artifacts without route-topology or runtime-semantics drift.

## Entry State
1. D7 readiness posture is `ready`: `docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21/D7_PHASE_E_READINESS.md`.
2. Phase D closure artifacts and carry-forward watchpoints exist.
3. Phase E planning packet and steward disposition are complete before runtime kickoff.

## Locked Constraints (No Re-open in Phase E)
1. Runtime semantics: `rawr.kind + rawr.capability + manifest registration` only.
2. Route-family semantics unchanged.
3. `rawr.hq.ts` remains composition authority.
4. D-013 hard deletion remains enforced.
5. D-014/D-015/D-016 remain in force.

## Slice Plan

### E0 - Planning Closure + G1.5 Steward Drift Check
- Owner: `@rawr-phase-sequencing`
- Depends on: D7 readiness
- Outputs:
  - `PHASE_E_EXECUTION_PACKET.md`
  - `PHASE_E_IMPLEMENTATION_SPEC.md`
  - `PHASE_E_ACCEPTANCE_GATES.md`
  - `PHASE_E_WORKBREAKDOWN.yaml`
  - `PHASE_E_REVIEW_DISPOSITION.md`
  - `PHASE_E_PLANNING_HANDOFF.md`

### E1 - Dedupe Policy Hardening
- Owner: `@rawr-runtime-host`
- Depends on: `E0`
- Runtime paths:
  - `apps/server/src/workflows/context.ts`
  - `apps/server/src/orpc.ts`
  - `apps/server/test/middleware-dedupe.test.ts`
  - `scripts/phase-e/verify-e1-dedupe-policy.mjs`

### E2 - Finished-Hook Policy Hardening
- Owner: `@rawr-runtime-host`
- Depends on: `E1`
- Runtime paths:
  - `packages/coordination-inngest/src/adapter.ts`
  - `packages/coordination/src/types.ts`
  - `packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts`
  - `scripts/phase-e/verify-e2-finished-hook-policy.mjs`

### E3 - Structural Evidence Gates
- Owner: `@rawr-verification-gates`
- Depends on: `E2`
- Runtime paths:
  - `scripts/phase-e/_verify-utils.mjs`
  - `scripts/phase-e/verify-e3-evidence-integrity.mjs`
  - `package.json`

### E4 - Decision Closure (D-009/D-010)
- Owner: `@rawr-architecture-duty`
- Depends on: `E1..E3`
- Decision paths:
  - `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
  - `docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
  - `docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
  - `docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
  - `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_DISPOSITION.md`
  - `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_TRIGGER_EVIDENCE.md` (conditional)

### E5 - Independent Review + Fix Closure
- Owner: `@rawr-review-closure`
- Depends on: `E4`

### E5A - Structural Assessment
- Owner: `@rawr-structural-steward`
- Depends on: `E5`

### E6 - Docs + Cleanup
- Owner: `@rawr-docs-maintainer`
- Depends on: `E5A`

### E7 - Phase F Readiness
- Owner: `@rawr-phase-sequencing`
- Depends on: `E6`

## Deferred (Non-Blocking for Phase E)
1. Broad D-016 product UX beyond seam-safe mechanics.
2. Route topology expansion.
3. Rollback playbook tracks.

## Entry Gates
See `PHASE_E_ACCEPTANCE_GATES.md`.
