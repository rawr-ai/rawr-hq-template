# Phase F Implementation Spec

## Purpose
Implement Phase F lifecycle seam hardening, interface policy tightening, structural evidence gates, and conditional D-004 disposition closure while preserving locked route/manifest/runtime invariants.

## Non-Goals
1. No route topology changes.
2. No architecture pivots.
3. No rollback matrix.
4. No reopening of D-009 or D-010.

## Deltas

### F1
1. Harden runtime lifecycle seams for deterministic instance/alias behavior.
2. Keep mount family semantics unchanged and explicit.
3. Add runtime tests for seam safety and route-family invariance.

### F2
1. Tighten TypeScript + TypeBox interface boundaries where runtime and contract drift can diverge.
2. Encode ID/policy constraints structurally in contract schemas.
3. Keep contract deltas additive and explicitly documented.

### F3
1. Add Phase F verifier chain and script wiring in `package.json`.
2. Ensure evidence/disposition gates depend on durable closure artifacts only.
3. Ensure cleanup cannot silently invalidate closure verification.

### F4
1. Evaluate D-004 trigger criteria with explicit scan output:
   - `capabilitySurfaceCount >= 3`
   - `duplicatedBoilerplateClusterCount >= 2`
   - `correctnessSignalCount >= 1`
2. Publish explicit triggered/deferred disposition.
3. Publish trigger evidence artifact only when criteria are met.
4. On triggered path only, update D-004 status in `DECISIONS.md` from `locked` to `closed` with explicit scope and evidence map.
5. On deferred path, keep D-004 `locked` and publish carry-forward watchpoints in runtime disposition.

## Slice Detail

### F1 Implementation Units
- `packages/state/src/repo-state.ts`
- `packages/state/src/types.ts`
- `packages/hq/src/install/state.ts`
- `apps/server/src/rawr.ts`
- `apps/server/src/workflows/context.ts`
- `apps/server/test/rawr.test.ts`
- `apps/server/test/route-boundary-matrix.test.ts`
- `packages/state/test/repo-state.concurrent.test.ts`

### F2 Implementation Units
- `packages/coordination/src/types.ts`
- `packages/coordination/src/ids.ts`
- `packages/coordination/src/orpc/schemas.ts`
- `packages/coordination/src/orpc/contract.ts`
- `packages/state/src/orpc/contract.ts`
- `packages/core/src/orpc/runtime-router.ts`
- `packages/core/test/orpc-contract-drift.test.ts`
- `packages/core/test/workflow-trigger-contract-drift.test.ts`

### F3 Implementation Units
- `scripts/phase-f/_verify-utils.mjs`
- `scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
- `scripts/phase-f/verify-f2-interface-policy-contract.mjs`
- `scripts/phase-f/verify-f3-evidence-integrity.mjs`
- `scripts/phase-f/verify-f4-trigger-scan.mjs`
- `scripts/phase-f/verify-f4-disposition.mjs`
- `package.json`

### F4 Implementation Units
- `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md` (conditional update only if triggered)
- `docs/projects/orpc-ingest-workflows-spec/axes/07-host-composition.md` (if disposition context requires)
- `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_DISPOSITION.md`
- `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_EVIDENCE.md` (conditional)

## Exit Conditions
1. `F1..F4` complete with green quick/full and disposition gates.
2. `F5` review closure approved, including adversarial boundary-check coverage.
3. `F5A` structural disposition approved.
4. `F6` cleanup manifest complete and cleanup-integrity gate green.
5. `F7` readiness, execution report, and final handoff published.
