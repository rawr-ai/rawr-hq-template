# Phase F Execution Packet

## Start Here (Single Entrypoint)
This is the canonical Phase F execution packet.

Execute in this order:
1. `F0 -> F1 -> F2 -> F3 -> F4 (conditional) -> F5 -> F5A -> F6 -> F7`
2. Do not start a slice until dependency slices are green.
3. Forward-only posture: fix failing slices in place; no rollback track.
4. `F4` is conditional but disposition artifacts are mandatory.
5. `F5` independent review/fix closure is mandatory before structural/docs closure.
6. `F5A` structural assessment is mandatory before docs/cleanup.
7. `F6` docs/cleanup is mandatory before readiness.
8. `F7` readiness and handoff are mandatory before phase close.

## Objective
Land Phase F lifecycle and control-plane seam hardening around distribution/instance mechanics while preserving locked route/manifest/runtime invariants, and explicitly close or defer D-004 with trigger-grade evidence.

## Entry State
1. Phase E readiness posture is `ready`: `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E7_PHASE_F_READINESS.md`.
2. Phase E closure artifacts are complete and canonical docs are aligned.
3. Phase F planning packet and steward disposition must be complete before runtime kickoff.

## Locked Constraints (No Re-open in Phase F)
1. Runtime semantics: `rawr.kind + rawr.capability + manifest registration` only.
2. Route-family semantics unchanged:
   - `/rpc` internal/first-party only
   - `/api/orpc/*` published OpenAPI boundary
   - `/api/workflows/<capability>/*` caller-facing workflow boundary
   - `/api/inngest` signed runtime ingress only
3. `rawr.hq.ts` remains composition authority.
4. D-013 hard deletion remains enforced.
5. D-014/D-015/D-016 locks remain in force.
6. D-009 and D-010 remain locked from Phase E and are not reopened in Phase F.

## Slice Plan (Decision Complete)

### F0 - Planning Closure + G1.5 Steward Drift Check
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: Phase E readiness
- Implement:
  1. Finalize Phase F packet docs and machine map.
  2. Run independent steward review and close blocking/high planning findings.
  3. Run explicit steward drift-check readout before opening runtime implementation branch.
- Primary outputs:
  - `PHASE_F_EXECUTION_PACKET.md`
  - `PHASE_F_IMPLEMENTATION_SPEC.md`
  - `PHASE_F_ACCEPTANCE_GATES.md`
  - `PHASE_F_WORKBREAKDOWN.yaml`
  - `PHASE_F_REVIEW_DISPOSITION.md`
  - `PHASE_F_PLANNING_HANDOFF.md`

### F1 - Runtime Lifecycle Seam Hardening
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-distribution-lifecycle`
- Depends on: `F0`
- Implement:
  1. Harden instance/alias lifecycle runtime seams with deterministic state authority behavior.
  2. Preserve route-family and composition authority invariants.
  3. Keep command-surface separation from runtime metadata semantics.
- Primary runtime paths (expected):
  - `packages/state/src/repo-state.ts`
  - `packages/state/src/types.ts`
  - `packages/hq/src/install/state.ts`
  - `apps/server/src/rawr.ts`
  - `apps/server/src/workflows/context.ts`
  - `apps/server/test/rawr.test.ts`
  - `apps/server/test/route-boundary-matrix.test.ts`
  - `packages/state/test/repo-state.concurrent.test.ts`

### F2 - Interface/Policy Hardening
- Owner: `@rawr-runtime-host`
- Backup: `@rawr-architecture-duty`
- Depends on: `F1`
- Implement:
  1. Tighten lifecycle/control-plane contracts where F1 exposed ambiguity.
  2. Keep TypeBox-first contract posture and additive compatibility by default.
  3. Explicitly declare any public interface/type delta.
- Primary runtime paths (expected):
  - `packages/coordination/src/ids.ts`
  - `packages/coordination/src/types.ts`
  - `packages/coordination/src/orpc/schemas.ts`
  - `packages/coordination/src/orpc/contract.ts`
  - `packages/state/src/orpc/contract.ts`
  - `packages/core/src/orpc/runtime-router.ts`
  - `packages/core/test/orpc-contract-drift.test.ts`
  - `packages/core/test/workflow-trigger-contract-drift.test.ts`

### F3 - Structural Evidence + Gate Hardening
- Owner: `@rawr-verification-gates`
- Backup: `@rawr-runtime-host`
- Depends on: `F2`
- Implement:
  1. Add Phase F verifier chain and drift checks.
  2. Ensure disposition/evidence gates are cleanup-safe and do not depend on ephemeral artifacts.
  3. Extend adversarial boundary checks where needed.
- Primary runtime paths (expected):
  - `scripts/phase-f/_verify-utils.mjs`
  - `scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs`
  - `scripts/phase-f/verify-f2-interface-policy-contract.mjs`
  - `scripts/phase-f/verify-f3-evidence-integrity.mjs`
  - `scripts/phase-f/verify-f4-trigger-scan.mjs`
  - `scripts/phase-f/verify-f4-disposition.mjs`
  - `package.json`

### F4 - Conditional Decision Closure (D-004)
- Owner: `@rawr-architecture-duty`
- Backup: `@rawr-runtime-host`
- Depends on: `F1..F3` evidence
- Trigger criteria:
  1. F4 scan output reports `capabilitySurfaceCount >= 3`.
  2. F4 scan output reports `duplicatedBoilerplateClusterCount >= 2` across distinct workflow capability surfaces.
  3. F4 scan output reports `correctnessSignalCount >= 1` where signals are failed anti-drift checks attributable to duplicated boilerplate.
  4. Proposed closure preserves ownership/import-direction/route invariants.
- Triggered path:
  1. Publish `F4_TRIGGER_EVIDENCE.md` and `F4_DISPOSITION.md`.
  2. Update D-004 in `DECISIONS.md` from `locked` to `closed` with explicit helper-abstraction scope and trigger evidence map.
  3. Rerun touched-slice full gates.
- No-trigger path:
  1. Publish `F4_DISPOSITION.md` with explicit defer rationale and hardened watchpoints.
  2. Keep D-004 status `locked` and append carry-forward watchpoints in runtime disposition only.

### F5 - Independent Review + Fix Closure
- Owner: `@rawr-review-closure`
- Backup: `@rawr-verification-gates`
- Depends on: `F3` and `F4` disposition closure
- Implement:
  1. Full independent review from TypeScript + oRPC perspectives.
  2. Severity-ranked findings with file/line anchors.
  3. Fix all blocking/high findings in-run; rerun impacted gates and re-review.
  4. Include adversarial boundary checks (route-family negatives, ingress/caller spoof resistance, and `/rpc/workflows` rejection) in scope.

### F5A - Structural Assessment + Taste Pass
- Owner: `@rawr-structural-steward`
- Backup: `@rawr-review-closure`
- Depends on: `F5`
- Implement:
  1. Improve naming, file boundaries, duplication, and domain clarity.
  2. Keep architecture fixed (no route/authority/runtime-topology shifts).

### F6 - Canonical Docs + Cleanup Closure
- Owner: `@rawr-docs-maintainer`
- Backup: `@rawr-release-duty`
- Depends on: `F5A`
- Implement:
  1. Align canonical docs to as-landed Phase F behavior.
  2. Prune superseded runtime-pass artifacts.
  3. Publish cleanup manifest.
  4. Rerun closure-critical gates after cleanup edits.

### F7 - Post-Land Realignment / Next-Phase Readiness
- Owner: `@rawr-phase-sequencing`
- Backup: `@rawr-architecture-duty`
- Depends on: `F6`
- Implement:
  1. Publish explicit next-phase kickoff posture (`ready`/`not-ready`) with blockers/owners/order.
  2. Publish final Phase F execution report and final handoff.
  3. Include explicit F4 triggered/deferred disposition and watchpoint posture.

## Deferred (Non-Blocking for Phase F)
1. Route-topology expansion beyond locked families.
2. Broad architecture pivots beyond seam-safe hardening.
3. Rollback-track programs.

## First-Failure Signals (Watchlist)
1. F1: instance/alias seam ambiguity or route semantics drift.
2. F2: undeclared public contract/interface change.
3. F3: gate chain accepts ephemeral evidence dependencies.
4. F4: decision closure attempted without trigger-grade evidence.
5. F5/F5A: review or structural pass skipped/compressed.
6. F6: cleanup breaks disposition/exit verification.
7. F7: readiness posture missing explicit blockers/owners/order.

## Entry Gates
See `PHASE_F_ACCEPTANCE_GATES.md`.
